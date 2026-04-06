const ChatGroup = require('../models/ChatGroup');
const User = require('../models/User');
const firebaseChatProvider = require('../providers/FirebaseChatProvider');
const { AppError } = require('../utils/AppError');
const { validateObjectId } = require('../utils/validators');
const { ROLES } = require('../constants/roles');

/**
 * ChatService (SOLID - Single Responsibility)
 * Handles business logic for chat groups
 * Depends on IChatProvider abstraction (Dependency Inversion)
 */
class ChatService {
  constructor(chatProvider) {
    this.chatProvider = chatProvider;
  }

  getDirectRecipientForUser(group, requesterId) {
    if (!group || group.type !== 'DIRECT_MESSAGE') {
      return null;
    }

    const requesterIdString = requesterId?.toString();
    if (!requesterIdString) {
      return null;
    }

    const members = Array.isArray(group.members) ? group.members : [];

    return (
      members.find((member) => {
        const memberId = member?._id?.toString?.() || member?.toString?.();
        return memberId && memberId !== requesterIdString;
      }) || null
    );
  }

  /**
   * Compute a requester-specific display name for direct messages.
   */
  getGroupDisplayNameForUser(group, requesterId) {
    if (!group || group.type !== 'DIRECT_MESSAGE') {
      return group?.name;
    }

    const requesterIdString = requesterId?.toString();
    if (!requesterIdString) {
      return group.name;
    }

    const members = Array.isArray(group.members) ? group.members : [];

    const otherMember = members.find((member) => {
      const memberId = member?._id?.toString?.() || member?.toString?.();
      return memberId && memberId !== requesterIdString;
    });

    if (otherMember && typeof otherMember === 'object') {
      return otherMember.name || otherMember.email || group.name;
    }

    return group.name;
  }

  decorateGroupForUser(group, requesterId) {
    if (!group) {
      return group;
    }

    const recipient = this.getDirectRecipientForUser(group, requesterId);

    const recipientUserId =
      recipient && typeof recipient === 'object'
        ? recipient?._id?.toString?.() || null
        : null;
    const recipientIsOnline =
      recipient && typeof recipient === 'object'
        ? Boolean(recipient?.isOnline)
        : false;
    const recipientLastSeen =
      recipient && typeof recipient === 'object'
        ? recipient?.lastSeen || null
        : null;

    return {
      ...group,
      displayName: this.getGroupDisplayNameForUser(group, requesterId),
      recipientUserId,
      recipientIsOnline,
      recipientLastSeen,
      isOnline:
        group.type === 'DIRECT_MESSAGE'
          ? recipientIsOnline
          : Boolean(group?.isOnline),
    };
  }

  /**
   * Create a chat group
   */
  async createChatGroup(data, creatorId) {
    const { name, description, type, eventId, members = [] } = data;

    // Validate eventId if provided
    if (eventId) {
      validateObjectId(eventId, 'Event ID');
    }

    // Include creator and any specified members, making sure there are no duplicates
    const initialMembers = [
      ...new Set([creatorId, ...members].map((id) => id.toString())),
    ];

    if (type === 'DIRECT_MESSAGE') {
      if (initialMembers.length !== 2) {
        throw new AppError(
          'Direct messages require exactly one recipient',
          400
        );
      }

      const existingDirectGroup = await ChatGroup.findOne({
        type: 'DIRECT_MESSAGE',
        isActive: true,
        members: { $all: initialMembers, $size: 2 },
      });

      if (existingDirectGroup) {
        return this.getChatGroupById(
          existingDirectGroup._id.toString(),
          creatorId
        );
      }
    }

    const chatGroup = await ChatGroup.create({
      name: type === 'DIRECT_MESSAGE' ? name?.trim() || 'Direct Message' : name,
      description,
      type,
      eventId,
      members: initialMembers,
      admins: [creatorId],
    });

    // Register empty group into Firebase
    await this.chatProvider.createChatGroup(chatGroup._id.toString(), {
      name: chatGroup.name,
      type: chatGroup.type,
    });

    return this.getChatGroupById(chatGroup._id.toString(), creatorId);
  }

  /**
   * Get chat group by ID
   */
  async getChatGroupById(groupId, requesterId = null) {
    validateObjectId(groupId, 'Chat Group ID');

    if (requesterId) {
      validateObjectId(requesterId, 'User ID');
    }

    const group = await ChatGroup.findById(groupId)
      .populate('members', 'name email isOnline lastSeen')
      .populate('admins', 'name email')
      .lean();

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (requesterId) {
      const requesterIdString = requesterId.toString();
      const isMember = group.members.some((member) => {
        const memberId = member?._id?.toString?.() || member?.toString?.();
        return memberId === requesterIdString;
      });

      if (!isMember) {
        throw new AppError('You are not a member of this group', 403);
      }

      return this.decorateGroupForUser(group, requesterId);
    }

    return group;
  }

  /**
   * Get user's chat groups
   */
  async getUserChatGroups(userId) {
    validateObjectId(userId, 'User ID');

    const groups = await ChatGroup.find({
      members: userId,
      isActive: true,
    })
      .populate('members', 'name email isOnline lastSeen')
      .populate('admins', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const userIdString = userId.toString();

    const groupsWithMetadata = await Promise.all(
      groups.map(async (group) => {
        const groupId = group._id.toString();

        let lastMessage = null;
        let unreadCount = 0;

        try {
          const messages = await this.chatProvider.getMessages(groupId, {
            limit: 1,
          });

          const latest = Array.isArray(messages)
            ? messages[messages.length - 1]
            : null;

          if (latest) {
            lastMessage = {
              id: latest.id || latest._id,
              text: latest.text || '',
              createdAt: latest.createdAt,
              senderId: latest.senderId,
            };
          }
        } catch {
          lastMessage = null;
        }

        try {
          unreadCount = await this.chatProvider.getUnreadCount(
            groupId,
            userIdString
          );
        } catch {
          unreadCount = 0;
        }

        return this.decorateGroupForUser(
          {
            ...group,
            lastMessage,
            unreadCount,
          },
          userId
        );
      })
    );

    return groupsWithMetadata;
  }

  /**
   * Ensure a user can perform a direct 1:1 call in a direct-message group.
   */
  async ensureDirectCallAccess(chatGroupId, requesterId, targetUserId) {
    validateObjectId(chatGroupId, 'Chat Group ID');
    validateObjectId(requesterId, 'Requester ID');
    validateObjectId(targetUserId, 'Target User ID');

    const group = await ChatGroup.findById(chatGroupId)
      .select('type members isActive')
      .lean();

    if (!group || group.isActive === false) {
      throw new AppError('Chat group not found', 404);
    }

    if (group.type !== 'DIRECT_MESSAGE') {
      throw new AppError('Calling is only supported for direct chats', 400);
    }

    const memberIds = (group.members || []).map((memberId) =>
      memberId.toString()
    );

    if (!memberIds.includes(requesterId.toString())) {
      throw new AppError('You are not a member of this group', 403);
    }

    if (!memberIds.includes(targetUserId.toString())) {
      throw new AppError(
        'Target user is not a member of this direct chat',
        403
      );
    }

    return group;
  }

  /**
   * Add member to chat group
   */
  async addMember(groupId, userId, requesterId, requesterRole) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    const canManageMembers = [ROLES.ADMIN, ROLES.ORGANIZER].includes(
      requesterRole
    );

    if (!canManageMembers) {
      throw new AppError('Only admins and organizers can add members', 403);
    }

    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (group.type === 'DIRECT_MESSAGE') {
      throw new AppError('Cannot add members to direct messages', 400);
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    if (group.members.some((member) => member.toString() === userId)) {
      throw new AppError('User is already a member', 400);
    }

    group.members.push(userId);
    await group.save();

    return group;
  }

  /**
   * Remove member from chat group
   */
  async removeMember(groupId, userId, requesterId) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    // Check if requester is admin or removing themselves
    const isAdmin = group.admins.some(
      (admin) => admin.toString() === requesterId
    );
    const isSelf = userId === requesterId;

    if (!isAdmin && !isSelf) {
      throw new AppError('Unauthorized to remove this member', 403);
    }

    // Remove from members
    group.members = group.members.filter(
      (member) => member.toString() !== userId
    );

    // Also remove from admins if present
    group.admins = group.admins.filter((admin) => admin.toString() !== userId);

    await group.save();

    return group;
  }

  /**
   * Promote member to admin
   */
  async promoteToAdmin(groupId, userId, requesterId) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    // Check if requester is admin
    if (!group.admins.some((admin) => admin.toString() === requesterId)) {
      throw new AppError('Only group admins can promote members', 403);
    }

    // Check if user is a member
    if (!group.members.some((member) => member.toString() === userId)) {
      throw new AppError('User is not a member of this group', 400);
    }

    // Check if already an admin
    if (group.admins.some((admin) => admin.toString() === userId)) {
      throw new AppError('User is already an admin', 400);
    }

    group.admins.push(userId);
    await group.save();

    return group;
  }

  /**
   * Send message (delegates to Firebase provider)
   */
  async sendMessage(groupId, senderId, messageData) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(senderId, 'Sender ID');

    // Verify group exists and user is a member
    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (!group.members.some((member) => member.toString() === senderId)) {
      throw new AppError('You are not a member of this group', 403);
    }

    // Delegate to Firebase provider
    const message = await this.chatProvider.sendMessage(groupId, {
      senderId,
      text: messageData.text,
      mediaUrl: messageData.mediaUrl,
    });

    // Update group's updatedAt
    group.updatedAt = new Date();
    await group.save();

    return message;
  }

  /**
   * Get messages (delegates to Firebase provider)
   */
  async getMessages(groupId, userId, options = {}) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    // Verify user is a member
    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (!group.members.some((member) => member.toString() === userId)) {
      throw new AppError('You are not a member of this group', 403);
    }

    // Delegate to Firebase provider
    const messages = await this.chatProvider.getMessages(groupId, options);

    return messages;
  }

  /**
   * Delete message (delegates to Firebase provider)
   */
  async deleteMessage(groupId, messageId, userId) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    // Verify user is admin
    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (!group.admins.some((admin) => admin.toString() === userId)) {
      throw new AppError('Only group admins can delete messages', 403);
    }

    // Delegate to Firebase provider
    await this.chatProvider.deleteMessage(groupId, messageId);

    return { message: 'Message deleted successfully' };
  }

  /**
   * Mark message as seen (delegates to Firebase provider)
   */
  async markMessageSeen(groupId, messageId, userId) {
    validateObjectId(groupId, 'Chat Group ID');
    validateObjectId(userId, 'User ID');

    // Verify user is a member
    const group = await ChatGroup.findById(groupId);

    if (!group) {
      throw new AppError('Chat group not found', 404);
    }

    if (!group.members.some((member) => member.toString() === userId)) {
      throw new AppError('You are not a member of this group', 403);
    }

    // Delegate to Firebase provider
    await this.chatProvider.markMessageSeen(groupId, messageId, userId);

    return { message: 'Message marked as seen' };
  }

  /**
   * Auto-add user to GLOBAL_VOLUNTEER group (called when user registers)
   */
  async addToGlobalVolunteerGroup(userId) {
    validateObjectId(userId, 'User ID');

    // Find or create global volunteer group
    let globalGroup = await ChatGroup.findOne({
      type: 'GLOBAL_VOLUNTEER',
    });

    if (!globalGroup) {
      globalGroup = await ChatGroup.create({
        name: 'Global Volunteer Chat',
        description: 'Chat group for all volunteers',
        type: 'GLOBAL_VOLUNTEER',
        members: [],
        admins: [],
      });
    }

    // Add user if not already a member
    if (!globalGroup.members.some((member) => member.toString() === userId)) {
      globalGroup.members.push(userId);
      await globalGroup.save();
    }

    return globalGroup;
  }

  /**
   * Auto-add user to ORGANIZER_PRIVATE group (called when organizer approved)
   */
  async addToOrganizerPrivateGroup(userId) {
    validateObjectId(userId, 'User ID');

    // Find or create organizer private group
    let organizerGroup = await ChatGroup.findOne({
      type: 'ORGANIZER_PRIVATE',
    });

    if (!organizerGroup) {
      organizerGroup = await ChatGroup.create({
        name: 'Organizer Private Chat',
        description: 'Private chat group for organizers',
        type: 'ORGANIZER_PRIVATE',
        members: [],
        admins: [],
      });
    }

    // Add user if not already a member
    if (
      !organizerGroup.members.some((member) => member.toString() === userId)
    ) {
      organizerGroup.members.push(userId);
      await organizerGroup.save();
    }

    return organizerGroup;
  }
}

module.exports = new ChatService(firebaseChatProvider);
