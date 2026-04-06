const meetingService = require('../service/meeting.service');

class MeetingController {
  async createMeeting(req, res, next) {
    try {
      const meeting = await meetingService.createMeeting(req.user, req.body);

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyMeetings(req, res, next) {
    try {
      const meetings = await meetingService.getMyMeetings(req.user.id);

      res.status(200).json({
        success: true,
        data: meetings,
      });
    } catch (error) {
      next(error);
    }
  }

  async startMeeting(req, res, next) {
    try {
      const meeting = await meetingService.startMeeting(
        req.params.id,
        req.user
      );

      res.status(200).json({
        success: true,
        message: 'Meeting started successfully',
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }

  async endMeeting(req, res, next) {
    try {
      const meeting = await meetingService.endMeeting(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: 'Meeting ended successfully',
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MeetingController();
