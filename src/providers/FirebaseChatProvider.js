const IChatProvider = require('../interfaces/IChatProvider');
const logger = require('../config/logger');

/**
 * FirebaseChatProvider (SOLID - Single Responsibility)
 * Handles all Firebase Realtime Database operations for chat
 * Implements IChatProvider interface
 *
 * Requirements:
 * - npm install firebase-admin
 * - Firebase service account key at: config/firebase-service-account.json
 * - FIREBASE_DATABASE_URL in .env
 */

class FirebaseChatProvider extends IChatProvider {
  constructor() {
    super();
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) return;

    try {
      const admin = require('firebase-admin');
      const serviceAccount = require('../config/firebase-service-account.json');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      }

      this.db = admin.database();
      this.initialized = true;
      logger.info('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  /**
   * Register a new chat group in Firebase
   * Initializes the chat node metadata without posting any visible message
   */
  async createChatGroup(chatGroupId, groupData) {
    this.initialize();

    await this.db.ref(`chats/${chatGroupId}/meta`).set({
      name: groupData.name,
      type: groupData.type,
      createdAt: new Date().toISOString(),
    });

    logger.info(`Registered new chat group ${chatGroupId} on Firebase.`);
  }

  /**
   * Send a message to Firebase
   * Structure: /chats/{chatGroupId}/messages/{messageId}
   */
  async sendMessage(chatGroupId, messageData) {
    this.initialize();

    const message = {
      senderId: messageData.senderId,
      text: messageData.text || '',
      mediaUrl: messageData.mediaUrl || null,
      messageType: messageData.messageType || 'TEXT',
      callEventType: messageData.callEventType || null,
      durationSeconds:
        typeof messageData.durationSeconds === 'number'
          ? messageData.durationSeconds
          : null,
      createdAt: new Date().toISOString(),
      seenBy: [messageData.senderId],
    };

    const messageRef = this.db.ref(`chats/${chatGroupId}/messages`).push();
    await messageRef.set(message);

    return {
      id: messageRef.key,
      ...message,
    };
  }

  /**
   * Get messages from Firebase
   */
  async getMessages(chatGroupId, options = {}) {
    this.initialize();

    const { limit = 50, lastMessageId = null } = options;

    let query = this.db
      .ref(`chats/${chatGroupId}/messages`)
      .orderByChild('createdAt')
      .limitToLast(limit);

    const snapshot = await query.once('value');
    const messages = [];

    snapshot.forEach((child) => {
      const value = child.val();

      // Hide legacy system bootstrap messages from clients.
      if (value?.isSystemMessage || value?.senderId === 'SYSTEM') {
        return;
      }

      messages.push({
        id: child.key,
        ...value,
      });
    });

    return messages;
  }

  /**
   * Delete a message from Firebase
   */
  async deleteMessage(chatGroupId, messageId) {
    this.initialize();

    await this.db.ref(`chats/${chatGroupId}/messages/${messageId}`).remove();
    logger.info(`Deleted message ${messageId} from chat ${chatGroupId}`);
  }

  /**
   * Mark message as seen
   */
  async markMessageSeen(chatGroupId, messageId, userId) {
    this.initialize();

    const messageRef = this.db.ref(
      `chats/${chatGroupId}/messages/${messageId}`
    );
    const snapshot = await messageRef.once('value');
    const message = snapshot.val();

    if (message && message.seenBy) {
      if (!message.seenBy.includes(userId)) {
        message.seenBy.push(userId);
        await messageRef.update({ seenBy: message.seenBy });
      }
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(chatGroupId, userId) {
    this.initialize();

    const snapshot = await this.db
      .ref(`chats/${chatGroupId}/messages`)
      .once('value');

    let unreadCount = 0;
    snapshot.forEach((child) => {
      const message = child.val();
      if (!message || message.isSystemMessage || message.senderId === 'SYSTEM') {
        return;
      }
      if (message.seenBy && !message.seenBy.includes(userId)) {
        unreadCount++;
      }
    });

    return unreadCount;
  }
}

module.exports = new FirebaseChatProvider();
