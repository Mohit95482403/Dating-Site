import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { CookieUtil, REFRESH_COOKIE_NAME } from '../utils/cookies';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types/request.types';

export class AuthController {
  /**
   * POST /api/auth/register
   * Create account, profile, preferences, session, audit log and set refresh cookie
   */
  public static register = async (req: Request, res: Response): Promise<void> => {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const { user, accessToken, refreshToken } = await AuthService.register(
      req.body,
      ipAddress,
      userAgent
    );

    CookieUtil.setRefreshTokenCookie(res, refreshToken);

    ApiResponse.success(
      res,
      'User registration successful',
      { user, accessToken },
      HttpStatus.CREATED
    );
  };

  /**
   * POST /api/auth/login
   * Authenticate credentials, verify status, create session and set refresh cookie
   */
  public static login = async (req: Request, res: Response): Promise<void> => {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const { user, accessToken, refreshToken } = await AuthService.login(
      req.body,
      ipAddress,
      userAgent
    );

    CookieUtil.setRefreshTokenCookie(res, refreshToken);

    ApiResponse.success(
      res,
      'Login successful',
      { user, accessToken },
      HttpStatus.OK
    );
  };

  /**
   * POST /api/auth/refresh
   * Rotate refresh token and issue fresh short-lived access token
   */
  public static refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(
      refreshToken,
      ipAddress,
      userAgent
    );

    CookieUtil.setRefreshTokenCookie(res, newRefreshToken);

    ApiResponse.success(
      res,
      'Token refreshed successfully',
      { accessToken },
      HttpStatus.OK
    );
  };

  /**
   * POST /api/auth/logout
   * Revoke current session and clear refresh token cookie
   */
  public static logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    await AuthService.logout(refreshToken, req.user?.id, ipAddress, userAgent);

    CookieUtil.clearRefreshTokenCookie(res);

    ApiResponse.success(
      res,
      'Logged out successfully',
      null,
      HttpStatus.OK
    );
  };

  /**
   * POST /api/auth/logout-all
   * Revoke all active sessions for current user across all devices
   */
  public static logoutAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    await AuthService.logoutAll(req.user!.id, ipAddress, userAgent);

    CookieUtil.clearRefreshTokenCookie(res);

    ApiResponse.success(
      res,
      'Logged out from all devices successfully',
      null,
      HttpStatus.OK
    );
  };

  /**
   * GET /api/auth/me
   * Return authenticated user identity and profile
   */
  public static getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await AuthService.getCurrentUser(req.user!.id);

    ApiResponse.success(
      res,
      'Current user retrieved successfully',
      { user },
      HttpStatus.OK
    );
  };

  /**
   * GET /api/auth/sessions
   * List active sessions for the current user without exposing sensitive token hashes
   */
  public static getSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const sessions = await AuthService.getUserSessions(req.user!.id);

    ApiResponse.success(
      res,
      'Active sessions retrieved successfully',
      { sessions },
      HttpStatus.OK
    );
  };

  /**
   * DELETE /api/auth/sessions/:sessionId
   * Revoke a single active session belonging to the user
   */
  public static revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      throw AppError.badRequest('Invalid session ID');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    await AuthService.revokeUserSession(sessionId, req.user!.id, ipAddress, userAgent);

    ApiResponse.success(
      res,
      'Session revoked successfully',
      null,
      HttpStatus.OK
    );
  };

  /**
   * POST /api/auth/forgot-password
   */
  public static forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw AppError.badRequest('A valid email address is required.');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const result = await AuthService.requestPasswordReset(email, ipAddress, userAgent);

    ApiResponse.success(
      res,
      result.message,
      { devToken: result.devToken },
      HttpStatus.OK
    );
  };

  /**
   * GET /api/auth/verify-reset-token/:token
   */
  public static verifyResetToken = async (req: Request, res: Response): Promise<void> => {
    const token = req.params.token || (req.query.token as string);
    const result = await AuthService.verifyResetToken(token);

    ApiResponse.success(
      res,
      'Reset token is valid.',
      { valid: result.valid },
      HttpStatus.OK
    );
  };

  /**
   * POST /api/auth/reset-password
   */
  public static resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw AppError.badRequest('Token and new password are required.');
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const result = await AuthService.resetPassword(token, newPassword, ipAddress, userAgent);

    ApiResponse.success(
      res,
      result.message,
      null,
      HttpStatus.OK
    );
  };
}

export default AuthController;
