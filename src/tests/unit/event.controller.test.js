const eventController = require('../../controller/event.controller');
const eventService = require('../../service/event.service');

jest.mock('../../service/event.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Event Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should format output and return 201 status', async () => {
      const mockEvent = { _id: 'event1', title: 'Test Event' };
      eventService.createEvent.mockResolvedValue(mockEvent);

      const req = { body: { title: 'Test Event' }, user: { id: 'org123' } };
      const res = mockResponse();

      await eventController.createEvent(req, res, mockNext);

      expect(eventService.createEvent).toHaveBeenCalledWith('org123', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event created successfully',
        data: mockEvent,
      });
    });
  });

  describe('getEvents', () => {
    it('should query events from service and return 200', async () => {
      const mockResult = { events: [{ _id: '1' }], pagination: { total: 1 } };
      eventService.getEvents.mockResolvedValue(mockResult);

      const req = { query: { page: 1, limit: 10, status: 'UPCOMING' } };
      const res = mockResponse();

      await eventController.getEvents(req, res, mockNext);

      expect(eventService.getEvents).toHaveBeenCalledWith(
        { status: 'UPCOMING' },
        1,
        10
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('joinEvent', () => {
    it('should call joinEvent in service and return 200', async () => {
      const mockResult = { title: 'Joined Event' };
      eventService.joinEvent.mockResolvedValue(mockResult);

      const req = { params: { id: 'event123' }, user: { id: 'vol123' } };
      const res = mockResponse();

      await eventController.joinEvent(req, res, mockNext);

      expect(eventService.joinEvent).toHaveBeenCalledWith('event123', 'vol123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Joined event successfully',
        data: mockResult,
      });
    });
  });
});
