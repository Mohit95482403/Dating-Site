import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { validateRegisterInput, validateLoginInput } from '../validators/auth.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();

// ==========================================
// Public Authentication Routes
// ==========================================

/**
 * POST /api/auth/register
 * Register a new user, create profile & preferences in an atomic transaction
 */
router.post(
  '/register',
  validate(validateRegisterInput),
  asyncHandler(AuthController.register)
);

/**
 * POST /api/auth/login
 * Authenticate credentials, issue tokens, and create active session
 */
router.post(
  '/login',
  validate(validateLoginInput),
  asyncHandler(AuthController.login)
);

/**
 * POST /api/auth/refresh
 * Refresh access token and rotate refresh token
 */
router.post(
  '/refresh',
  asyncHandler(AuthController.refresh)
);

/**
 * POST /api/auth/forgot-password
 * Request password reset recovery token
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  asyncHandler(AuthController.forgotPassword)
);

/**
 * GET /api/auth/verify-reset-token/:token
 * Validate password recovery token status
 */
router.get(
  '/verify-reset-token/:token',
  passwordResetLimiter,
  asyncHandler(AuthController.verifyResetToken)
);

/**
 * POST /api/auth/reset-password
 * Complete password reset with one-time token
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  asyncHandler(AuthController.resetPassword)
);

// ==========================================
// Protected Authentication Routes
// ==========================================

/**
 * GET /api/auth/me
 * Retrieve authenticated user profile
 */
router.get(
  '/me',
  asyncHandler(authMiddleware as any),
  asyncHandler(AuthController.getMe as any)
);

/**
 * POST /api/auth/logout
 * Revoke current session and clear refresh token cookie
 */
router.post(
  '/logout',
  asyncHandler(authMiddleware as any),
  asyncHandler(AuthController.logout as any)
);

/**
 * POST /api/auth/logout-all
 * Revoke all active sessions across all devices for the current user
 */
router.post(
  '/logout-all',
  asyncHandler(authMiddleware as any),
  asyncHandler(AuthController.logoutAll as any)
);

/**
 * GET /api/auth/sessions
 * List active sessions for the current user
 */
router.get(
  '/sessions',
  asyncHandler(authMiddleware as any),
  asyncHandler(AuthController.getSessions as any)
);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific active session belonging to the user
 */
router.delete(
  '/sessions/:sessionId',
  asyncHandler(authMiddleware as any),
  asyncHandler(AuthController.revokeSession as any)
);

/**
 * POST /api/auth/change-password
 * Change password with current password verification
 */
router.post(
  '/change-password',
  asyncHandler(authMiddleware as any),
  SettingsController.changePassword
);

export default router;
