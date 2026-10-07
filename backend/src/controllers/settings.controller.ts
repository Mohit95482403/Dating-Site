import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { SettingsService } from '../services/settings.service';
import { SettingsModel } from '../models/settings.model';
import { UserModel } from '../models/user.model';
import { ProfileModel } from '../models/profile.model';
import { BlockModel } from '../models/block.model';
import { SessionModel } from '../models/session.model';
import { PasswordUtil } from '../utils/password';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import { query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

export class SettingsController {
  // ==========================================
  // DAY 28 PLATFORM SETTINGS & OPERATIONS
  // ==========================================

  /**
   * GET /api/settings/public - Public platform configuration & maintenance flag
   */
  public static getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
    const settings = await SettingsService.getAllSettings(false);
    const flags = await SettingsService.getFeatureFlags();

    const configMap: Record<string, any> = {};
    for (const s of settings) {
      if (s.type === 'boolean') configMap[s.key] = s.value === 'true' || s.value === '1';
      else if (s.type === 'number') configMap[s.key] = Number(s.value);
      else configMap[s.key] = s.value;
    }

    const activeFlags: Record<string, boolean> = {};
    for (const f of flags) {
      activeFlags[f.key] = f.isEnabled;
    }

    ApiResponse.success(res, 'Public configuration fetched successfully', {
      settings: configMap,
      features: activeFlags,
      maintenanceMode: Boolean(configMap['maintenance_mode']),
    });
  };

  /**
   * GET /api/admin/settings - Admin: Retrieve all platform configuration settings
   */
  public static getAllSettings = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const settings = await SettingsService.getAllSettings(true);
    ApiResponse.success(res, 'Platform settings fetched successfully', settings);
  };

  /**
   * PUT /api/admin/settings/:key - Admin: Update a platform setting
   */
  public static updateSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = req.user!.id;
    const { key } = req.params;
    const { value } = req.body;

    if (!key) throw AppError.badRequest('Setting key is required.');
    if (value === undefined || value === null) throw AppError.badRequest('Setting value is required.');

    const updated = await SettingsService.updateSetting(key, String(value), adminId);
    ApiResponse.success(res, `Setting "${key}" updated successfully`, updated);
  };

  /**
   * GET /api/admin/features - Admin: List all feature flags and rollout percentages
   */
  public static getFeatureFlags = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flags = await SettingsService.getFeatureFlags();
    ApiResponse.success(res, 'Feature flags fetched successfully', flags);
  };

  /**
   * PATCH /api/admin/features/:key/toggle - Admin: Toggle a feature flag ON/OFF
   */
  public static toggleFeatureFlag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = req.user!.id;
    const { key } = req.params;
    const { isEnabled } = req.body;

    if (!key) throw AppError.badRequest('Feature key is required.');
    if (typeof isEnabled !== 'boolean') throw AppError.badRequest('isEnabled must be a boolean.');

    await SettingsService.toggleFeatureFlag(key, isEnabled, adminId);
    ApiResponse.success(res, `Feature "${key}" has been toggled ${isEnabled ? 'ON' : 'OFF'}`, {
      key,
      isEnabled,
    });
  };

  /**
   * PATCH /api/admin/features/:key - Admin: Update rollout percentage and metadata
   */
  public static updateFeatureFlag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = req.user!.id;
    const { key } = req.params;
    const { name, description, isEnabled, rolloutPercentage } = req.body;

    if (!key) throw AppError.badRequest('Feature key is required.');

    await SettingsService.updateFeatureFlag(key, { name, description, isEnabled, rolloutPercentage }, adminId);
    ApiResponse.success(res, `Feature flag "${key}" updated successfully`, { key });
  };

  /**
   * GET /api/admin/search?q=... - Global Admin Search across all platform entities
   */
  public static globalAdminSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 2) {
      ApiResponse.success(res, 'Empty search query', {
        users: [],
        reports: [],
        tickets: [],
        transactions: [],
      });
      return;
    }

    const term = `%${q}%`;
    const numId = Number(q);
    const isNum = !isNaN(numId) && numId > 0;

    // 1. Search Users
    const usersSql = `
      SELECT u.id, u.email, u.role, u.status, p.first_name, p.last_name,
             (SELECT file_url FROM photos WHERE user_id = u.id AND is_primary = TRUE LIMIT 1) as avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? ${isNum ? 'OR u.id = ?' : ''}
      LIMIT 8
    `;
    const userParams = isNum ? [term, term, term, numId] : [term, term, term];
    const users = await query<RowDataPacket[]>(usersSql, userParams);

    // 2. Search Reports
    const reportsSql = `
      SELECT r.id, r.reason, r.status, r.created_at,
             ru.email as reporter_email, rp.first_name as reported_name
      FROM reports r
      LEFT JOIN users ru ON r.reporter_id = ru.id
      LEFT JOIN profiles rp ON r.reported_user_id = rp.user_id
      WHERE r.reason LIKE ? OR r.description LIKE ? ${isNum ? 'OR r.id = ?' : ''}
      LIMIT 6
    `;
    const reportParams = isNum ? [term, term, numId] : [term, term];
    const reports = await query<RowDataPacket[]>(reportsSql, reportParams);

    // 3. Search Support Tickets
    const ticketsSql = `
      SELECT st.id, st.ticket_number, st.subject, st.category, st.priority, st.status, st.created_at,
             u.email as user_email
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      WHERE st.ticket_number LIKE ? OR st.subject LIKE ? OR u.email LIKE ? ${isNum ? 'OR st.id = ?' : ''}
      LIMIT 6
    `;
    const ticketParams = isNum ? [term, term, term, numId] : [term, term, term];
    const tickets = await query<RowDataPacket[]>(ticketsSql, ticketParams);

    // 4. Search Payment Transactions
    const txSql = `
      SELECT pt.id, pt.provider_order_id, pt.provider_payment_id, pt.amount, pt.currency, pt.status, pt.created_at,
             u.email as user_email
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.provider_order_id LIKE ? OR pt.provider_payment_id LIKE ? OR u.email LIKE ? ${isNum ? 'OR pt.id = ?' : ''}
      LIMIT 6
    `;
    const txParams = isNum ? [term, term, term, numId] : [term, term, term];
    const transactions = await query<RowDataPacket[]>(txSql, txParams);

    ApiResponse.success(res, 'Global admin search results retrieved', {
      query: q,
      users,
      reports,
      tickets,
      transactions,
    });
  };

  // ==========================================
  // USER SETTINGS & ACCOUNT (Day 15 & Day 25)
  // ==========================================

  /**
   * GET /api/settings - User personal preferences
   */
  public static getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const settings = await SettingsModel.findByUserId(userId);
    ApiResponse.success(res, 'Settings retrieved successfully', settings);
  };

  /**
   * PUT /api/settings - Update personal preferences with mass assignment defense
   */
  public static updateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const allowedFields = [
      'profileVisibility',
      'showOnlineStatus',
      'showLastSeen',
      'showReadReceipts',
      'showTypingIndicator',
      'showInDiscovery',
      'useLocationForDiscovery',
      'notifyMatches',
      'notifyMessages',
      'notifyLikes',
      'notifySuperLikes',
      'notifyReactions',
      'notifySystem',
      'locationVisibility',
      'messagePermissions',
      'callPermissions',
      'aiDataProcessing',
      'searchVisibility',
    ];
    const safeInput: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        safeInput[field] = req.body[field];
      }
    }
    const updated = await SettingsModel.update(userId, safeInput);
    ApiResponse.success(res, 'Settings updated successfully', updated);
  };

  /**
   * GET /api/account - Get user account information
   */
  public static getAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const user = await UserModel.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const profile = await ProfileModel.findByUserId(userId);

    ApiResponse.success(res, 'Account retrieved successfully', {
      id: user.id,
      email: user.email,
      username: user.username || null,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || null,
      dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : null,
      gender: profile?.gender || null,
      isEmailVerified: Boolean(user.is_email_verified),
      role: user.role,
      status: user.status,
      createdAt: new Date(user.created_at).toISOString(),
    });
  };

  /**
   * PUT /api/account - Update user account information
   */
  public static updateAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { firstName, lastName, username, dateOfBirth } = req.body;

    if (username !== undefined && username !== null && username !== '') {
      const [existing] = await query<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
        [username.trim(), userId]
      );
      if (existing) {
        res.status(HttpStatus.CONFLICT).json({
          success: false,
          message: 'Username is already taken by another user.',
        });
        return;
      }
      await execute('UPDATE users SET username = ? WHERE id = ?', [username.trim(), userId]);
    }

    const profileSets: string[] = [];
    const profileVals: any[] = [];
    if (firstName !== undefined) {
      profileSets.push('first_name = ?');
      profileVals.push(firstName);
    }
    if (lastName !== undefined) {
      profileSets.push('last_name = ?');
      profileVals.push(lastName);
    }
    if (dateOfBirth !== undefined) {
      profileSets.push('date_of_birth = ?');
      profileVals.push(dateOfBirth);
    }
    if (profileSets.length > 0) {
      profileVals.push(userId);
      await execute(`UPDATE profiles SET ${profileSets.join(', ')} WHERE user_id = ?`, profileVals);
    }

    const updatedUser = await UserModel.findById(userId);
    const updatedProfile = await ProfileModel.findByUserId(userId);
    ApiResponse.success(res, 'Account updated successfully', {
      id: updatedUser!.id,
      email: updatedUser!.email,
      username: updatedUser!.username || null,
      firstName: updatedProfile?.first_name || '',
      lastName: updatedProfile?.last_name || null,
      dateOfBirth: updatedProfile?.date_of_birth ? new Date(updatedProfile.date_of_birth).toISOString().split('T')[0] : null,
      gender: updatedProfile?.gender || null,
      isEmailVerified: Boolean(updatedUser!.is_email_verified),
      role: updatedUser!.role,
      status: updatedUser!.status,
      createdAt: new Date(updatedUser!.created_at).toISOString(),
    });
  };

  /**
   * DELETE /api/account - Delete user account permanently
   */
  public static deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    await execute("UPDATE users SET status = 'deleted' WHERE id = ?", [userId]);
    await SessionModel.revokeAllUserSessions(userId);
    ApiResponse.success(res, 'Account deleted successfully', { id: userId, status: 'deleted' });
  };

  /**
   * POST /api/auth/change-password
   */
  public static changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw AppError.badRequest('Current and new password are required');
    }

    const userRows = await query<RowDataPacket[]>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!userRows[0] || !userRows[0].password_hash) {
      throw AppError.badRequest('User password not set');
    }

    const isMatch = await PasswordUtil.comparePassword(currentPassword, userRows[0].password_hash);
    if (!isMatch) {
      throw AppError.badRequest('Current password is incorrect');
    }

    const newHash = await PasswordUtil.hashPassword(newPassword);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    ApiResponse.success(res, 'Password changed successfully');
  };

  /**
   * GET /api/blocks - List all blocked users
   */
  public static getBlockedUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const blocked = await BlockModel.getBlockedUsers(userId);
    ApiResponse.success(res, 'Blocked users retrieved successfully', blocked);
  };

  /**
   * POST /api/blocks - Block a user
   */
  public static blockUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const targetUserId = Number(req.params.userId || req.body.userId);
    const reason = req.body.reason;
    if (!targetUserId || isNaN(targetUserId)) {
      throw AppError.badRequest('Valid target user ID required');
    }
    await BlockModel.blockUser(userId, targetUserId, reason);
    ApiResponse.success(res, 'User blocked successfully', { blockedUserId: targetUserId });
  };

  /**
   * DELETE /api/blocks/:userId or POST /api/blocks/:userId/unblock
   */
  public static unblockUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const targetUserId = Number(req.params.userId || req.body.userId);
    if (!targetUserId || isNaN(targetUserId)) {
      throw AppError.badRequest('Valid target user ID required');
    }
    await BlockModel.unblockUser(userId, targetUserId);
    ApiResponse.success(res, 'User unblocked successfully', { unblockedUserId: targetUserId });
  };

  /**
   * GET /api/sessions - List active sessions
   */
  public static getSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sessions = await SessionModel.findActiveSessionsByUserId(userId);
    const formatted = sessions.map((s, idx) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      browser: 'Browser',
      os: 'OS',
      device: 'Device',
      createdAt: new Date(s.createdAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
      isCurrent: idx === 0,
    }));
    ApiResponse.success(res, 'Sessions retrieved successfully', formatted);
  };

  /**
   * POST /api/sessions/logout-others - Log out other active sessions
   */
  public static logoutOtherSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sessions = await SessionModel.findActiveSessionsByUserId(userId);
    if (sessions.length > 1) {
      const latest = sessions[0];
      await execute(
        'UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id != ? AND revoked_at IS NULL',
        [userId, latest.id]
      );
    }
    ApiResponse.success(res, 'Other sessions terminated successfully');
  };

  /**
   * DELETE /api/sessions/:sessionId - Revoke a specific session
   */
  public static revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sessionId = Number(req.params.sessionId);
    if (isNaN(sessionId)) throw AppError.badRequest('Invalid session ID');
    await SessionModel.revokeSession(sessionId, userId);
    ApiResponse.success(res, 'Session revoked successfully');
  };
}

export default SettingsController;
