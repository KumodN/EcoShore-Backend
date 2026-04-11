jest.mock('../../models/Meeting');
jest.mock('../../models/User');

const meetingService = require('../../service/meeting.service');
const Meeting = require('../../models/Meeting');
const User = require('../../models/User');
const { AppError } = require('../../utils/AppError');
const { ROLES } = require('../../constants/roles');

const createSelectLeanQuery = (value) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

const createPopulateLeanQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('Meeting Service Unit Tests', () => {
  const creatorId = '507f1f77bcf86cd799439011';
  const participantId = '507f1f77bcf86cd799439012';
  const outsiderId = '507f1f77bcf86cd799439013';
  const meetingId = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMeeting', () => {
    it('should create and return a scheduled meeting', async () => {
      User.find.mockReturnValue(
        createSelectLeanQuery([{ _id: creatorId }, { _id: participantId }])
      );

      Meeting.create.mockResolvedValue({ _id: meetingId });
      Meeting.findById.mockReturnValue(
        createPopulateLeanQuery({
          _id: meetingId,
          title: 'Organizer Sync',
          createdBy: { _id: creatorId, name: 'Organizer' },
          participants: [
            { _id: creatorId, name: 'Organizer' },
            { _id: participantId, name: 'Volunteer' },
          ],
          status: 'scheduled',
        })
      );

      const meeting = await meetingService.createMeeting(
        { id: creatorId, role: ROLES.ORGANIZER },
        {
          title: 'Organizer Sync',
          participants: [participantId],
          isInstant: false,
          scheduledAt: new Date().toISOString(),
        }
      );

      expect(Meeting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Organizer Sync',
          createdBy: creatorId,
          participants: expect.arrayContaining([creatorId, participantId]),
          status: 'scheduled',
        })
      );
      expect(meeting._id).toBe(meetingId);
    });

    it('should reject creators without organizer/admin role', async () => {
      await expect(
        meetingService.createMeeting(
          { id: creatorId, role: ROLES.VOLUNTEER },
          {
            title: 'Not allowed',
            participants: [participantId],
            isInstant: true,
          }
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('startMeeting', () => {
    it('should reject non-creator and non-admin users', async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        createdBy: creatorId,
        status: 'scheduled',
        save: jest.fn(),
      });

      await expect(
        meetingService.startMeeting(meetingId, {
          id: outsiderId,
          role: ROLES.VOLUNTEER,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('ensureJoinAccess', () => {
    it('should auto-start a scheduled meeting when schedule time has passed', async () => {
      const save = jest.fn().mockResolvedValue(true);
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        participants: [creatorId, participantId],
        status: 'scheduled',
        scheduledAt: new Date(Date.now() - 60 * 1000),
        save,
      });

      const meeting = await meetingService.ensureJoinAccess(
        meetingId,
        participantId
      );

      expect(save).toHaveBeenCalled();
      expect(meeting.status).toBe('ongoing');
    });
  });

  describe('getMyMeetings', () => {
    it('should return populated meetings for a user', async () => {
      const sort = jest.fn().mockReturnThis();
      const populate = jest.fn().mockReturnThis();
      const lean = jest.fn().mockResolvedValue([{ _id: meetingId }]);

      Meeting.find.mockReturnValue({ populate, sort, lean });

      const result = await meetingService.getMyMeetings(participantId);

      expect(Meeting.find).toHaveBeenCalledWith({
        participants: participantId,
      });
      expect(result).toHaveLength(1);
    });
  });
});
