const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');
const mongoose = require('mongoose');
const { Event, Beach, User } = require('../../models');

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
jest.mock('../../service/chat.service', () => ({
  createChatGroup: jest
    .fn()
    .mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
  addMember: jest.fn().mockResolvedValue(true),
  removeMember: jest.fn().mockResolvedValue(true),
}));

const eventRouter = require('../../routes/event.routes');
const app = setupTestApp(eventRouter, '/api/events');

describe('Event API Integration', () => {
  let beachId;
  let organizerId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    organizerId = new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85');
    await User.create({
      _id: organizerId,
      name: 'Test Organizer',
      email: 'org@test.com',
      password: 'password123',
      role: 'admin',
    });

    const beach = await Beach.create({
      name: 'Integration Test Beach',
      location: {
        address: '123 Ocean Ave',
        city: 'Cool City',
        coordinates: { type: 'Point', coordinates: [40.7128, -74.006] },
      },
      createdBy: organizerId,
    });
    beachId = beach._id;
  });

  describe('POST /api/events', () => {
    it('should create a new event and return formatted data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const eventData = {
        title: 'Integration Test Event',
        description: 'Test event description',
        beachId: beachId.toString(),
        startDate: tomorrow.toISOString(),
        endDate: nextWeek.toISOString(),
        maxVolunteers: 50,
      };

      const response = await request(app).post('/api/events').send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Integration Test Event');
      expect(response.body.data.organizerId._id.toString()).toBe(
        organizerId.toString()
      );
    });
  });

  describe('GET /api/events', () => {
    it('should retrieve list of events', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      await Event.create({
        title: 'Event 1',
        description: 'Desc',
        beachId: beachId,
        organizerId: organizerId,
        startDate: tomorrow,
        endDate: nextWeek,
      });

      const response = await request(app).get('/api/events?limit=10&page=1');

      expect(response.status).toBe(200);
      expect(response.body.data.events.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });
  });
});
