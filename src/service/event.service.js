const Event = require('../models/Event');
const User = require('../models/User');
const chatService = require('./chat.service');
const { AppError } = require('../utils/AppError');
const { validateObjectId } = require('../utils/validators');
const { ROLES } = require('../constants/roles');

/**
 * EventService (SOLID - Single Responsibility)
 * Handles business logic for events
 * Integrates with ChatService for automatic group creation
 */
class EventService {
  /**
   * Create an event
   * Business Rule: Auto-create EVENT_GROUP chat
   */
  async createEvent(organizerId, eventData) {
    validateObjectId(organizerId, 'Organizer ID');

    // Verify organizer exists and has ORGANIZER role
    const organizer = await User.findById(organizerId);
    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    if (organizer.role !== ROLES.ORGANIZER && organizer.role !== ROLES.ADMIN) {
      throw new AppError('Only organizers and admins can create events', 403);
    }

    const session = await Event.startSession();
    session.startTransaction();

    try {
      // Create event
      const event = await Event.create(
        [
          {
            ...eventData,
            organizerId,
            volunteers: [],
          },
        ],
        { session }
      );

      // Create chat group for event
      const chatGroup = await chatService.createChatGroup(
        {
          name: `${eventData.title} - Event Chat`,
          description: `Chat group for ${eventData.title}`,
          type: 'EVENT_GROUP',
          eventId: event[0]._id,
        },
        organizerId
      );

      // Update event with chatGroupId
      event[0].chatGroupId = chatGroup._id;
      await event[0].save({ session });

      await session.commitTransaction();

      return await Event.findById(event[0]._id)
        .populate('organizerId', 'name email')
        .populate('agentId', 'name email')
        .populate('chatGroupId')
        .lean();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all events
   */
  async getEvents(filters = {}, page = 1, limit = 10) {
    const query = { isDeleted: false };

    // Filter by status
    if (filters.status) {
      query.status = filters.status;
    }

    // Filter by organizer
    if (filters.organizerId) {
      validateObjectId(filters.organizerId, 'Organizer ID');
      query.organizerId = filters.organizerId;
    }

    // Filter by date range
    if (filters.startDate) {
      query.startDate = { $gte: new Date(filters.startDate) };
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('beachId')
        .populate('organizerId', 'name email')
        .populate('agentId', 'name email')
        .populate('chatGroupId')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    validateObjectId(eventId, 'Event ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    })
      .populate('organizerId', 'name email')
      .populate('agentId', 'name email')
      .populate('volunteers', 'name email')
      .populate('chatGroupId')
      .lean();

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }

  /**
   * Update event
   */
  async updateEvent(eventId, userId, updateData) {
    validateObjectId(eventId, 'Event ID');
    validateObjectId(userId, 'User ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check authorization
    const user = await User.findById(userId);
    const isOrganizer = event.organizerId.toString() === userId;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isOrganizer && !isAdmin) {
      throw new AppError('Unauthorized to update this event', 403);
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      event[key] = updateData[key];
    });

    await event.save();

    return await Event.findById(eventId)
      .populate('organizerId', 'name email')
      .populate('agentId', 'name email')
      .populate('chatGroupId')
      .lean();
  }

  /**
   * Assign agent to event (Admin only)
   */
  async assignAgent(eventId, agentId) {
    validateObjectId(eventId, 'Event ID');
    validateObjectId(agentId, 'Agent ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Verify agent exists and has agent role
    const agent = await User.findOne({
      _id: agentId,
      role: ROLES.AGENT,
    });

    if (!agent) {
      throw new AppError('Agent not found or is not an agent', 404);
    }

    // Check if agent is assigned to the same beach as the event
    if (agent.assignedBeach.toString() !== event.beachId.toString()) {
      throw new AppError('Agent is not assigned to this event beach', 400);
    }

    // Update event with agent
    event.agentId = agentId;
    await event.save();

    return await Event.findById(eventId)
      .populate('organizerId', 'name email')
      .populate('agentId', 'name email')
      .populate('beachId', 'name')
      .lean();
  }

  /**
   * Join event as volunteer
   * Business Rule: Add volunteer to event chat group
   */
  async joinEvent(eventId, userId) {
    validateObjectId(eventId, 'Event ID');
    validateObjectId(userId, 'User ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check event status
    if (event.status !== 'UPCOMING') {
      throw new AppError('Can only join upcoming events', 400);
    }

    // Check if already joined
    if (event.volunteers.some((v) => v.toString() === userId)) {
      throw new AppError('You have already joined this event', 400);
    }

    // Check max volunteers
    if (event.maxVolunteers && event.volunteers.length >= event.maxVolunteers) {
      throw new AppError('Event is full', 400);
    }

    const session = await Event.startSession();
    session.startTransaction();

    try {
      // Add volunteer to event
      event.volunteers.push(userId);
      await event.save({ session });

      // Add volunteer to event chat group
      if (event.chatGroupId) {
        await chatService.addMember(
          event.chatGroupId.toString(),
          userId,
          event.organizerId.toString()
        );
      }

      await session.commitTransaction();

      return await Event.findById(eventId)
        .populate('organizerId', 'name email')
        .populate('agentId', 'name email')
        .populate('beachId', 'name')
        .populate('volunteers', 'name email')
        .lean();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Leave event as volunteer
   */
  async leaveEvent(eventId, userId) {
    validateObjectId(eventId, 'Event ID');
    validateObjectId(userId, 'User ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check if joined
    if (!event.volunteers.some((v) => v.toString() === userId)) {
      throw new AppError('You have not joined this event', 400);
    }

    const session = await Event.startSession();
    session.startTransaction();

    try {
      // Remove volunteer from event
      event.volunteers = event.volunteers.filter(
        (v) => v.toString() !== userId
      );
      await event.save({ session });

      // Remove volunteer from event chat group
      if (event.chatGroupId) {
        await chatService.removeMember(
          event.chatGroupId.toString(),
          userId,
          userId
        );
      }

      await session.commitTransaction();

      return { message: 'Left event successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete event (soft delete)
   */
  async deleteEvent(eventId, userId) {
    validateObjectId(eventId, 'Event ID');
    validateObjectId(userId, 'User ID');

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check authorization
    const user = await User.findById(userId);
    const isOrganizer = event.organizerId.toString() === userId;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isOrganizer && !isAdmin) {
      throw new AppError('Unauthorized to delete this event', 403);
    }

    event.isDeleted = true;
    await event.save();

    return { message: 'Event deleted successfully' };
  }

  /**
   * Get events by Agent ID
   * Returns all events assigned to a specific agent
   */
  async getEventsByAgentId(agentId, page = 1, limit = 10) {
    validateObjectId(agentId, 'Agent ID');

    const query = {
      agentId,
      isDeleted: false,
    };

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('beachId', 'name')
        .populate('organizerId', 'name email')
        .populate('agentId', 'name email')
        .populate('volunteers', 'name email')
        .populate('chatGroupId')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }
}

module.exports = new EventService();
