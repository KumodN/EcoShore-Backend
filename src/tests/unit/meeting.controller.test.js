const meetingController = require('../../controller/meeting.controller');
const meetingService = require('../../service/meeting.service');

jest.mock('../../service/meeting.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Meeting Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMeeting', () => {
    it('should create a meeting and return 201', async () => {
      const mockMeeting = { _id: 'meeting1', title: 'Community Sync' };
      meetingService.createMeeting.mockResolvedValue(mockMeeting);

      const req = {
        user: { id: '507f1f77bcf86cd799439011', role: 'organizer' },
        body: {
          title: 'Community Sync',
          participants: ['507f1f77bcf86cd799439012'],
          isInstant: false,
          scheduledAt: new Date().toISOString(),
        },
      };
      const res = mockResponse();

      await meetingController.createMeeting(req, res, mockNext);

      expect(meetingService.createMeeting).toHaveBeenCalledWith(
        req.user,
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Meeting created successfully',
        data: mockMeeting,
      });
    });
  });

  describe('getMyMeetings', () => {
    it('should return meetings for the current user', async () => {
      const mockMeetings = [{ _id: 'm1' }, { _id: 'm2' }];
      meetingService.getMyMeetings.mockResolvedValue(mockMeetings);

      const req = { user: { id: '507f1f77bcf86cd799439011' } };
      const res = mockResponse();

      await meetingController.getMyMeetings(req, res, mockNext);

      expect(meetingService.getMyMeetings).toHaveBeenCalledWith(req.user.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMeetings,
      });
    });
  });

  describe('endMeeting', () => {
    it('should pass service errors to next', async () => {
      const err = new Error('Meeting not found');
      meetingService.endMeeting.mockRejectedValue(err);

      const req = {
        params: { id: '507f1f77bcf86cd799439020' },
        user: { id: '507f1f77bcf86cd799439011', role: 'organizer' },
      };
      const res = mockResponse();

      await meetingController.endMeeting(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
