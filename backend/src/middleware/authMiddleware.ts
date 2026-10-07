import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { JwtUtil } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserModel } from '../models/user.model';
import { execute } from '../config/database';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query?.token && typeof req.query.token === 'string') {
      token = req.query.token;
    } else if ((req as any).cookies?.accessToken) {
      token = (req as any).cookies.accessToken;
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      throw AppError.unauthorized('Authentication token missing or invalid');
    }

    const decoded = JwtUtil.verifyAccessToken(token);

    // Verify user exists and check account status in DB
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw AppError.unauthorized('User not found or account removed');
    }

    // Check temporary suspension expiry
    if (user.status === 'suspended') {
      let isExpired = false;
      if (user.suspended_until) {
        const rawStr = String(user.suspended_until).trim();
        const isoStr = rawStr.includes('Z') || rawStr.includes('+') ? rawStr : rawStr.replace(' ', 'T') + 'Z';
        const expiryMs = new Date(isoStr).getTime();
        if (!isNaN(expiryMs) && expiryMs <= Date.now()) {
          isExpired = true;
        }
      }
      if (isExpired) {
        await execute(
          'UPDATE users SET status = "active", suspended_until = NULL, suspension_reason = NULL WHERE id = ?',
          [user.id]
        );
        user.status = 'active';
      } else {
        const untilStr = user.suspended_until ? ` until ${user.suspended_until}` : '';
        const reasonStr = user.suspension_reason ? `. Reason: ${user.suspension_reason}` : '';
        throw AppError.forbidden(`Your account has been suspended${untilStr}${reasonStr}. Access denied.`);
      }
    }

    if (user.status !== 'active') {
      throw AppError.forbidden(`Account is ${user.status}. Access denied.`);
    }

    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      status: user.status as any,
      isEmailVerified: Boolean(user.is_email_verified),
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(AppError.unauthorized('Invalid or expired authentication token'));
    }
  }
};

export const requireAuth = authMiddleware;
export default authMiddleware;
