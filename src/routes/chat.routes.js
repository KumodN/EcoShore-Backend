const express = require('express');
const chatController = require('../controller/chat.controller');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const {
  createChatGroupSchema,
  sendMessageSchema,
  addMemberSchema,
  promoteMemberSchema,
} = require('../validation/chat.validation');
const { ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * @route   POST /chat/groups
 * @desc    Create a chat group
 * @access  Private (All users for DIRECT_MESSAGE, ORGANIZER/ADMIN for others)
 */
router.post(
  '/groups',
  requireAuth,
  validate(createChatGroupSchema),
  async (req, res, next) => {
    // Allow all users to create DIRECT_MESSAGE groups, but restrict other types to ORGANIZER/ADMIN
    if (req.body.type !== 'DIRECT_MESSAGE') {
      return authorizeRoles(ROLES.ORGANIZER, ROLES.ADMIN)(req, res, () => {
        chatController.createChatGroup(req, res, next);
      });
    }
    chatController.createChatGroup(req, res, next);
  }
);

/**
 * @route   GET /chat/groups
 * @desc    Get user's chat groups
 * @access  Private
 */
router.get('/groups', requireAuth, chatController.getUserChatGroups);

/**
 * @route   GET /chat/groups/:id
 * @desc    Get chat group by ID
 * @access  Private
 */
router.get('/groups/:id', requireAuth, chatController.getChatGroup);

/**
 * @route   POST /chat/groups/:id/members
 * @desc    Add member to chat group
 * @access  Private (Organizer/Admin)
 */
router.post(
  '/groups/:id/members',
  requireAuth,
  authorizeRoles(ROLES.ORGANIZER, ROLES.ADMIN),
  validate(addMemberSchema),
  chatController.addMember
);

/**
 * @route   DELETE /chat/groups/:id/members/:userId
 * @desc    Remove member from chat group
 * @access  Private (Group Admin or Self)
 */
router.delete(
  '/groups/:id/members/:userId',
  requireAuth,
  chatController.removeMember
);

/**
 * @route   PATCH /chat/groups/:id/admins
 * @desc    Promote member to admin
 * @access  Private (Group Admin)
 */
router.patch(
  '/groups/:id/admins',
  requireAuth,
  validate(promoteMemberSchema),
  chatController.promoteToAdmin
);

/**
 * @route   POST /chat/groups/:id/messages
 * @desc    Send message to chat group
 * @access  Private (Group Member)
 */
router.post(
  '/groups/:id/messages',
  requireAuth,
  validate(sendMessageSchema),
  chatController.sendMessage
);

/**
 * @route   GET /chat/groups/:id/messages
 * @desc    Get messages from chat group
 * @access  Private (Group Member)
 */
router.get('/groups/:id/messages', requireAuth, chatController.getMessages);

/**
 * @route   DELETE /chat/groups/:id/messages/:messageId
 * @desc    Delete message
 * @access  Private (Group Admin)
 */
router.delete(
  '/groups/:id/messages/:messageId',
  requireAuth,
  chatController.deleteMessage
);

/**
 * @route   PATCH /chat/groups/:id/messages/:messageId/seen
 * @desc    Mark message as seen
 * @access  Private (Group Member)
 */
router.patch(
  '/groups/:id/messages/:messageId/seen',
  requireAuth,
  chatController.markMessageSeen
);

module.exports = router;
