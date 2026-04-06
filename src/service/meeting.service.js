const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { ROLES } = require('../constants/roles');

class MeetingService {
  _assertObjectId(value, fieldName) {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
  }

  _normalizeParticipantIds(participants, creatorId) {
    const uniqueParticipantIds = new Set();

    (participants || []).forEach((participantId) => {
      uniqueParticipantIds.add(String(participantId));
    });

    uniqueParticipantIds.add(String(creatorId));

    return Array.from(uniqueParticipantIds);
  }

  async _ensureUsersExist(userIds) {
    const foundUsers = await User.find({
      _id: { $in: userIds },
      isDeleted: false,
    })
      .select('_id')
      .lean();

    if (foundUsers.length !== userIds.length) {
      throw new AppError('One or more participants are invalid users', 400);
    }
  }

  _isAdmin(user) {
    return user?.role === ROLES.ADMIN;
  }

  _isCreator(meeting, userId) {
    return String(meeting.createdBy) === String(userId);
  }

  async getMeetingById(meetingId) {
    this._assertObjectId(meetingId, 'meeting id');

    const meeting = await Meeting.findById(meetingId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role')
      .lean();

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    return meeting;
  }

  async createMeeting(requestUser, meetingPayload) {
    if (
      requestUser.role !== ROLES.ADMIN &&
      requestUser.role !== ROLES.ORGANIZER
    ) {
      throw new AppError('Only organizers and admins can create meetings', 403);
    }

    const creatorId = requestUser.id;
    this._assertObjectId(creatorId, 'creator id');

    const participantIds = this._normalizeParticipantIds(
      meetingPayload.participants,
      creatorId
    );

    participantIds.forEach((participantId) => {
      this._assertObjectId(participantId, 'participant id');
    });

    if (participantIds.length > 5) {
      throw new AppError(
        'Meeting cannot have more than 5 participants including creator',
        400
      );
    }

    await this._ensureUsersExist(participantIds);

    const isInstant = Boolean(meetingPayload.isInstant);

    const meeting = await Meeting.create({
      title: meetingPayload.title,
      createdBy: creatorId,
      participants: participantIds,
      scheduledAt: isInstant
        ? new Date()
        : meetingPayload.scheduledAt
          ? new Date(meetingPayload.scheduledAt)
          : null,
      isInstant,
      status: isInstant ? 'ongoing' : 'scheduled',
    });

    return this.getMeetingById(meeting._id);
  }

  async getMyMeetings(userId) {
    this._assertObjectId(userId, 'user id');

    return Meeting.find({ participants: userId })
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role')
      .sort({ scheduledAt: 1, createdAt: -1 })
      .lean();
  }

  async startMeeting(meetingId, requestUser) {
    this._assertObjectId(meetingId, 'meeting id');

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    const canManage =
      this._isCreator(meeting, requestUser.id) || this._isAdmin(requestUser);

    if (!canManage) {
      throw new AppError(
        'Only the creator or an admin can start meetings',
        403
      );
    }

    if (meeting.status === 'ended') {
      throw new AppError('Ended meetings cannot be started again', 400);
    }

    meeting.status = 'ongoing';
    await meeting.save();

    return this.getMeetingById(meetingId);
  }

  async endMeeting(meetingId, requestUser) {
    this._assertObjectId(meetingId, 'meeting id');

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    const canManage =
      this._isCreator(meeting, requestUser.id) || this._isAdmin(requestUser);

    if (!canManage) {
      throw new AppError('Only the creator or an admin can end meetings', 403);
    }

    meeting.status = 'ended';
    await meeting.save();

    return this.getMeetingById(meetingId);
  }

  async ensureJoinAccess(meetingId, userId) {
    this._assertObjectId(meetingId, 'meeting id');
    this._assertObjectId(userId, 'user id');

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    const isParticipant = meeting.participants.some(
      (participantId) => String(participantId) === String(userId)
    );

    if (!isParticipant) {
      throw new AppError(
        'Only meeting participants can join this meeting',
        403
      );
    }

    if (meeting.status === 'ended') {
      throw new AppError('This meeting has already ended', 400);
    }

    if (meeting.status === 'scheduled') {
      const now = new Date();
      const canStartBySchedule =
        !meeting.scheduledAt || now.getTime() >= meeting.scheduledAt.getTime();

      if (!canStartBySchedule) {
        throw new AppError('This meeting is scheduled for a later time', 400);
      }

      meeting.status = 'ongoing';
      await meeting.save();
    }

    return meeting;
  }
}

module.exports = new MeetingService();
