const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');

let mockAuthUser = {
  id: '507f1f77bcf86cd799439021',
  role: 'organizer',
};

jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
  req.user = mockAuthUser;
  next();
});

const User = require('../../models/User');
const Meeting = require('../../models/Meeting');
const meetingRouter = require('../../routes/meeting.routes');

const app = setupTestApp(meetingRouter, '/api/meetings');

describe('Meeting API Integration', () => {
  const organizerId = '507f1f77bcf86cd799439021';
  const volunteerId = '507f1f77bcf86cd799439022';
  const outsiderId = '507f1f77bcf86cd799439023';
  const adminId = '507f1f77bcf86cd799439024';

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
        _id: new mongoose.Types.ObjectId(organizerId),
        name: 'Organizer',
        email: 'organizer@meeting.test',
        password: 'password123',
        role: 'organizer',
      },
      {
        _id: new mongoose.Types.ObjectId(volunteerId),
        name: 'Volunteer',
        email: 'volunteer@meeting.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(outsiderId),
        name: 'Outsider',
        email: 'outsider@meeting.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(adminId),
        name: 'Admin',
        email: 'admin@meeting.test',
        password: 'password123',
        role: 'admin',
      },
    ]);

    mockAuthUser = { id: organizerId, role: 'organizer' };
  });

  describe('POST /api/meetings/create', () => {
    it('should create a scheduled meeting with normalized participants', async () => {
      const response = await request(app)
        .post('/api/meetings/create')
        .send({
          title: 'Community Moderators Sync',
          participants: [volunteerId],
          isInstant: false,
          scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Community Moderators Sync');

      const participantIds = response.body.data.participants.map(
        (participant) => participant._id.toString()
      );
      expect(participantIds).toEqual(
        expect.arrayContaining([organizerId, volunteerId])
      );
    });
  });

  describe('GET /api/meetings/my-meetings', () => {
    it('should return meetings where requester is a participant', async () => {
      await Meeting.create({
        title: 'Moderation Follow-up',
        createdBy: organizerId,
        participants: [organizerId, volunteerId],
        isInstant: false,
        scheduledAt: new Date(Date.now() + 20 * 60 * 1000),
        status: 'scheduled',
      });

      mockAuthUser = { id: volunteerId, role: 'volunteer' };

      const response = await request(app).get('/api/meetings/my-meetings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Moderation Follow-up');
    });
  });

  describe('POST /api/meetings/start/:id', () => {
    it('should block users who are not creator/admin', async () => {
      const meeting = await Meeting.create({
        title: 'Organizer-only Session',
        createdBy: organizerId,
        participants: [organizerId, volunteerId],
        isInstant: false,
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'scheduled',
      });

      mockAuthUser = { id: outsiderId, role: 'volunteer' };

      const response = await request(app).post(
        `/api/meetings/start/${meeting._id}`
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('creator or an admin');
    });
  });

  describe('POST /api/meetings/end/:id', () => {
    it('should allow the creator to end a meeting', async () => {
      const meeting = await Meeting.create({
        title: 'Live Check-in',
        createdBy: organizerId,
        participants: [organizerId, volunteerId],
        isInstant: true,
        scheduledAt: new Date(),
        status: 'ongoing',
      });

      mockAuthUser = { id: organizerId, role: 'organizer' };

      const response = await request(app).post(
        `/api/meetings/end/${meeting._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ended');
    });
  });
});
