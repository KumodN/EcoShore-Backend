const eventService = require('../../service/event.service');
const Event = require('../../models/Event');
const User = require('../../models/User');
const chatService = require('../../service/chat.service');
const { AppError } = require('../../utils/AppError');
const { ROLES } = require('../../constants/roles');

jest.mock('../../models/Event');
jest.mock('../../models/User');
jest.mock('../../service/chat.service');

describe('Event Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event and chat group successfully', async () => {
      const organizerId = '507f1f77bcf86cd799439011';
      const eventData = { title: 'Cleanup' };

      const mockOrganizer = { _id: organizerId, role: ROLES.ORGANIZER };
      User.findById.mockResolvedValue(mockOrganizer);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      Event.startSession.mockResolvedValue(mockSession);

      const mockEvent = [
        {
          _id: 'event123',
          title: 'Cleanup',
          organizerId,
          save: jest.fn().mockResolvedValue(true),
        },
      ];
      Event.create.mockResolvedValue(mockEvent);

      chatService.createChatGroup.mockResolvedValue({ _id: 'chat123' });

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest
          .fn()
          .mockResolvedValue({ ...mockEvent[0], chatGroupId: 'chat123' }),
      });

      const result = await eventService.createEvent(organizerId, eventData);

      expect(User.findById).toHaveBeenCalledWith(organizerId);
      expect(Event.create).toHaveBeenCalled();
      expect(chatService.createChatGroup).toHaveBeenCalled();
      expect(result.chatGroupId).toBe('chat123');
    });

    it('should throw AppError if user is not organizer or admin', async () => {
      const organizerId = '507f1f77bcf86cd799439011';
      User.findById.mockResolvedValue({
        _id: organizerId,
        role: ROLES.VOLUNTEER,
      });

      await expect(eventService.createEvent(organizerId, {})).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getEvents', () => {
    it('should retrieve list of events with pagination', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ title: 'Event' }]),
      };

      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(1);

      const result = await eventService.getEvents(
        { status: 'UPCOMING' },
        1,
        10
      );

      expect(Event.find).toHaveBeenCalledWith({
        isDeleted: false,
        status: 'UPCOMING',
      });
      expect(result.events).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('joinEvent', () => {
    it('should allow volunteer to join and add them to chat', async () => {
      const eventId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const mockEvent = {
        _id: eventId,
        status: 'UPCOMING',
        volunteers: [],
        chatGroupId: 'chat123',
        organizerId: 'org123',
        save: jest.fn(),
      };
      Event.findOne.mockResolvedValue(mockEvent);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      Event.startSession.mockResolvedValue(mockSession);

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventService.joinEvent(eventId, userId);

      expect(mockEvent.volunteers).toContain(userId);
      expect(mockEvent.save).toHaveBeenCalled();
      expect(chatService.addMember).toHaveBeenCalledWith(
        'chat123',
        userId,
        'org123'
      );
    });
  });
});
