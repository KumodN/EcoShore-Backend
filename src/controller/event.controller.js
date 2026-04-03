const eventService = require('../service/event.service');

class EventController {
  /**
   * Create event
   * POST /events
   */
  async createEvent(req, res, next) {
    try {
      const organizerId = req.user.id;
      const eventData = req.body;

      const event = await eventService.createEvent(organizerId, eventData);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all events
   * GET /events
   */
  async getEvents(req, res, next) {
    try {
      const {
        status,
        organizerId,
        startDate,
        page = 1,
        limit = 10,
      } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (organizerId) filters.organizerId = organizerId;
      if (startDate) filters.startDate = startDate;

      const result = await eventService.getEvents(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by ID
   * GET /events/:id
   */
  async getEventById(req, res, next) {
    try {
      const { id } = req.params;

      const event = await eventService.getEventById(id);

      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update event
   * PATCH /events/:id
   */
  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const event = await eventService.updateEvent(id, userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign agent to event
   * PATCH /events/:id/assign-agent
   */
  async assignAgent(req, res, next) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      const event = await eventService.assignAgent(id, agentId);

      res.status(200).json({
        success: true,
        message: 'Agent assigned to event successfully',
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Join event
   * POST /events/:id/join
   */
  async joinEvent(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await eventService.joinEvent(id, userId);

      res.status(200).json({
        success: true,
        message: 'Joined event successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Leave event
   * POST /events/:id/leave
   */
  async leaveEvent(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await eventService.leaveEvent(id, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event
   * DELETE /events/:id
   */
  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await eventService.deleteEvent(id, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get events by Agent ID
   * GET /events/agent/:agentId
   */
  async getEventsByAgentId(req, res, next) {
    try {
      const { agentId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await eventService.getEventsByAgentId(
        agentId,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventController();
