const request = require('supertest');

let mockAuthUser = { id: '507f1f77bcf86cd799439011', role: 'volunteer' };
let mockOptionalUser = { id: '507f1f77bcf86cd799439011', role: 'volunteer' };

jest.mock('../../models/Post');
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
    req.files = Array.isArray(req.files) ? req.files : [];
    next();
  },
}));

const Post = require('../../models/Post');
const setupTestApp = require('../setup/testApp');
const postRoutes = require('../../routes/postRoutes.routes');

const app = setupTestApp(postRoutes, '/api/posts');

describe('Post Routes Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = { id: '507f1f77bcf86cd799439011', role: 'volunteer' };
    mockOptionalUser = { id: '507f1f77bcf86cd799439011', role: 'volunteer' };
  });

  describe('POST /api/posts/create', () => {
    it('should reject empty content (no text and no media)', async () => {
      const response = await request(app).post('/api/posts/create').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Please provide text');
      expect(Post.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/posts', () => {
    it('should enforce pagination bounds and shape post responses', async () => {
      const query = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'post1',
            userId: { _id: 'u1', name: 'Ava', role: 'volunteer' },
            text: 'Ocean cleanup update',
            visibility: 'public',
            likes: ['507f1f77bcf86cd799439011'],
            comments: [{ _id: 'c1', text: 'Great', userId: { name: 'Jay' } }],
            createdAt: new Date().toISOString(),
          },
        ]),
      };

      Post.find.mockReturnValue(query);
      Post.countDocuments.mockResolvedValue(1);

      const response = await request(app).get('/api/posts?page=0&limit=999');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(25);
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.posts[0].likesCount).toBe(1);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    it('should reject non-owner updates', async () => {
      const postDoc = {
        _id: 'post1',
        userId: '507f1f77bcf86cd799439099',
        text: 'Original text',
        media: [],
        comments: [],
        likes: [],
        visibility: 'public',
        createdAt: new Date(),
        save: jest.fn(),
      };
      postDoc.select = jest.fn().mockReturnValue(postDoc);
      postDoc.populate = jest.fn().mockReturnValue(postDoc);

      Post.findById.mockReturnValue(postDoc);

      const response = await request(app)
        .patch('/api/posts/post1')
        .send({ text: 'Edited text' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only the post owner can edit');
    });
  });
});
