jest.mock('../../models/ChatGroup');
jest.mock('../../models/User');
jest.mock('../../providers/FirebaseChatProvider', () => ({
  createChatGroup: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  deleteMessage: jest.fn(),
  markMessageSeen: jest.fn(),
  getUnreadCount: jest.fn(),
}));

const chatService = require('../../service/chat.service');
const ChatGroup = require('../../models/ChatGroup');
const User = require('../../models/User');
const chatProvider = require('../../providers/FirebaseChatProvider');
const { AppError } = require('../../utils/AppError');
const { ROLES } = require('../../constants/roles');

const createPopulateLeanQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('Chat Service Unit Tests', () => {
  const creatorId = '507f1f77bcf86cd799439011';
  const memberId = '507f1f77bcf86cd799439012';
  const outsiderId = '507f1f77bcf86cd799439013';
  const groupId = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatGroup', () => {
    it('should create an event group and return decorated group data', async () => {
      ChatGroup.create.mockResolvedValue({
        _id: groupId,
        name: 'Cleanup Team',
        type: 'EVENT_GROUP',
      });

      ChatGroup.findById.mockReturnValue(
        createPopulateLeanQuery({
          _id: groupId,
          name: 'Cleanup Team',
          type: 'EVENT_GROUP',
          members: [
            { _id: creatorId, name: 'Owner' },
            { _id: memberId, name: 'Member' },
          ],
          admins: [{ _id: creatorId, name: 'Owner' }],
          isActive: true,
        })
      );

      chatProvider.createChatGroup.mockResolvedValue(true);

      const result = await chatService.createChatGroup(
        {
          name: 'Cleanup Team',
          type: 'EVENT_GROUP',
          members: [memberId],
        },
        creatorId
      );

      expect(ChatGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cleanup Team',
          type: 'EVENT_GROUP',
          members: expect.arrayContaining([creatorId, memberId]),
          admins: [creatorId],
        })
      );
      expect(chatProvider.createChatGroup).toHaveBeenCalledWith(groupId, {
        name: 'Cleanup Team',
        type: 'EVENT_GROUP',
      });
      expect(result.displayName).toBe('Cleanup Team');
    });
  });

  describe('addMember', () => {
    it('should reject when requester role cannot manage members', async () => {
      await expect(
        chatService.addMember(groupId, memberId, creatorId, ROLES.VOLUNTEER)
      ).rejects.toThrow(AppError);
    });
  });

  describe('sendMessage', () => {
    it('should send a message for a group member', async () => {
      const save = jest.fn().mockResolvedValue(true);

      ChatGroup.findById.mockResolvedValue({
        _id: groupId,
        members: [creatorId, memberId],
        save,
      });

      chatProvider.sendMessage.mockResolvedValue({
        id: 'msg-1',
        text: 'Hello volunteers',
      });

      const result = await chatService.sendMessage(groupId, creatorId, {
        text: 'Hello volunteers',
      });

      expect(chatProvider.sendMessage).toHaveBeenCalledWith(groupId, {
        senderId: creatorId,
        text: 'Hello volunteers',
        mediaUrl: undefined,
      });
      expect(save).toHaveBeenCalled();
      expect(result.id).toBe('msg-1');
    });
  });

  describe('getGroupDisplayNameForUser', () => {
    it('should compute recipient-based display name for direct messages', () => {
      const displayName = chatService.getGroupDisplayNameForUser(
        {
          type: 'DIRECT_MESSAGE',
          name: 'Direct Message',
          members: [
            { _id: creatorId, name: 'Owner' },
            { _id: memberId, name: 'Maya' },
          ],
        },
        creatorId
      );

      expect(displayName).toBe('Maya');
    });
  });

  describe('removeMember', () => {
    it('should block unauthorized member removals', async () => {
      ChatGroup.findById.mockResolvedValue({
        _id: groupId,
        admins: [creatorId],
        members: [creatorId, memberId, outsiderId],
        save: jest.fn(),
      });

      await expect(
        chatService.removeMember(groupId, creatorId, outsiderId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getUserChatGroups', () => {
    it('should enrich groups with last message and unread count', async () => {
      const sort = jest.fn().mockReturnThis();
      const populate = jest.fn().mockReturnThis();
      const lean = jest.fn().mockResolvedValue([
        {
          _id: groupId,
          name: 'Team A',
          type: 'EVENT_GROUP',
          members: [{ _id: creatorId }, { _id: memberId }],
          admins: [{ _id: creatorId }],
        },
      ]);

      ChatGroup.find.mockReturnValue({
        populate,
        sort,
        lean,
      });

      chatProvider.getMessages.mockResolvedValue([
        {
          id: 'm1',
          text: 'Latest',
          senderId: creatorId,
          createdAt: new Date().toISOString(),
        },
      ]);
      chatProvider.getUnreadCount.mockResolvedValue(2);

      const result = await chatService.getUserChatGroups(creatorId);

      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBe(2);
      expect(result[0].lastMessage.text).toBe('Latest');
    });
  });
});
