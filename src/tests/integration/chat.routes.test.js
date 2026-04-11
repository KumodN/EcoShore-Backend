const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');

let mockAuthUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
};

jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
  req.user = mockAuthUser;
  next();
});

jest.mock('../../providers/FirebaseChatProvider', () => ({
  createChatGroup: jest.fn().mockResolvedValue(true),
  sendMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    text: 'hello',
    senderId: '507f1f77bcf86cd799439011',
    createdAt: new Date().toISOString(),
    seenBy: ['507f1f77bcf86cd799439011'],
  }),
  getMessages: jest.fn().mockResolvedValue([
    {
      id: 'last-1',
      text: 'Latest chat update',
      senderId: '507f1f77bcf86cd799439011',
      createdAt: new Date().toISOString(),
      seenBy: ['507f1f77bcf86cd799439011'],
    },
  ]),
  deleteMessage: jest.fn().mockResolvedValue(true),
  markMessageSeen: jest.fn().mockResolvedValue(true),
  getUnreadCount: jest.fn().mockResolvedValue(3),
}));

const User = require('../../models/User');
const ChatGroup = require('../../models/ChatGroup');
const firebaseProvider = require('../../providers/FirebaseChatProvider');
const chatRouter = require('../../routes/chat.routes');

const app = setupTestApp(chatRouter, '/api/chat');

describe('Chat API Integration', () => {
  const ownerId = '507f1f77bcf86cd799439011';
  const memberId = '507f1f77bcf86cd799439012';
  const outsiderId = '507f1f77bcf86cd799439013';

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
        _id: new mongoose.Types.ObjectId(ownerId),
        name: 'Admin User',
        email: 'admin@chat.test',
        password: 'password123',
        role: 'admin',
      },
      {
        _id: new mongoose.Types.ObjectId(memberId),
        name: 'Member User',
        email: 'member@chat.test',
        password: 'password123',
        role: 'volunteer',
      },
      {
        _id: new mongoose.Types.ObjectId(outsiderId),
        name: 'Outsider User',
        email: 'outsider@chat.test',
        password: 'password123',
        role: 'volunteer',
      },
    ]);

    mockAuthUser = { id: ownerId, role: 'admin' };
  });

  describe('POST /api/chat/groups', () => {
    it('should create an event group and include creator + member', async () => {
      const response = await request(app)
        .post('/api/chat/groups')
        .send({
          name: 'Beach Cleanup Group',
          type: 'EVENT_GROUP',
          members: [memberId],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Beach Cleanup Group');

      const savedGroup = await ChatGroup.findById(
        response.body.data._id
      ).lean();
      expect(savedGroup.members.map((m) => m.toString())).toEqual(
        expect.arrayContaining([ownerId, memberId])
      );
    });
  });

  describe('GET /api/chat/groups', () => {
    it('should return user groups with metadata from provider', async () => {
      await ChatGroup.create({
        name: 'Community Core',
        type: 'EVENT_GROUP',
        members: [ownerId, memberId],
        admins: [ownerId],
      });

      const response = await request(app).get('/api/chat/groups');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].unreadCount).toBe(3);
      expect(response.body.data[0].lastMessage.text).toBe('Latest chat update');
      expect(firebaseProvider.getMessages).toHaveBeenCalled();
      expect(firebaseProvider.getUnreadCount).toHaveBeenCalled();
    });
  });

  describe('POST /api/chat/groups/:id/messages', () => {
    it('should allow members to send messages', async () => {
      const group = await ChatGroup.create({
        name: 'Event Talk',
        type: 'EVENT_GROUP',
        members: [ownerId, memberId],
        admins: [ownerId],
      });

      mockAuthUser = { id: memberId, role: 'volunteer' };

      const response = await request(app)
        .post(`/api/chat/groups/${group._id}/messages`)
        .send({ text: 'See you all at 7 AM' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(firebaseProvider.sendMessage).toHaveBeenCalledWith(
        group._id.toString(),
        expect.objectContaining({
          senderId: memberId,
          text: 'See you all at 7 AM',
        })
      );
    });

    it('should block non-members from sending messages', async () => {
      const group = await ChatGroup.create({
        name: 'Volunteer Circle',
        type: 'EVENT_GROUP',
        members: [ownerId, memberId],
        admins: [ownerId],
      });

      mockAuthUser = { id: outsiderId, role: 'volunteer' };

      const response = await request(app)
        .post(`/api/chat/groups/${group._id}/messages`)
        .send({ text: 'I should not post here' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not a member');
    });
  });
});
