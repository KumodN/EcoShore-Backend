const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const chatService = require('../service/chat.service');
const firebaseChatProvider = require('../providers/FirebaseChatProvider');

const connectedUserSockets = new Map();
const activeCalls = new Map();

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization;
  const rawToken = authToken || headerToken;

  if (!rawToken) {
    return null;
  }

  return rawToken.replace('Bearer ', '');
};

const getOrCreateUserSocketSet = (userId) => {
  if (!connectedUserSockets.has(userId)) {
    connectedUserSockets.set(userId, new Set());
  }

  return connectedUserSockets.get(userId);
};

const isUserOnline = (userId) => {
  const userSockets = connectedUserSockets.get(String(userId));
  return Boolean(userSockets && userSockets.size > 0);
};

const emitToUser = (namespace, userId, eventName, payload) => {
  const userSockets = connectedUserSockets.get(String(userId));

  if (!userSockets || userSockets.size === 0) {
    return;
  }

  userSockets.forEach((socketId) => {
    namespace.to(socketId).emit(eventName, payload);
  });
};

const updatePresence = async (userId, isOnline) => {
  if (isOnline) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          isOnline: true,
        },
      }
    );

    return {
      isOnline: true,
      lastSeen: null,
    };
  }

  const lastSeen = new Date();

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        isOnline: false,
        lastSeen,
      },
    }
  );

  return {
    isOnline: false,
    lastSeen,
  };
};

const broadcastPresenceUpdate = (
  namespace,
  userId,
  isOnline,
  lastSeen = null
) => {
  namespace.emit('presence-updated', {
    userId: String(userId),
    isOnline,
    lastSeen,
  });
};

const resolveCallSession = (callId) => {
  if (!callId) {
    return null;
  }

  return activeCalls.get(String(callId)) || null;
};

const isCallParticipant = (callSession, userId) => {
  const currentUserId = String(userId);
  return (
    callSession &&
    (callSession.fromUserId === currentUserId ||
      callSession.toUserId === currentUserId)
  );
};

const getOtherParticipant = (callSession, userId) => {
  const currentUserId = String(userId);

  if (callSession.fromUserId === currentUserId) {
    return callSession.toUserId;
  }

  return callSession.fromUserId;
};

const formatDuration = (totalSeconds = 0) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const getCallDurationSeconds = (callSession) => {
  const startedAtIso = callSession?.acceptedAt || callSession?.createdAt;

  if (!startedAtIso) {
    return 0;
  }

  const startedAt = new Date(startedAtIso).getTime();
  if (Number.isNaN(startedAt)) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, elapsedSeconds);
};

const buildCallEventText = (eventType, durationSeconds) => {
  if (eventType === 'declined') {
    return 'Missed voice call';
  }

  if (durationSeconds > 0) {
    return `Voice call ended (${formatDuration(durationSeconds)})`;
  }

  return 'Voice call ended';
};

const appendCallEventMessage = async (
  callSession,
  actorUserId,
  eventType = 'ended'
) => {
  if (!callSession?.chatGroupId || !actorUserId) {
    return;
  }

  const durationSeconds = getCallDurationSeconds(callSession);
  const text = buildCallEventText(eventType, durationSeconds);

  await firebaseChatProvider.sendMessage(callSession.chatGroupId, {
    senderId: String(actorUserId),
    text,
    messageType: 'CALL_EVENT',
    callEventType: eventType,
    durationSeconds,
  });
};

const registerChatCallSocket = (io) => {
  const namespace = io.of('/chat-call');

  namespace.use((socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretkey_changeme'
      );

      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  namespace.on('connection', async (socket) => {
    const userId = String(socket.user?.id || '');

    if (!userId) {
      socket.disconnect();
      return;
    }

    const wasOnline = isUserOnline(userId);

    getOrCreateUserSocketSet(userId).add(socket.id);
    socket.data.userId = userId;

    if (!wasOnline) {
      try {
        await updatePresence(userId, true);
      } catch {
        // Ignore DB write failures for non-critical presence updates.
      }

      broadcastPresenceUpdate(namespace, userId, true, null);
    }

    socket.on('call-request', async (payload = {}) => {
      const { toUserId, chatGroupId } = payload;
      const targetUserId = String(toUserId || '');

      if (!targetUserId || !chatGroupId) {
        socket.emit('call-error', {
          message: 'toUserId and chatGroupId are required',
          statusCode: 400,
        });
        return;
      }

      if (targetUserId === userId) {
        socket.emit('call-error', {
          message: 'You cannot call yourself',
          statusCode: 400,
        });
        return;
      }

      try {
        await chatService.ensureDirectCallAccess(
          chatGroupId,
          userId,
          targetUserId
        );
      } catch (error) {
        socket.emit('call-error', {
          message: error.message,
          statusCode: error.statusCode || 400,
        });
        return;
      }

      if (!isUserOnline(targetUserId)) {
        const offlineCallSession = {
          callId: randomUUID(),
          chatGroupId: String(chatGroupId),
          fromUserId: userId,
          toUserId: targetUserId,
          status: 'unavailable',
          createdAt: new Date().toISOString(),
        };

        try {
          await appendCallEventMessage(offlineCallSession, userId, 'declined');
        } catch {
          // Call event logging should never block signaling.
        }

        socket.emit('call-unavailable', {
          toUserId: targetUserId,
          message: 'User is offline right now. A missed call was recorded.',
        });
        return;
      }

      const callId = randomUUID();

      let callerName = socket.user?.email || 'User';
      try {
        const caller = await User.findById(userId).select('name email').lean();
        callerName = caller?.name || caller?.email || callerName;
      } catch {
        // Keep fallback caller name.
      }

      const session = {
        callId,
        chatGroupId: String(chatGroupId),
        fromUserId: userId,
        toUserId: targetUserId,
        status: 'ringing',
        createdAt: new Date().toISOString(),
      };

      activeCalls.set(callId, session);

      emitToUser(namespace, targetUserId, 'incoming-call', {
        ...session,
        fromUserName: callerName,
      });

      emitToUser(namespace, userId, 'outgoing-ringing', {
        ...session,
      });
    });

    socket.on('call-accept', (payload = {}) => {
      const { callId } = payload;
      const session = resolveCallSession(callId);

      if (!session || session.toUserId !== userId) {
        return;
      }

      session.status = 'active';
      session.acceptedAt = new Date().toISOString();
      activeCalls.set(session.callId, session);

      const response = {
        callId: session.callId,
        chatGroupId: session.chatGroupId,
        fromUserId: session.fromUserId,
        toUserId: session.toUserId,
      };

      emitToUser(namespace, session.fromUserId, 'call-accepted', response);
      emitToUser(namespace, session.toUserId, 'call-accepted', response);
    });

    socket.on('call-decline', async (payload = {}) => {
      const { callId } = payload;
      const session = resolveCallSession(callId);

      if (!session || session.toUserId !== userId) {
        return;
      }

      emitToUser(namespace, session.fromUserId, 'call-declined', {
        callId: session.callId,
        chatGroupId: session.chatGroupId,
        fromUserId: session.fromUserId,
        toUserId: session.toUserId,
      });

      try {
        await appendCallEventMessage(session, userId, 'declined');
      } catch {
        // Call event logging should never block signaling.
      }

      activeCalls.delete(session.callId);
    });

    socket.on('call-end', async (payload = {}) => {
      const { callId } = payload;
      const session = resolveCallSession(callId);

      if (!session || !isCallParticipant(session, userId)) {
        return;
      }

      const reason = payload.reason || 'ended';
      const otherParticipantId = getOtherParticipant(session, userId);

      emitToUser(namespace, otherParticipantId, 'call-ended', {
        callId: session.callId,
        reason,
      });

      emitToUser(namespace, userId, 'call-ended', {
        callId: session.callId,
        reason,
      });

      try {
        await appendCallEventMessage(session, userId, reason);
      } catch {
        // Call event logging should never block signaling.
      }

      activeCalls.delete(session.callId);
    });

    socket.on('offer', (payload = {}) => {
      const { callId, toUserId, sdp } = payload;
      const session = resolveCallSession(callId);

      if (
        !session ||
        !isCallParticipant(session, userId) ||
        !toUserId ||
        !sdp
      ) {
        return;
      }

      emitToUser(namespace, String(toUserId), 'offer', {
        callId: session.callId,
        fromUserId: userId,
        sdp,
      });
    });

    socket.on('answer', (payload = {}) => {
      const { callId, toUserId, sdp } = payload;
      const session = resolveCallSession(callId);

      if (
        !session ||
        !isCallParticipant(session, userId) ||
        !toUserId ||
        !sdp
      ) {
        return;
      }

      emitToUser(namespace, String(toUserId), 'answer', {
        callId: session.callId,
        fromUserId: userId,
        sdp,
      });
    });

    socket.on('ice-candidate', (payload = {}) => {
      const { callId, toUserId, candidate } = payload;
      const session = resolveCallSession(callId);

      if (
        !session ||
        !isCallParticipant(session, userId) ||
        !toUserId ||
        !candidate
      ) {
        return;
      }

      emitToUser(namespace, String(toUserId), 'ice-candidate', {
        callId: session.callId,
        fromUserId: userId,
        candidate,
      });
    });

    socket.on('disconnect', async () => {
      const currentUserId = socket.data?.userId;
      if (!currentUserId) {
        return;
      }

      const userSockets = connectedUserSockets.get(currentUserId);

      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          connectedUserSockets.delete(currentUserId);

          let lastSeen = new Date();

          try {
            const presenceState = await updatePresence(currentUserId, false);
            lastSeen = presenceState.lastSeen || lastSeen;
          } catch {
            // Ignore DB write failures for non-critical presence updates.
          }

          broadcastPresenceUpdate(namespace, currentUserId, false, lastSeen);

          const impactedCalls = Array.from(activeCalls.values()).filter(
            (session) =>
              session.fromUserId === currentUserId ||
              session.toUserId === currentUserId
          );

          for (const session of impactedCalls) {
            const otherParticipantId = getOtherParticipant(
              session,
              currentUserId
            );

            emitToUser(namespace, otherParticipantId, 'call-ended', {
              callId: session.callId,
              reason: 'disconnected',
            });

            try {
              await appendCallEventMessage(
                session,
                currentUserId,
                'disconnected'
              );
            } catch {
              // Call event logging should never block signaling.
            }

            activeCalls.delete(session.callId);
          }
        }
      }
    });
  });
};

module.exports = registerChatCallSocket;
