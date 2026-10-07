import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import socketConfig from '../config/socket';
import { socketAuthMiddleware, AuthenticatedSocket } from './socketAuth';
import { SOCKET_EVENTS, SocketUserRegistry } from './socketEvents';
import { logger } from '../utils/logger';
import { ConversationModel } from '../models/conversation.model';
import { ProfileModel } from '../models/profile.model';
import { MatchModel } from '../models/match.model';
import { MessageModel } from '../models/message.model';
import { BlockModel } from '../models/block.model';
import { execute, query } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { MessageItem, ReactionGroup } from '../types/chat.types';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, socketConfig);

  // Attach authentication middleware
  io.use(socketAuthMiddleware);

  io.on(SOCKET_EVENTS.CONNECT, (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Anti-flood / Socket Event Rate Limiting (max 100 events per 10s per socket)
    let eventCount = 0;
    let windowReset = Date.now() + 10000;
    socket.use((_packet, next) => {
      const now = Date.now();
      if (now > windowReset) {
        eventCount = 1;
        windowReset = now + 10000;
        return next();
      }
      eventCount++;
      if (eventCount > 100) {
        logger.warn(`[SocketRateLimit] Flood prevention triggered for socket ${socket.id}`);
        return next(new Error('Rate limit exceeded. Please slow down.'));
      }
      next();
    });

    const userId = socket.user?.userId;
    if (userId) {
      const wasOnline = SocketUserRegistry.isUserOnline(userId);
      SocketUserRegistry.addUser(userId, socket.id);
      socket.join(`user:${userId}`);

      // If user transitioned from offline to online, broadcast presence
      if (!wasOnline) {
        broadcastUserPresence(userId, true);
      }

      // If user is staff (admin or moderator), join admin real-time channel
      if (socket.user?.role === 'admin' || socket.user?.role === 'moderator') {
        socket.join('admin:channel');
        logger.info(`[Socket] Staff user ${userId} (${socket.user?.role}) joined admin:channel on socket ${socket.id}`);
      }
    }

    // Send welcome handshake event for connectivity verification
    socket.emit(SOCKET_EVENTS.CONNECTED_HANDSHAKE, {
      success: true,
      message: 'Connected to Connectly Real-time Gateway',
      socketId: socket.id,
      authenticated: !!userId,
      userId: userId || null,
      timestamp: new Date().toISOString(),
    });

    // Disconnect handling with multi-socket support
    socket.on(SOCKET_EVENTS.DISCONNECT, async (reason: string) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
      if (userId) {
        const isCompletelyOffline = SocketUserRegistry.removeUser(userId, socket.id);
        if (isCompletelyOffline) {
          const nowIso = new Date().toISOString();
          try {
            await execute('UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
          } catch (err) {
            logger.warn(`Failed to update last_seen_at for user ${userId}:`, err);
          }
          broadcastUserPresence(userId, false, nowIso);
        }
      }
    });

    // 1. Presence check request
    socket.on('presence:check', async (payload: { userId: number }, callback?: (res: any) => void) => {
      if (!payload?.userId) return;
      const targetId = Number(payload.userId);
      const isOnline = SocketUserRegistry.isUserOnline(targetId);
      let lastSeenAt: string | null = null;

      if (!isOnline) {
        try {
          const rows = await query<RowDataPacket[]>('SELECT last_seen_at FROM users WHERE id = ?', [targetId]);
          if (rows[0]?.last_seen_at) {
            lastSeenAt = new Date(rows[0].last_seen_at).toISOString();
          }
        } catch {
          // ignore
        }
      }

      if (callback) {
        callback({ userId: targetId, isOnline, lastSeenAt });
      }
    });

    // 2. Conversation Room Join
    socket.on('conversation:join', async (payload: { conversationId: number }, callback?: (res: any) => void) => {
      try {
        if (!userId) {
          socket.emit('conversation:error', { success: false, message: 'Authentication required' });
          if (callback) callback({ success: false, message: 'Authentication required' });
          return;
        }

        const convId = Number(payload?.conversationId);
        if (!convId || isNaN(convId)) {
          socket.emit('conversation:error', { success: false, message: 'Invalid conversation ID' });
          if (callback) callback({ success: false, message: 'Invalid conversation ID' });
          return;
        }

        // Verify user has access to conversation and match is active
        const access = await ConversationModel.verifyUserAccess(convId, userId);
        if (!access.allowed) {
          const msg = access.reason === 'unmatched'
            ? 'Cannot join conversation because the match is no longer active.'
            : 'You are not authorized to access this conversation.';
          socket.emit('conversation:error', { success: false, message: msg });
          if (callback) callback({ success: false, message: msg });
          return;
        }

        socket.join(`conversation:${convId}`);
        logger.debug(`[Socket] User ${userId} joined room conversation:${convId}`);
        socket.emit('conversation:joined', { success: true, conversationId: convId });
        if (callback) callback({ success: true, conversationId: convId });
      } catch (err: any) {
        logger.error('[Socket] Error in conversation:join:', err);
        socket.emit('conversation:error', { success: false, message: 'Failed to join conversation room' });
        if (callback) callback({ success: false, message: 'Failed to join conversation room' });
      }
    });

    // 3. Conversation Room Leave
    socket.on('conversation:leave', (payload: { conversationId: number }) => {
      const convId = Number(payload?.conversationId);
      if (convId) {
        socket.leave(`conversation:${convId}`);
        logger.debug(`[Socket] User ${userId} left room conversation:${convId}`);
        // Clear any typing state for this user in this room
        if (userId) {
          socket.to(`conversation:${convId}`).emit('typing:update', {
            conversationId: convId,
            userId,
            isTyping: false,
          });
        }
      }
    });

    // 4. Typing indicators (Debounced on frontend, verified on backend)
    socket.on('typing:start', async (payload: { conversationId: number }) => {
      try {
        if (!userId) return;
        const convId = Number(payload?.conversationId);
        if (!convId || isNaN(convId)) return;

        const access = await ConversationModel.verifyUserAccess(convId, userId);
        if (!access.allowed) return;

        const profile = await ProfileModel.findByUserId(userId);
        socket.to(`conversation:${convId}`).emit('typing:update', {
          conversationId: convId,
          userId,
          isTyping: true,
          userName: profile?.first_name || 'Partner',
        });
      } catch (err) {
        logger.warn('[Socket] typing:start error:', err);
      }
    });

    socket.on('typing:stop', (payload: { conversationId: number }) => {
      if (!userId) return;
      const convId = Number(payload?.conversationId);
      if (!convId || isNaN(convId)) return;

      socket.to(`conversation:${convId}`).emit('typing:update', {
        conversationId: convId,
        userId,
        isTyping: false,
      });
    });

    // 5. Message Delivery Acknowledgment
    socket.on('message:delivered', async (payload: { messageId: number; conversationId: number }) => {
      try {
        if (!userId) return;
        const msgId = Number(payload?.messageId);
        const convId = Number(payload?.conversationId);
        if (!msgId || !convId) return;

        await MessageModel.markMessagesDelivered([msgId]);

        io?.to(`conversation:${convId}`).emit('message:status', {
          conversationId: convId,
          messageId: msgId,
          status: 'delivered',
        });
      } catch (err) {
        logger.warn('[Socket] message:delivered error:', err);
      }
    });

    // ---------------------------------------------------------
    // Day 19: WebRTC Calling Signaling & Room Handlers
    // ---------------------------------------------------------
    socket.on('call:join', async (payload: { callId: number }, callback?: (res: any) => void) => {
      try {
        if (!userId) {
          if (callback) callback({ success: false, message: 'Authentication required' });
          return;
        }
        const callId = Number(payload?.callId);
        if (!callId) return;

        // Verify user is an authorized participant of this call
        const rows = await query<RowDataPacket[]>(
          'SELECT id, caller_id, receiver_id, status FROM calls WHERE id = ?',
          [callId]
        );
        if (!rows || rows.length === 0) {
          if (callback) callback({ success: false, message: 'Call not found' });
          return;
        }

        const call = rows[0];
        if (Number(call.caller_id) !== userId && Number(call.receiver_id) !== userId) {
          if (callback) callback({ success: false, message: 'Unauthorized call room access' });
          return;
        }

        // Verify neither participant has blocked the other
        const isBlocked = await BlockModel.isBlocked(Number(call.caller_id), Number(call.receiver_id));
        if (isBlocked) {
          if (callback) callback({ success: false, message: 'Cannot join call with a blocked user' });
          return;
        }

        socket.join(`call:${callId}`);
        logger.info(`[Socket] User ${userId} joined room call:${callId}`);
        if (callback) callback({ success: true });
      } catch (err: any) {
        logger.error('[Socket] Error in call:join:', err);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('call:leave', (payload: { callId: number }) => {
      const callId = Number(payload?.callId);
      if (callId) {
        socket.leave(`call:${callId}`);
        logger.info(`[Socket] User ${userId} left room call:${callId}`);
      }
    });

    // ── Day 24: Community Room Handlers ──
    socket.on('community:join', async (payload: { communityId: number }, callback?: (res: any) => void) => {
      try {
        if (!userId) {
          if (callback) callback({ success: false, message: 'Authentication required' });
          return;
        }
        const commId = Number(payload?.communityId);
        if (!commId) {
          if (callback) callback({ success: false, message: 'Invalid community ID' });
          return;
        }

        const [commRows] = await query<RowDataPacket[]>(
          `SELECT c.id, c.visibility,
                  (SELECT status FROM community_members WHERE community_id = c.id AND user_id = ? LIMIT 1) as member_status
           FROM communities c WHERE c.id = ? AND c.status != 'archived'`,
          [userId, commId]
        );

        if (commRows.length === 0) {
          if (callback) callback({ success: false, message: 'Community not found' });
          return;
        }

        const comm = commRows[0];
        if (comm.visibility === 'private' && comm.member_status !== 'active') {
          if (callback) callback({ success: false, message: 'Unauthorized access to private community' });
          return;
        }

        socket.join(`community:${commId}`);
        logger.debug(`[Socket] User ${userId} joined room community:${commId}`);
        if (callback) callback({ success: true, communityId: commId });
      } catch (err: any) {
        logger.error('[Socket] Error in community:join:', err);
        if (callback) callback({ success: false, message: 'Failed to join community room' });
      }
    });

    socket.on('community:leave', (payload: { communityId: number }) => {
      const commId = Number(payload?.communityId);
      if (commId) {
        socket.leave(`community:${commId}`);
        logger.debug(`[Socket] User ${userId} left room community:${commId}`);
      }
    });

    socket.on('call:offer', async (payload: { callId: number; sdp: any }) => {
      try {
        if (!userId || !payload?.callId) return;
        const callId = Number(payload.callId);
        socket.to(`call:${callId}`).emit('call:offer', {
          callId,
          sdp: payload.sdp,
          senderId: userId,
        });
      } catch (err) {
        logger.warn('[Socket] Failed to forward call:offer:', err);
      }
    });

    socket.on('call:answer', async (payload: { callId: number; sdp: any }) => {
      try {
        if (!userId || !payload?.callId) return;
        const callId = Number(payload.callId);
        socket.to(`call:${callId}`).emit('call:answer', {
          callId,
          sdp: payload.sdp,
          senderId: userId,
        });
      } catch (err) {
        logger.warn('[Socket] Failed to forward call:answer:', err);
      }
    });

    socket.on('call:ice-candidate', async (payload: { callId: number; candidate: any }) => {
      try {
        if (!userId || !payload?.callId) return;
        const callId = Number(payload.callId);
        socket.to(`call:${callId}`).emit('call:ice-candidate', {
          callId,
          candidate: payload.candidate,
          senderId: userId,
        });
      } catch (err) {
        logger.warn('[Socket] Failed to forward call:ice-candidate:', err);
      }
    });

    socket.on('call:media-state', async (payload: { callId: number; isMuted?: boolean; isCameraEnabled?: boolean }) => {
      try {
        if (!userId || !payload?.callId) return;
        const callId = Number(payload.callId);
        socket.to(`call:${callId}`).emit('call:media-state', {
          callId,
          senderId: userId,
          isMuted: payload.isMuted,
          isCameraEnabled: payload.isCameraEnabled,
        });
      } catch (err) {
        logger.warn('[Socket] Failed to forward call:media-state:', err);
      }
    });

    // Handle generic socket errors
    socket.on('error', (err: any) => {
      logger.error(`[Socket Error] ${socket.id}:`, err);
      socket.emit(SOCKET_EVENTS.ERROR, {
        success: false,
        message: 'A real-time socket error occurred.',
      });
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket first.');
  }
  return io;
};

export const emitToUser = (userId: number, event: string, payload: any): void => {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
    logger.debug(`[Socket] Emitted '${event}' to user:${userId}`);
  } catch (err) {
    logger.warn(`[Socket] Failed to emit '${event}' to user ${userId}:`, err);
  }
};

/**
 * Broadcast user online/offline presence change to active matched partners
 */
export const broadcastUserPresence = async (
  userId: number,
  isOnline: boolean,
  lastSeenAt?: string | null
): Promise<void> => {
  try {
    const partnerIds = await MatchModel.getActivePartnerIds(userId);
    const payload = {
      userId,
      isOnline,
      lastSeenAt: isOnline ? null : lastSeenAt || new Date().toISOString(),
    };

    for (const partnerId of partnerIds) {
      emitToUser(partnerId, 'presence:update', payload);
    }
  } catch (err) {
    logger.warn(`[Socket] Failed to broadcast presence for user ${userId}:`, err);
  }
};

export const notifyMatchCreated = (
  matchId: number,
  userAId: number,
  userBId: number,
  userAProfile?: any,
  userBProfile?: any
): void => {
  emitToUser(userAId, 'match:created', {
    matchId,
    userId: userBId,
    user: userBProfile,
    matchedAt: new Date().toISOString(),
  });
  emitToUser(userAId, 'match:new', {
    matchId,
    userId: userBId,
    user: userBProfile,
  });

  emitToUser(userBId, 'match:created', {
    matchId,
    userId: userAId,
    user: userAProfile,
    matchedAt: new Date().toISOString(),
  });
  emitToUser(userBId, 'match:new', {
    matchId,
    userId: userAId,
    user: userAProfile,
  });
};

export const emitNewMessage = (
  conversationId: number,
  message: MessageItem,
  partnerUserId: number
): void => {
  try {
    if (!io) return;
    // Broadcast to active conversation room
    io.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    // Also notify partner user directly to update unread badges and conversation list
    io.to(`user:${partnerUserId}`).emit('conversation:updated', {
      conversationId,
      lastMessage: message,
    });
    io.to(`user:${partnerUserId}`).emit('message:received', {
      conversationId,
      message,
    });
  } catch (err) {
    logger.warn('[Socket] Failed to emit new message:', err);
  }
};

export const emitMessagesRead = (
  conversationId: number,
  userId: number,
  partnerUserId: number
): void => {
  try {
    if (!io) return;
    io.to(`conversation:${conversationId}`).emit('message:read', {
      conversationId,
      readerId: userId,
    });
    io.to(`user:${partnerUserId}`).emit('message:read', {
      conversationId,
      readerId: userId,
    });
    io.to(`user:${partnerUserId}`).emit('conversation:read', {
      conversationId,
      readerId: userId,
    });
  } catch (err) {
    logger.warn('[Socket] Failed to emit messages read:', err);
  }
};

export const emitMessageReaction = (
  conversationId: number,
  messageId: number,
  reactions: ReactionGroup[],
  userId: number,
  action: string,
  reaction: string
): void => {
  try {
    if (!io) return;
    io.to(`conversation:${conversationId}`).emit('message:reaction', {
      conversationId,
      messageId,
      reactions,
      userId,
      action,
      reaction,
    });
  } catch (err) {
    logger.warn('[Socket] Failed to emit message reaction:', err);
  }
};

/**
 * Check if a user is actively viewing a conversation room on any connected socket
 */
export const isUserInConversationRoom = (userId: number, conversationId: number): boolean => {
  try {
    if (!io) return false;
    const socketIds = SocketUserRegistry.getUserSockets(userId);
    if (!socketIds || socketIds.length === 0) return false;

    const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
    if (!room) return false;

    return socketIds.some((sid) => room.has(sid));
  } catch {
    return false;
  }
};

/**
 * Emit a new real-time notification to a specific user and synchronize their unread badge count
 */
export const emitNotification = (
  userId: number,
  notification: any,
  unreadCount: number
): void => {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_COUNT_UPDATED, { unreadCount });
    logger.debug(`[Socket] Emitted notification:new and count (${unreadCount}) to user:${userId}`);
  } catch (err) {
    logger.warn(`[Socket] Failed to emit notification to user ${userId}:`, err);
  }
};

/**
 * Emit real-time notification read status to synchronize multi-tabs
 */
export const emitNotificationRead = (
  userId: number,
  notificationId: number,
  unreadCount: number
): void => {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_READ, { notificationId, unreadCount });
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_COUNT_UPDATED, { unreadCount });
  } catch (err) {
    logger.warn(`[Socket] Failed to emit notification:read to user ${userId}:`, err);
  }
};

/**
 * Emit real-time mark-all-read status to synchronize multi-tabs
 */
export const emitNotificationReadAll = (userId: number): void => {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, { unreadCount: 0 });
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_COUNT_UPDATED, { unreadCount: 0 });
  } catch (err) {
    logger.warn(`[Socket] Failed to emit notification:read-all to user ${userId}:`, err);
  }
};

/**
 * Day 17: Emit real-time events to all connected administrators
 */
export const emitToAdmins = (event: string, payload: any): void => {
  try {
    if (!io) return;
    io.to('admin:channel').emit(event, payload);
    logger.debug(`[Socket] Emitted event '${event}' to admin:channel`);
  } catch (err) {
    logger.warn(`[Socket] Failed to emit '${event}' to admin:channel:`, err);
  }
};

/**
 * Day 17: Force disconnect all active sockets of a suspended or banned user
 */
export const disconnectUserSockets = (userId: number, reason: string): void => {
  try {
    if (!io) return;
    const socketIds = SocketUserRegistry.getUserSockets(userId);
    // Notify the user before disconnecting
    io.to(`user:${userId}`).emit('account:restricted', {
      restricted: true,
      reason,
      timestamp: new Date().toISOString()
    });

    for (const sid of socketIds) {
      const s = io.sockets.sockets.get(sid);
      if (s) {
        s.disconnect(true);
      }
    }
    logger.info(`[Socket] Disconnected ${socketIds.length} socket(s) for user ${userId} (Reason: ${reason})`);
  } catch (err) {
    logger.warn(`[Socket] Failed to disconnect sockets for user ${userId}:`, err);
  }
};

/**
 * Day 17: Emit account status changes (e.g., unsuspended)
 */
export const emitAccountStatus = (userId: number, status: string, message: string): void => {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit('account:status', {
      status,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.warn(`[Socket] Failed to emit account:status to user ${userId}:`, err);
  }
};

/**
 * Day 19: WebRTC Calling Emitters
 */
export const emitCallIncoming = (receiverId: number, call: any): void => {
  emitToUser(receiverId, 'call:incoming', call);
};

export const emitCallAccepted = (callId: number, callerId: number, call: any): void => {
  emitToUser(callerId, 'call:accepted', call);
  if (io) {
    io.to(`call:${callId}`).emit('call:accepted', call);
  }
};

export const emitCallRejected = (callId: number, callerId: number): void => {
  emitToUser(callerId, 'call:rejected', { callId });
  if (io) {
    io.to(`call:${callId}`).emit('call:rejected', { callId });
  }
};

export const emitCallCancelled = (receiverId: number, callId: number): void => {
  emitToUser(receiverId, 'call:cancelled', { callId });
  if (io) {
    io.to(`call:${callId}`).emit('call:cancelled', { callId });
  }
};

export const emitCallEnded = (callId: number, callerId: number, receiverId: number, call: any): void => {
  emitToUser(callerId, 'call:ended', call);
  emitToUser(receiverId, 'call:ended', call);
  if (io) {
    io.to(`call:${callId}`).emit('call:ended', call);
  }
};

export const emitCallMissed = (callId: number, callerId: number, receiverId: number, call: any): void => {
  emitToUser(callerId, 'call:missed', call);
  emitToUser(receiverId, 'call:missed', call);
  if (io) {
    io.to(`call:${callId}`).emit('call:missed', call);
  }
};

export const emitCallBusy = (callerId: number, call: any): void => {
  emitToUser(callerId, 'call:busy', call);
};

// ── Day 24: Community Broadcast Helper ──
export const emitToCommunity = (communityId: number, event: string, payload: any): void => {
  try {
    if (!io) return;
    io.to(`community:${communityId}`).emit(event, payload);
  } catch (err) {
    logger.warn(`[Socket] Failed to emit to community:${communityId}:`, err);
  }
};

// ── Day 26: Real-time Recommendation Invalidation / Update Emitter ──
export const emitRecommendationsUpdated = (userId: number, reason: string = 'refresh'): void => {
  try {
    emitToUser(userId, 'recommendations:updated', {
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`[Socket] Failed to emit recommendations:updated to user ${userId}:`, err);
  }
};

export default initSocket;


