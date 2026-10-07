import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import crypto from 'crypto';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';
import { AuditModel } from '../models/audit.model';
import { PasswordUtil } from '../utils/password';
import { JwtUtil } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { RegisterInput, LoginInput, AuthUser, SessionInfo } from '../types/auth';
import { logger } from '../utils/logger';

export class AuthService {
  /**
   * Register a new user with atomic transaction (user, profile, preferences, session, audit)
   */
  public static async register(
    input: RegisterInput,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Check duplicate email
    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) {
      throw AppError.conflict('An account with this email already exists.');
    }

    // 2. Hash password with bcrypt
    const passwordHash = await PasswordUtil.hashPassword(input.password);

    // 3. Execute atomic transaction
    const conn = await pool.getConnection();
    let newUserId = 0;
    let accessToken = '';
    let refreshToken = '';

    try {
      await conn.beginTransaction();

      // A. Create User record
      const [userResult] = await conn.execute(
        'INSERT INTO users (email, password_hash, role, status, is_email_verified) VALUES (?, ?, ?, ?, ?)',
        [normalizedEmail, passwordHash, 'user', 'active', false]
      );
      newUserId = (userResult as any).insertId;

      // B. Create Profile record
      await conn.execute(
        'INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, is_profile_complete) VALUES (?, ?, ?, ?, ?, ?)',
        [
          newUserId,
          input.firstName.trim(),
          input.lastName ? input.lastName.trim() : null,
          input.dateOfBirth,
          input.gender.toLowerCase(),
          false,
        ]
      );

      // C. Create Preferences record with safe defaults
      await conn.execute(
        'INSERT INTO preferences (user_id, min_age, max_age, preferred_gender, max_distance_km, relationship_goal) VALUES (?, ?, ?, ?, ?, ?)',
        [newUserId, 18, 100, 'all', 50, 'not_sure']
      );

      // D. Generate JWT tokens
      accessToken = JwtUtil.generateAccessToken({ userId: newUserId, role: 'user' });
      refreshToken = JwtUtil.generateRefreshToken({ userId: newUserId, role: 'user' });
      const refreshTokenHash = JwtUtil.hashToken(refreshToken);

      // E. Create session in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await SessionModel.createSession(
        newUserId,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt,
        conn
      );

      // F. Create audit log
      await AuditModel.log(
        newUserId,
        'USER_REGISTERED',
        'user',
        newUserId,
        'User account registered successfully',
        ipAddress,
        userAgent,
        conn
      );

      // Commit transaction
      await conn.commit();
      logger.info(`[AuthService] User registered successfully: userId=${newUserId} email=${normalizedEmail}`);
    } catch (error) {
      await conn.rollback();
      logger.error('[AuthService] Registration transaction rolled back due to error:', error);
      throw error;
    } finally {
      conn.release();
    }

    // Fetch safe profile
    const safeUser = (await UserModel.findUserWithProfile(newUserId))!;
    return { user: safeUser, accessToken, refreshToken };
  }

  /**
   * Authenticate user with credentials, check status, create session and audit log
   */
  public static async login(
    input: LoginInput,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      await AuditModel.log(null, 'FAILED_LOGIN', 'user', null, `Failed login attempt for email: ${normalizedEmail}`, ipAddress, userAgent);
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 2. Validate password with bcrypt
    const passwordMatch = await PasswordUtil.comparePassword(input.password, user.password_hash);
    if (!passwordMatch) {
      await AuditModel.log(user.id, 'FAILED_LOGIN', 'user', user.id, 'Failed login attempt: invalid password', ipAddress, userAgent);
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 3. Check account status
    if (user.status === 'suspended') {
      throw AppError.forbidden('Your account has been suspended. Please contact support.');
    }
    if (user.status === 'deleted') {
      throw AppError.forbidden('This account has been deleted.');
    }
    if (user.status === 'inactive') {
      throw AppError.forbidden('This account is inactive.');
    }

    // 4. Generate JWT tokens
    const accessToken = JwtUtil.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = JwtUtil.generateRefreshToken({ userId: user.id, role: user.role });
    const refreshTokenHash = JwtUtil.hashToken(refreshToken);

    // 5. Create active session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await SessionModel.createSession(
      user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt
    );

    // 6. Update last_login_at
    await UserModel.updateLastLogin(user.id);

    // 7. Write audit log
    await AuditModel.log(
      user.id,
      'USER_LOGIN',
      'user',
      user.id,
      'User logged in successfully',
      ipAddress,
      userAgent
    );

    logger.info(`[AuthService] User login successful: userId=${user.id}`);

    // Return safe user information with profile
    const safeUser = (await UserModel.findUserWithProfile(user.id))!;
    return { user: safeUser, accessToken, refreshToken };
  }

  /**
   * Refresh access token with token rotation
   */
  public static async refreshAccessToken(
    refreshToken: string | undefined,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required.');
    }

    // 1. Verify JWT signature
    let decoded;
    try {
      decoded = JwtUtil.verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    // 2. Lookup session by token hash
    const tokenHash = JwtUtil.hashToken(refreshToken);
    const session = await SessionModel.findActiveSessionByHash(tokenHash);
    if (!session) {
      throw AppError.unauthorized('Session has expired or has been revoked. Please sign in again.');
    }

    // 3. Verify user is still active
    const user = await UserModel.findById(session.user_id);
    if (!user || user.status !== 'active') {
      throw AppError.unauthorized('User account is no longer active.');
    }

    // 4. Token Rotation: generate new access & refresh tokens
    const newAccessToken = JwtUtil.generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = JwtUtil.generateRefreshToken({ userId: user.id, role: user.role });
    const newHash = JwtUtil.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await SessionModel.rotateSessionToken(session.id, newHash, newExpiresAt);

    // 5. Audit log
    await AuditModel.log(
      user.id,
      'REFRESH_TOKEN_USED',
      'session',
      session.id,
      'Session refresh token rotated successfully',
      ipAddress,
      userAgent
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Terminate current session
   */
  public static async logout(
    refreshToken?: string,
    userId?: number,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = JwtUtil.hashToken(refreshToken);
      await SessionModel.revokeSessionByHash(tokenHash);
    }

    if (userId) {
      await AuditModel.log(
        userId,
        'USER_LOGOUT',
        'user',
        userId,
        'User logged out successfully',
        ipAddress,
        userAgent
      );
      logger.info(`[AuthService] User logged out: userId=${userId}`);
    }
  }

  /**
   * Terminate all active sessions across all devices
   */
  public static async logoutAll(
    userId: number,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    const revokedCount = await SessionModel.revokeAllUserSessions(userId);
    await AuditModel.log(
      userId,
      'USER_LOGOUT_ALL',
      'user',
      userId,
      `User logged out from all devices. Revoked ${revokedCount} sessions.`,
      ipAddress,
      userAgent
    );
    logger.info(`[AuthService] User logged out of all devices: userId=${userId} revokedSessions=${revokedCount}`);
  }

  /**
   * Get authenticated user profile
   */
  public static async getCurrentUser(userId: number): Promise<AuthUser> {
    const user = await UserModel.findUserWithProfile(userId);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return user;
  }

  /**
   * List active sessions for the current user
   */
  public static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    return await SessionModel.findActiveSessionsByUserId(userId);
  }

  /**
   * Revoke a specific session belonging to the user
   */
  public static async revokeUserSession(
    sessionId: number,
    userId: number,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    const revoked = await SessionModel.revokeSession(sessionId, userId);
    if (!revoked) {
      throw AppError.notFound('Session not found, already revoked, or not owned by you.');
    }

    await AuditModel.log(
      userId,
      'SESSION_REVOKED',
      'session',
      sessionId,
      `Session ${sessionId} revoked by user`,
      ipAddress,
      userAgent
    );
    logger.info(`[AuthService] Session ${sessionId} revoked by user ${userId}`);
  }

  /**
   * Request password reset token. Always returns success message to prevent user enumeration.
   */
  public static async requestPasswordReset(
    email: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{ message: string; devToken?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(cleanEmail);

    if (!user) {
      // Intentionally do not disclose whether the email exists
      return {
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      };
    }

    // 1. Generate secure random token and its cryptographic hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // 2. Invalidate any existing unused reset tokens for this user
    await pool.query(
      'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );

    // 3. Store hashed reset token in database with 1-hour expiry
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [user.id, tokenHash]
    );

    // 4. Record audit event
    await AuditModel.log(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      'user',
      user.id,
      'Password reset link requested',
      ipAddress,
      userAgent
    );

    logger.info(`[AuthService] Password reset token generated for user ID ${user.id}`);

    return {
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      devToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
    };
  }

  /**
   * Validate password reset token
   */
  public static async verifyResetToken(token: string): Promise<{ valid: boolean; userId: number }> {
    if (!token || typeof token !== 'string') {
      throw AppError.badRequest('Reset token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, user_id, expires_at, used_at, (expires_at < NOW()) as is_expired FROM password_resets WHERE token_hash = ? LIMIT 1',
      [tokenHash]
    );

    if (rows.length === 0) {
      throw AppError.badRequest('Invalid or unrecognized password reset token.');
    }

    const record = rows[0];
    if (record.used_at !== null) {
      throw AppError.badRequest('This password reset link has already been used.');
    }

    if (Boolean(record.is_expired)) {
      throw AppError.badRequest('This password reset link has expired. Please request a new one.');
    }

    return { valid: true, userId: record.user_id };
  }

  /**
   * Complete password reset using verified token
   */
  public static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw AppError.badRequest('New password must be at least 8 characters long.');
    }

    // Verify token
    const { userId } = await this.verifyResetToken(token);

    // Hash new password
    const newPasswordHash = await PasswordUtil.hashPassword(newPassword);

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Mark token as used
      await conn.execute(
        'UPDATE password_resets SET used_at = NOW() WHERE token_hash = ?',
        [tokenHash]
      );

      // Update password hash in users table
      await conn.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      // Invalidate all active user sessions to protect hijacked sessions
      await conn.execute(
        'UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Audit log
    await AuditModel.log(
      userId,
      'PASSWORD_RESET_COMPLETED',
      'user',
      userId,
      'Password successfully reset via one-time recovery token',
      ipAddress,
      userAgent
    );

    logger.info(`[AuthService] Password reset successfully completed for user ID ${userId}`);

    return { message: 'Your password has been successfully reset. Please log in with your new password.' };
  }
}

export default AuthService;
