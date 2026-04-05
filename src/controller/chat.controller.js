const chatService = require('../service/chat.service');

/**
 * ChatController (SOLID - Single Responsibility)
 * Handles HTTP requests and responses only
 * Business logic is delegated to the service layer
 */
class ChatController {
  /**
   * Create chat group
   * POST /chat/groups
   */
  async createChatGroup(req, res, next) {
    try {
      const creatorId = req.user.id;
      const groupData = req.body;

      const group = await chatService.createChatGroup(groupData, creatorId);

      res.status(201).json({
        success: true,
        message: 'Chat group created successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat group by ID
   * GET /chat/groups/:id
   */
  async getChatGroup(req, res, next) {
    try {
      const { id } = req.params;
      const requesterId = req.user.id;

      const group = await chatService.getChatGroupById(id, requesterId);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's chat groups
   * GET /chat/groups
   */
  async getUserChatGroups(req, res, next) {
    try {
      const userId = req.user.id;

      const groups = await chatService.getUserChatGroups(userId);

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to chat group
   * POST /chat/groups/:id/members
   */
  async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const requesterId = req.user.id;
      const requesterRole = req.user.role;

      const group = await chatService.addMember(
        id,
        userId,
        requesterId,
        requesterRole
      );

      res.status(200).json({
        success: true,
        message: 'Member added successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from chat group
   * DELETE /chat/groups/:id/members/:userId
   */
  async removeMember(req, res, next) {
    try {
      const { id, userId } = req.params;
      const requesterId = req.user.id;

      const group = await chatService.removeMember(id, userId, requesterId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Promote member to admin
   * PATCH /chat/groups/:id/admins
   */
  async promoteToAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const requesterId = req.user.id;

      const group = await chatService.promoteToAdmin(id, userId, requesterId);

      res.status(200).json({
        success: true,
        message: 'Member promoted to admin successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send message
   * POST /chat/groups/:id/messages
   */
  async sendMessage(req, res, next) {
    try {
      const { id } = req.params;
      const senderId = req.user.id;
      const messageData = req.body;

      const message = await chatService.sendMessage(id, senderId, messageData);

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages
   * GET /chat/groups/:id/messages
   */
  async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { limit, lastMessageId } = req.query;

      const options = {};
      if (limit) options.limit = parseInt(limit);
      if (lastMessageId) options.lastMessageId = lastMessageId;

      const messages = await chatService.getMessages(id, userId, options);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete message
   * DELETE /chat/groups/:id/messages/:messageId
   */
  async deleteMessage(req, res, next) {
    try {
      const { id, messageId } = req.params;
      const userId = req.user.id;

      const result = await chatService.deleteMessage(id, messageId, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark message as seen
   * PATCH /chat/groups/:id/messages/:messageId/seen
   */
  async markMessageSeen(req, res, next) {
    try {
      const { id, messageId } = req.params;
      const userId = req.user.id;

      const result = await chatService.markMessageSeen(id, messageId, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
