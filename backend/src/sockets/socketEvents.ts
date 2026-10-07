import { logger } from '../utils/logger';

// Socket Event Constants
export const SOCKET_EVENTS = {
  // Connection Lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED_HANDSHAKE: 'connected',
  ERROR: 'error',

  // Presence
  USER_ONLINE: 'presence:online',
  USER_OFFLINE: 'presence:offline',

  // Chat & Messaging (Future Day 8+)
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',

  // Match & Likes (Future Day 7+)
  NEW_MATCH: 'match:new',
  NEW_LIKE: 'like:received',

  // Notifications (Day 14)
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read-all',
  NOTIFICATION_COUNT_UPDATED: 'notification:count-updated',
  NOTIFICATION_RECEIVE: 'notification:receive',

  // WebRTC Calling (Day 19)
  CALL_INCOMING: 'call:incoming',
  CALL_ACCEPTED: 'call:accepted',
  CALL_REJECTED: 'call:rejected',
  CALL_CANCELLED: 'call:cancelled',
  CALL_ENDED: 'call:ended',
  CALL_MISSED: 'call:missed',
  CALL_BUSY: 'call:busy',
  CALL_OFFER: 'call:offer',
  CALL_ANSWER: 'call:answer',
  CALL_ICE_CANDIDATE: 'call:ice-candidate',
  CALL_MEDIA_STATE: 'call:media-state',
} as const;

/**
 * Multi-device socket user registry
 * Maps userId -> Set of active socket IDs
 */
export class SocketUserRegistry {
  private static onlineUsers = new Map<number, Set<string>>();

  public static addUser(userId: number, socketId: string): void {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set<string>());
    }
    this.onlineUsers.get(userId)!.add(socketId);
    logger.debug(`[SocketRegistry] User ${userId} connected on socket ${socketId}. Active sockets: ${this.onlineUsers.get(userId)!.size}`);
  }

  public static removeUser(userId: number, socketId: string): boolean {
    const userSockets = this.onlineUsers.get(userId);
    if (!userSockets) return false;

    userSockets.delete(socketId);
    if (userSockets.size === 0) {
      this.onlineUsers.delete(userId);
      logger.debug(`[SocketRegistry] User ${userId} is now completely offline`);
      return true; // Completely offline
    }
    return false; // Still online on another device/tab
  }

  public static isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
  }

  public static getUserSockets(userId: number): string[] {
    const sockets = this.onlineUsers.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  public static getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }
}

export default SocketUserRegistry;
