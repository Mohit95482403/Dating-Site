import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { HttpStatus } from '../utils/httpStatus';
import { JwtUtil } from '../utils/jwt';
import { UserModel } from '../models/user.model';

/**
 * Maintenance Mode Middleware: Gracefully intercepts non-admin traffic when active
 * while allowing platform administrators full diagnostic and operational access.
 */
export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const path = req.path;
  const originalUrl = req.originalUrl || '';

  // Always permit critical operational, diagnostics, and auth bypass paths
  if (
    path.startsWith('/admin') ||
    path.startsWith('/health') ||
    path.startsWith('/settings/public') ||
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/refresh') ||
    originalUrl.includes('/admin') ||
    originalUrl.includes('/health') ||
    originalUrl.includes('/settings/public') ||
    originalUrl.includes('/auth/login')
  ) {
    return next();
  }

  try {
    const isMaintenance = await SettingsService.isMaintenanceMode();
    if (isMaintenance) {
      // 1. Check if user is already attached
      let user = (req as any).user;

      // 2. If not attached but has Authorization header, inspect if admin
      if (!user && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = JwtUtil.verifyAccessToken(token);
          if (decoded && decoded.userId) {
            const dbUser = await UserModel.findById(decoded.userId);
            if (dbUser && dbUser.role === 'admin') {
              (req as any).user = dbUser;
              user = dbUser;
            }
          }
        } catch {
          // Token invalid or expired - proceed with normal maintenance block
        }
      }

      if (user && user.role === 'admin') {
        return next();
      }

      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: 'Connectly is temporarily undergoing scheduled maintenance. We are improving your experience and will return shortly.',
        maintenance: true,
      });
      return;
    }
  } catch {
    // If settings check fails, fail-open to avoid unnecessary outage
  }

  next();
};

export default maintenanceMiddleware;
