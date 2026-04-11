const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');

let mockAuthUser = {
  id: '507f1f77bcf86cd799439031',
  role: 'volunteer',
};
let mockOptionalUser = null;

jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
  req.user = mockAuthUser;
  next();
});

jest.mock('../../middleware/authOptional', () => (req, res, next) => {
  req.user = mockOptionalUser;
  next();
});

jest.mock('../../config/multer', () => ({
  array: () => (req, res, next) => {
    req.files = [];
    next();
  },
}));

const Post = require('../../models/Post');
const User = require('../../models/User');
const postRouter = require('../../routes/postRoutes.routes');

const app = setupTestApp(postRouter, '/api/posts');

describe('Post API Integration', () => {
  const authorId = '507f1f77bcf86cd799439031';
  const commenterId = '507f1f77bcf86cd799439032';
  const adminId = '507f1f77bcf86cd799439033';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearDB();

    await User.create([
      {
        _id: new mongoose.Types.ObjectId(authorId),
        name: 'Post Author',
        email: 'author@post.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(commenterId),
        name: 'Commenter',
        email: 'commenter@post.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(adminId),
        name: 'Admin Reviewer',
        email: 'admin@post.test',
        password: 'password123',
        role: 'admin',
      },
    ]);

    mockAuthUser = { id: authorId, role: 'volunteer' };
    mockOptionalUser = { id: authorId, role: 'volunteer' };
  });

  describe('POST /api/posts/create', () => {
    it('should create post and normalize private visibility to community', async () => {
      const response = await request(app).post('/api/posts/create').send({
        text: 'Community clean-up drive tomorrow!',
        visibility: 'private',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.text).toBe(
        'Community clean-up drive tomorrow!'
      );
      expect(response.body.data.visibility).toBe('community');
    });
  });

  describe('GET /api/posts', () => {
    it('should return only public posts for guest users', async () => {
      await Post.create([
        {
          userId: authorId,
          text: 'Public update',
          visibility: 'public',
          media: [],
        },
        {
          userId: authorId,
          text: 'Community-only update',
          visibility: 'community',
          media: [],
        },
      ]);

      mockOptionalUser = null;

      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posts.length).toBe(1);
      expect(response.body.data.posts[0].visibility).toBe('public');
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    it('should add a comment and return latest comment payload', async () => {
      const post = await Post.create({
        userId: authorId,
        text: 'Need volunteers for this weekend',
        visibility: 'public',
      });

      mockAuthUser = { id: commenterId, role: 'volunteer' };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .send({ text: 'Count me in!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.text).toBe('Count me in!');
      expect(response.body.data.commentsCount).toBe(1);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    it('should reject updates from non-owners', async () => {
      const post = await Post.create({
        userId: authorId,
        text: 'Original post text',
        visibility: 'public',
      });

      mockAuthUser = { id: commenterId, role: 'volunteer' };

      const response = await request(app)
        .patch(`/api/posts/${post._id}`)
        .send({ text: 'I am not the owner' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only the post owner can edit');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should allow admins to delete any post', async () => {
      const post = await Post.create({
        userId: authorId,
        text: 'Moderation target post',
        visibility: 'public',
      });

      mockAuthUser = { id: adminId, role: 'admin' };

      const response = await request(app).delete(`/api/posts/${post._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deletedPost = await Post.findById(post._id).lean();
      expect(deletedPost).toBeNull();
    });
  });
});
