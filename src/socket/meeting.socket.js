const jwt = require('jsonwebtoken');
const meetingService = require('../service/meeting.service');

const meetingRoomUsers = new Map();

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization;

  const rawToken = authToken || headerToken;

  if (!rawToken) {
    return null;
  }

  return rawToken.replace('Bearer ', '');
};

const getRoomUsers = (meetingId) => {
  if (!meetingRoomUsers.has(meetingId)) {
    meetingRoomUsers.set(meetingId, new Map());
  }

  return meetingRoomUsers.get(meetingId);
};

const emitToMeetingUser = (io, meetingId, userId, eventName, payload) => {
  const roomUsers = meetingRoomUsers.get(meetingId);

  if (!roomUsers) {
    return;
  }

  const userSockets = roomUsers.get(String(userId));

  if (!userSockets || userSockets.size === 0) {
    return;
  }

  userSockets.forEach((socketId) => {
    io.to(socketId).emit(eventName, payload);
  });
};

const cleanupUserSocket = (socket) => {
  const { meetingId, userId } = socket.data || {};

  if (!meetingId || !userId) {
    return;
  }

  const roomUsers = meetingRoomUsers.get(meetingId);

  if (!roomUsers) {
    return;
  }

  const userSockets = roomUsers.get(userId);

  if (!userSockets) {
    return;
  }

  userSockets.delete(socket.id);

  if (userSockets.size === 0) {
    roomUsers.delete(userId);
    socket.to(meetingId).emit('participant-left', { meetingId, userId });
  }

  if (roomUsers.size === 0) {
    meetingRoomUsers.delete(meetingId);
  }
};

const registerMeetingSocket = (io) => {
  io.use((socket, next) => {
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

  io.on('connection', (socket) => {
    socket.on('join-meeting', async (payload = {}) => {
      const { meetingId, userId } = payload;

      if (!meetingId || !userId) {
        socket.emit('join-error', {
          message: 'meetingId and userId are required',
          statusCode: 400,
        });
        return;
      }

      if (String(socket.user.id) !== String(userId)) {
        socket.emit('join-error', {
          message: 'User identity mismatch',
          statusCode: 403,
        });
        return;
      }

      try {
        await meetingService.ensureJoinAccess(meetingId, userId);
      } catch (error) {
        socket.emit('join-error', {
          message: error.message,
          statusCode: error.statusCode || 400,
        });
        return;
      }

      const roomUsers = getRoomUsers(meetingId);
      const isNewRoomUser = !roomUsers.has(String(userId));

      if (isNewRoomUser && roomUsers.size >= 5) {
        socket.emit('join-error', {
          message: 'Meeting room is full (max 5 users)',
          statusCode: 400,
        });
        return;
      }

      const existingParticipants = Array.from(roomUsers.keys()).filter(
        (participantId) => participantId !== String(userId)
      );

      socket.join(meetingId);

      if (!roomUsers.has(String(userId))) {
        roomUsers.set(String(userId), new Set());
      }
      roomUsers.get(String(userId)).add(socket.id);

      socket.data.meetingId = meetingId;
      socket.data.userId = String(userId);

      socket.emit('existing-participants', {
        meetingId,
        participants: existingParticipants,
      });

      if (isNewRoomUser) {
        socket.to(meetingId).emit('participant-joined', {
          meetingId,
          userId: String(userId),
        });
      }
    });

    socket.on('offer', (payload = {}) => {
      const { meetingId, toUserId, sdp } = payload;

      if (!meetingId || !toUserId || !sdp) {
        return;
      }

      if (socket.data.meetingId !== meetingId) {
        return;
      }

      emitToMeetingUser(io, meetingId, toUserId, 'offer', {
        meetingId,
        toUserId,
        fromUserId: socket.data.userId,
        sdp,
      });
    });

    socket.on('answer', (payload = {}) => {
      const { meetingId, toUserId, sdp } = payload;

      if (!meetingId || !toUserId || !sdp) {
        return;
      }

      if (socket.data.meetingId !== meetingId) {
        return;
      }

      emitToMeetingUser(io, meetingId, toUserId, 'answer', {
        meetingId,
        toUserId,
        fromUserId: socket.data.userId,
        sdp,
      });
    });

    socket.on('ice-candidate', (payload = {}) => {
      const { meetingId, toUserId, candidate } = payload;

      if (!meetingId || !toUserId || !candidate) {
        return;
      }

      if (socket.data.meetingId !== meetingId) {
        return;
      }

      emitToMeetingUser(io, meetingId, toUserId, 'ice-candidate', {
        meetingId,
        toUserId,
        fromUserId: socket.data.userId,
        candidate,
      });
    });

    socket.on('disconnecting', () => {
      cleanupUserSocket(socket);
    });
  });
};

module.exports = registerMeetingSocket;
