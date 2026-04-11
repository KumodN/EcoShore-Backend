const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');

jest.mock('../../providers/FirebaseChatProvider', () => ({
  createChatGroup: jest.fn().mockResolvedValue(true),
  sendMessage: jest.fn().mockResolvedValue({
    id: 'msg-perf-1',
    text: 'perf',
    senderId: '507f1f77bcf86cd799439011',
    createdAt: new Date().toISOString(),
    seenBy: ['507f1f77bcf86cd799439011'],
  }),
  getMessages: jest.fn().mockResolvedValue([
    {
      id: 'm-last',
      text: 'Latest',
      senderId: '507f1f77bcf86cd799439011',
      createdAt: new Date().toISOString(),
      seenBy: ['507f1f77bcf86cd799439011'],
    },
  ]),
  deleteMessage: jest.fn().mockResolvedValue(true),
  markMessageSeen: jest.fn().mockResolvedValue(true),
  getUnreadCount: jest.fn().mockResolvedValue(1),
}));

const chatService = require('../../service/chat.service');
const ChatGroup = require('../../models/ChatGroup');
const User = require('../../models/User');

describe('Chat Service Performance', () => {
  let testUserId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearDB();

    testUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: testUserId,
      name: 'Perf User',
      email: 'perf-chat@test.com',
      password: 'password123',
      role: 'volunteer',
    });
  });

  it('should fetch 200 chat groups with metadata under 1200ms', async () => {
    const groups = Array.from({ length: 200 }).map((_, index) => ({
      name: `Perf Group ${index}`,
      type: 'EVENT_GROUP',
      members: [testUserId, new mongoose.Types.ObjectId()],
      admins: [testUserId],
      isActive: true,
    }));

    await ChatGroup.insertMany(groups);

    const startTime = performance.now();
    const result = await chatService.getUserChatGroups(testUserId.toString());
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] chatService.getUserChatGroups on 200 groups: ${latencyMs.toFixed(2)} ms`
    );

    expect(result).toHaveLength(200);
    expect(latencyMs).toBeLessThan(1200);
  }, 15000);

  it('should send a group message under 250ms', async () => {
    const group = await ChatGroup.create({
      name: 'Message Perf Group',
      type: 'EVENT_GROUP',
      members: [testUserId],
      admins: [testUserId],
      isActive: true,
    });

    const startTime = performance.now();
    const message = await chatService.sendMessage(
      group._id.toString(),
      testUserId.toString(),
      { text: 'Performance check message' }
    );
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] chatService.sendMessage latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(message.id).toBeDefined();
    expect(latencyMs).toBeLessThan(250);
  });
});
