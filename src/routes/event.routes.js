const express = require('express');
const eventController = require('../controller/event.controller');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const eventValidation = require('../validation/event.validation');

const { ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * @route   POST /events
 * @desc    Create an event
 * @access  Private (ORGANIZER, ADMIN)
 */
router.post(
  '/',
  requireAuth,
  authorizeRoles(ROLES.ORGANIZER, ROLES.ADMIN),
  validate(eventValidation.createEvent),
  eventController.createEvent
);

/**
 * @route   GET /events
 * @desc    Get all events
 * @access  Public
 */
router.get('/', eventController.getEvents);

/**
 * @route   GET /events/:id
 * @desc    Get event by ID
 * @access  Public
 */
router.get('/:id', eventController.getEventById);

/**
 * @route   PATCH /events/:id
 * @desc    Update event
 * @access  Private (Organizer or Admin)
 */
router.put(
  '/:id',
  requireAuth,
  authorizeRoles(ROLES.ORGANIZER, ROLES.ADMIN),
  validate(eventValidation.updateEvent),
  eventController.updateEvent
);

/**
 * @route   PATCH /events/:id/assign-agent
 * @desc    Assign agent to event (Admin only)
 * @access  Private (Admin)
 */
router.patch(
  '/:id/assign-agent',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  validate(eventValidation.assignAgent),
  eventController.assignAgent
);

/**
 * @route   POST /events/:id/join
 * @desc    Join event as volunteer
 * @access  Private
 */
router.post(
  '/:id/join',
  requireAuth,
  authorizeRoles(ROLES.VOLUNTEER),
  eventController.joinEvent
);

/**
 * @route   POST /events/:id/leave
 * @desc    Leave event
 * @access  Private
 */
router.post(
  '/:id/leave',
  requireAuth,
  authorizeRoles(ROLES.VOLUNTEER),
  eventController.leaveEvent
);

/**
 * @route   DELETE /events/:id
 * @desc    Delete event
 * @access  Private (Organizer or Admin)
 */
router.delete(
  '/:id',
  requireAuth,
  authorizeRoles(ROLES.ADMIN, ROLES.ORGANIZER),
  eventController.deleteEvent
);

/**
 * @route   GET /events/agent/:agentId
 * @desc    Get all events assigned to a specific agent
 * @access  Private (Admin and Agent)
 */
router.get(
  '/agent/:agentId',
  requireAuth,
  authorizeRoles(ROLES.AGENT, ROLES.ADMIN),
  eventController.getEventsByAgentId
);

module.exports = router;
