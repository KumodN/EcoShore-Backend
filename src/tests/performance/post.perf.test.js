const request = require('supertest');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');

let mockAuthUser = {
  id: '507f1f77bcf86cd799439041',
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

describe('Post Routes Performance', () => {
  const authorId = '507f1f77bcf86cd799439041';
  const commenterId = '507f1f77bcf86cd799439042';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    await User.create([
      {
        _id: new mongoose.Types.ObjectId(authorId),
        name: 'Author Perf',
        email: 'author-perf@post.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(commenterId),
        name: 'Commenter Perf',
        email: 'commenter-perf@post.test',
        password: 'password123',
        role: 'volunteer',
      },
    ]);

    mockAuthUser = { id: authorId, role: 'volunteer' };
    mockOptionalUser = { id: authorId, role: 'volunteer' };
  });

  it('should fetch paginated social feed from 3000 posts under 1500ms', async () => {
    const posts = Array.from({ length: 3000 }).map((_, index) => ({
      userId: authorId,
      text: `Community update ${index}`,
      visibility: 'public',
      media: [],
      likes: [],
      comments: [],
    }));

    await Post.insertMany(posts);

    mockOptionalUser = null;

    const startTime = performance.now();
    const response = await request(app).get('/api/posts?page=2&limit=25');
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] GET /api/posts on 3000 rows: ${latencyMs.toFixed(2)} ms`
    );

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toHaveLength(25);
    expect(latencyMs).toBeLessThan(1500);
  }, 15000);

  it('should add a comment under 250ms', async () => {
    const post = await Post.create({
      userId: authorId,
      text: 'Performance target post',
      visibility: 'public',
    });

    mockAuthUser = { id: commenterId, role: 'volunteer' };

    const startTime = performance.now();
    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .send({ text: 'Fast response comment' });
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] POST /api/posts/:id/comments latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(latencyMs).toBeLessThan(250);
  });
});
