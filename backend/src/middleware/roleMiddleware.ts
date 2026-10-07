import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { AppError } from '../utils/AppError';

/**
 * Authorization middleware requiring specific user roles
 */
export const requireRole = (...allowedRoles: Array<'user' | 'moderator' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Access forbidden. Required role: ${allowedRoles.join(' or ')}`)
      );
    }

    next();
  };
};

export default requireRole;
