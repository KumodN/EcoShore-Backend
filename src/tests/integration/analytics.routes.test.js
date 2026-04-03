const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');
const { Beach, WasteRecord } = require('../../models');
const mongoose = require('mongoose');

// Mock Auth Middleware
jest.mock('../../middleware/auth', () => {
  return () => (req, res, next) => {
    req.user = { id: 'admin123', role: 'admin' };
    next();
  };
});

const analyticsRouter = require('../../routes/analytics.routes');
const app = setupTestApp(analyticsRouter, '/api/analytics');

describe('Analytics API Integration', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should retrieve dashboard data', async () => {
      // Seed Data
      const userId = new mongoose.Types.ObjectId();
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          type: 'Point',
          coordinates: [0, 0],
          city: 'Test City',
          address: 'Test Address',
        },
        createdBy: userId,
      });
      await WasteRecord.create({
        beachId: beach._id,
        recordedBy: userId,
        weight: 100,
        plasticType: 'PET',
        collectionDate: new Date(),
        isVerified: true,
      });

      const response = await request(app).get('/api/analytics/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
      expect(response.body.data.dashboard.summary.totalBeaches).toBe(1);
    });
  });

  describe('GET /api/analytics/severity-ranking', () => {
    it('should retrieve severity ranking list', async () => {
      await Beach.create({
        name: 'Polluted Beach',
        location: {
          type: 'Point',
          coordinates: [0, 0],
          city: 'Test City',
          address: 'Test Address',
        },
        createdBy: new mongoose.Types.ObjectId(),
        analytics: {
          severityScore: 95,
          severityLevel: 'CRITICAL',
          totalWasteCollected: 1000,
        },
      });

      const response = await request(app).get(
        '/api/analytics/severity-ranking?limit=5'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.ranking).toBeInstanceOf(Array);
      expect(response.body.data.ranking.length).toBe(1);
      expect(response.body.data.ranking[0].name).toBe('Polluted Beach');
    });
  });
});
