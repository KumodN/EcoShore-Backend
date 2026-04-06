const express = require('express');
const meetingController = require('../controller/meeting.controller');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const meetingValidation = require('../validation/meeting.validation');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post(
  '/create',
  requireAuth,
  authorizeRoles(ROLES.ADMIN, ROLES.ORGANIZER),
  validate(meetingValidation.createMeeting),
  meetingController.createMeeting
);

router.get('/my-meetings', requireAuth, meetingController.getMyMeetings);

router.post(
  '/start/:id',
  requireAuth,
  validate(meetingValidation.meetingIdParam),
  meetingController.startMeeting
);

router.post(
  '/end/:id',
  requireAuth,
  validate(meetingValidation.meetingIdParam),
  meetingController.endMeeting
);

module.exports = router;
