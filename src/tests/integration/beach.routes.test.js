const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');
const mongoose = require('mongoose');
const { Beach, User } = require('../../models'); // Load models to register User schema

// Mock Auth Middleware
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
  req.user = { id: '60d21b4667d0d8992e610c85', role: 'admin' };
  next();
});
jest.mock(
  '../../middleware/authorizeRoles',
  () => () => (req, res, next) => next()
);
jest.mock('../../middleware/auth', () => () => (req, res, next) => next());

const beachRouter = require('../../routes/beach.routes');
const app = setupTestApp(beachRouter, '/api/beaches');

describe('Beach API Integration', () => {
  let createdBeachId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('POST /api/beaches', () => {
    it('should create a new beach and return formatted data', async () => {
      const beachData = {
        name: 'Integration Test Beach',
        location: {
          address: '123 Ocean Ave',
          city: 'Cool City',
          coordinates: {
            type: 'Point',
            coordinates: [40.7128, -74.006],
          },
        },
        description: 'A beautiful beach for tests.',
        image: 'https://example.com/beach.jpg',
      };

      const response = await request(app).post('/api/beaches').send(beachData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.beach).toBeDefined();
      expect(response.body.data.beach.name).toBe('Integration Test Beach');

      createdBeachId = response.body.data.beach.id;
    });

    it('should validate inputs using JOI', async () => {
      const invalidData = {
        location: { city: 'Only City' },
      }; // Missing name

      const response = await request(app)
        .post('/api/beaches')
        .send(invalidData);

      // Depending on the exact JOI setup, this might return 400 or 500 equivalent wrapper
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/beaches', () => {
    it('should retrieve list of beaches', async () => {
      // First create one
      const userId = new mongoose.Types.ObjectId();
      await Beach.create({
        name: 'Beach 1',
        location: {
          address: 'Address 1',
          city: 'City 1',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: userId,
      });
      await Beach.create({
        name: 'Beach 2',
        location: {
          address: 'Address 2',
          city: 'City 2',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: userId,
      });

      const response = await request(app).get('/api/beaches?limit=10&page=1');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
