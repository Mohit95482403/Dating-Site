import { Socket } from 'socket.io';
import { JwtUtil, DecodedToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  user?: DecodedToken;
}

/**
 * Socket.IO authentication middleware verifying JWT credentials passed via handshake auth or headers
 */
export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): void => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    // If a token is provided, verify and attach user identity
    if (token) {
      try {
        const decoded = JwtUtil.verifyAccessToken(token);
        socket.user = decoded;
        logger.info(`[SocketAuth] Socket ${socket.id} authenticated for user ${decoded.userId}`);
      } catch {
        logger.warn(`[SocketAuth] Socket ${socket.id} supplied invalid/expired JWT`);
        // We allow connection in Day 3 for public presence or handshake, but socket.user remains undefined
      }
    }

    next();
  } catch (error) {
    logger.error('[SocketAuth] Authentication error:', error);
    next(new Error(JSON.stringify({ success: false, message: 'Unauthorized socket connection' })));
  }
};

export default socketAuthMiddleware;
