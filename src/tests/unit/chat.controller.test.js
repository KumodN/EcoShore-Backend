const chatController = require('../../controller/chat.controller');
const chatService = require('../../service/chat.service');

jest.mock('../../service/chat.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Chat Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatGroup', () => {
    it('should create a chat group and return 201', async () => {
      const mockGroup = { _id: 'group1', name: 'Beach Volunteers' };
      chatService.createChatGroup.mockResolvedValue(mockGroup);

      const req = {
        body: { name: 'Beach Volunteers', type: 'EVENT_GROUP' },
        user: { id: '507f1f77bcf86cd799439011' },
      };
      const res = mockResponse();

      await chatController.createChatGroup(req, res, mockNext);

      expect(chatService.createChatGroup).toHaveBeenCalledWith(
        req.body,
        req.user.id
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Chat group created successfully',
        data: mockGroup,
      });
    });
  });

  describe('getMessages', () => {
    it('should parse query options and return messages', async () => {
      const mockMessages = [{ id: 'm1', text: 'Hello team' }];
      chatService.getMessages.mockResolvedValue(mockMessages);

      const req = {
        params: { id: '507f1f77bcf86cd799439012' },
        user: { id: '507f1f77bcf86cd799439011' },
        query: { limit: '25', lastMessageId: 'm10' },
      };
      const res = mockResponse();

      await chatController.getMessages(req, res, mockNext);

      expect(chatService.getMessages).toHaveBeenCalledWith(
        req.params.id,
        req.user.id,
        {
          limit: 25,
          lastMessageId: 'm10',
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
      });
    });
  });

  describe('deleteMessage', () => {
    it('should return successful delete payload', async () => {
      chatService.deleteMessage.mockResolvedValue({
        message: 'Message deleted successfully',
      });

      const req = {
        params: {
          id: '507f1f77bcf86cd799439012',
          messageId: 'message-1',
        },
        user: { id: '507f1f77bcf86cd799439011' },
      };
      const res = mockResponse();

      await chatController.deleteMessage(req, res, mockNext);

      expect(chatService.deleteMessage).toHaveBeenCalledWith(
        req.params.id,
        req.params.messageId,
        req.user.id
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message deleted successfully',
      });
    });

    it('should pass service errors to next', async () => {
      const err = new Error('Delete failed');
      chatService.deleteMessage.mockRejectedValue(err);

      const req = {
        params: { id: '507f1f77bcf86cd799439012', messageId: 'm1' },
        user: { id: '507f1f77bcf86cd799439011' },
      };
      const res = mockResponse();

      await chatController.deleteMessage(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
