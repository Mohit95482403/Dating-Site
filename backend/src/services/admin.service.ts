import { AdminModel } from '../models/admin.model';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/AppError';
import {
  AdminDashboardStats,
  AdminDateRange,
  AdminUserListItem,
  AdminUserDetail,
  AdminReportListItem,
  AdminVerificationListItem,
  AdminAuditLogItem,
} from '../types/admin.types';
import {
  emitToAdmins,
  disconnectUserSockets,
  emitAccountStatus,
  emitNotification,
} from '../sockets/socket';
import { NotificationModel } from '../models/notification.model';
import { logger } from '../utils/logger';

export class AdminService {
  /**
   * Get real dashboard statistics & trend chart data
   */
  public static async getDashboardStats(range: AdminDateRange = '30d'): Promise<AdminDashboardStats> {
    return AdminModel.getDashboardStats(range);
  }

  /**
   * Get paginated user directory with search and status filters
   */
  public static async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    verification?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ users: AdminUserListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return AdminModel.getUsers(params);
  }

  /**
   * Get full admin inspection details for a user
   */
  public static async getUserDetail(userId: number): Promise<AdminUserDetail> {
    const detail = await AdminModel.getUserDetail(userId);
    if (!detail) {
      throw AppError.notFound(`User with ID ${userId} was not found.`);
    }
    return detail;
  }

  /**
   * Suspend a user account with optional duration
   */
  public static async suspendUser(
    adminId: number,
    targetUserId: number,
    reason: string,
    durationHours?: number | null
  ): Promise<void> {
    if (adminId === targetUserId) {
      throw AppError.badRequest('Administrative self-protection: You cannot suspend your own admin account.');
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User does not exist.');
    }

    if (user.role === 'admin') {
      throw AppError.badRequest('Administrative self-protection: Target account is an administrator.');
    }

    await AdminModel.suspendUser(adminId, targetUserId, reason.trim(), durationHours);

    // Disconnect user's active sockets immediately
    disconnectUserSockets(targetUserId, reason.trim());

    // Broadcast live event to all online admins
    emitToAdmins('user:moderated', {
      userId: targetUserId,
      status: 'suspended',
      action: 'SUSPEND',
      reason: reason.trim(),
      durationHours: durationHours || null,
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsuspend a user account
   */
  public static async unsuspendUser(
    adminId: number,
    targetUserId: number,
    reason?: string
  ): Promise<void> {
    if (adminId === targetUserId) {
      throw AppError.badRequest('Administrative self-protection: You cannot modify your own admin account status.');
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User does not exist.');
    }

    await AdminModel.unsuspendUser(adminId, targetUserId, reason?.trim() || 'Suspension lifted by admin');

    // Notify user socket
    emitAccountStatus(targetUserId, 'active', 'Your Connectly account has been reactivated.');

    // Broadcast live event to all online admins
    emitToAdmins('user:moderated', {
      userId: targetUserId,
      status: 'active',
      action: 'UNSUSPEND',
      reason: reason?.trim() || 'Suspension lifted',
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Permanently ban a user account
   */
  public static async banUser(
    adminId: number,
    targetUserId: number,
    reason: string
  ): Promise<void> {
    if (adminId === targetUserId) {
      throw AppError.badRequest('Administrative self-protection: You cannot ban your own admin account.');
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User does not exist.');
    }

    if (user.role === 'admin') {
      throw AppError.badRequest('Administrative self-protection: Cannot ban an administrator account.');
    }

    await AdminModel.banUser(adminId, targetUserId, reason.trim());

    // Disconnect user's active sockets immediately
    disconnectUserSockets(targetUserId, reason.trim());

    // Broadcast live event to all online admins
    emitToAdmins('user:moderated', {
      userId: targetUserId,
      status: 'banned',
      action: 'BAN',
      reason: reason.trim(),
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unban a banned user
   */
  public static async unbanUser(
    adminId: number,
    targetUserId: number,
    reason?: string
  ): Promise<void> {
    if (adminId === targetUserId) {
      throw AppError.badRequest('Administrative self-protection: You cannot modify your own admin account status.');
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User does not exist.');
    }

    await AdminModel.unbanUser(adminId, targetUserId, reason?.trim() || 'Ban lifted by admin');

    emitAccountStatus(targetUserId, 'active', 'Your Connectly account access has been restored.');

    emitToAdmins('user:moderated', {
      userId: targetUserId,
      status: 'active',
      action: 'UNBAN',
      reason: reason?.trim() || 'Ban lifted',
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Invalidate all sessions of a user
   */
  public static async resetSessions(adminId: number, targetUserId: number, reason?: string): Promise<void> {
    await AdminModel.resetSessions(adminId, targetUserId, reason?.trim() || 'Session reset requested by administrator');
    disconnectUserSockets(targetUserId, reason?.trim() || 'Active sessions were revoked by an administrator');
  }

  /**
   * Update a user's role with verification, safety, and audit
   */
  public static async updateUserRole(adminId: number, targetUserId: number, newRole: string): Promise<void> {
    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User does not exist.');
    }

    await AdminModel.updateUserRole(adminId, targetUserId, newRole);

    emitToAdmins('user:role_changed', {
      userId: targetUserId,
      newRole,
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Query reports with pagination and status filters
   */
  public static async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ reports: AdminReportListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return AdminModel.getReports(params);
  }

  /**
   * Get single report detailed context
   */
  public static async getReportDetail(reportId: number): Promise<any> {
    const report = await AdminModel.getReportById(reportId);
    if (!report) {
      throw AppError.notFound(`Report #${reportId} not found.`);
    }
    return report;
  }

  /**
   * Update report status to under_review or pending
   */
  public static async updateReportStatus(reportId: number, status: 'pending' | 'under_review'): Promise<void> {
    await AdminModel.updateReportStatus(reportId, status);
  }

  /**
   * Resolve a report with action (dismiss, warn, suspend, ban)
   */
  public static async resolveReport(params: {
    reportId: number;
    adminId: number;
    action: 'dismiss' | 'warn' | 'suspend' | 'ban';
    resolutionNotes: string;
    warningMessage?: string;
  }): Promise<void> {
    const { reportedUserId, action } = await AdminModel.resolveReport(params);

    if (action === 'suspend' || action === 'ban') {
      disconnectUserSockets(
        reportedUserId,
        `Account ${action}ed following investigation of report #${params.reportId}: ${params.resolutionNotes}`
      );
    } else if (action === 'warn') {
      try {
        const unreadCount = await NotificationModel.countUnread(reportedUserId);
        emitNotification(
          reportedUserId,
          {
            type: 'system_warning',
            title: 'Safety Warning from Connectly Moderation',
            message: params.warningMessage || 'Safety warning issued by administration.',
            createdAt: new Date().toISOString(),
          },
          unreadCount
        );
      } catch (err) {
        logger.warn('Failed to emit warning notification to user socket:', err);
      }
    }

    emitToAdmins('report:resolved', {
      reportId: params.reportId,
      action: params.action,
      adminId: params.adminId,
      reportedUserId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Query verification submissions with pagination and status filters
   */
  public static async getVerifications(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ verifications: AdminVerificationListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return AdminModel.getVerifications(params);
  }

  /**
   * Get single verification request detail
   */
  public static async getVerificationDetail(verificationId: number): Promise<any> {
    const detail = await AdminModel.getVerificationById(verificationId);
    if (!detail) {
      throw AppError.notFound(`Verification request #${verificationId} not found.`);
    }
    return detail;
  }

  /**
   * Approve a user's verification request
   */
  public static async approveVerification(
    adminId: number,
    verificationId: number,
    adminNotes?: string
  ): Promise<void> {
    const { userId } = await AdminModel.approveVerification(adminId, verificationId, adminNotes);

    try {
      const unreadCount = await NotificationModel.countUnread(userId);
      emitNotification(
        userId,
        {
          type: 'verification_update',
          title: 'Profile Verified!',
          message: 'Congratulations! Your profile has been officially verified.',
          createdAt: new Date().toISOString(),
        },
        unreadCount
      );
    } catch (err) {
      logger.warn('Failed to emit verification notification socket:', err);
    }

    emitToAdmins('verification:reviewed', {
      verificationId,
      userId,
      status: 'approved',
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Reject a user's verification request
   */
  public static async rejectVerification(
    adminId: number,
    verificationId: number,
    reason: string,
    adminNotes?: string
  ): Promise<void> {
    if (!reason || !reason.trim()) {
      throw AppError.badRequest('A clear rejection reason is required.');
    }

    const { userId } = await AdminModel.rejectVerification(adminId, verificationId, reason.trim(), adminNotes);

    try {
      const unreadCount = await NotificationModel.countUnread(userId);
      emitNotification(
        userId,
        {
          type: 'verification_update',
          title: 'Verification Request Needs Attention',
          message: `Your verification request was not approved: ${reason.trim()}`,
          createdAt: new Date().toISOString(),
        },
        unreadCount
      );
    } catch (err) {
      logger.warn('Failed to emit verification rejection notification socket:', err);
    }

    emitToAdmins('verification:reviewed', {
      verificationId,
      userId,
      status: 'rejected',
      reason: reason.trim(),
      adminId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a system announcement to target audience
   */
  public static async broadcastAnnouncement(
    adminId: number,
    title: string,
    message: string,
    audience: 'all' | 'active' | 'verified'
  ): Promise<{ deliveredCount: number }> {
    if (!title || !title.trim()) {
      throw AppError.badRequest('Announcement title is required.');
    }
    if (title.length > 200) {
      throw AppError.badRequest('Announcement title cannot exceed 200 characters.');
    }
    if (!message || !message.trim()) {
      throw AppError.badRequest('Announcement message is required.');
    }
    if (message.length > 2000) {
      throw AppError.badRequest('Announcement message cannot exceed 2000 characters.');
    }
    if (!['all', 'active', 'verified'].includes(audience)) {
      throw AppError.badRequest('Invalid audience specified.');
    }

    const { recipientIds, count } = await AdminModel.broadcastAnnouncement(
      adminId,
      title.trim(),
      message.trim(),
      audience
    );

    // Deliver real-time notifications to online users
    for (const uid of recipientIds) {
      try {
        const unreadCount = await NotificationModel.countUnread(uid);
        emitNotification(
          uid,
          {
            type: 'system_announcement',
            title: title.trim(),
            message: message.trim(),
            createdAt: new Date().toISOString(),
          },
          unreadCount
        );
      } catch {
        // socket delivery best-effort for broadcast
      }
    }

    return { deliveredCount: count };
  }

  /**
   * Get paginated audit logs
   */
  public static async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  }): Promise<{ logs: AdminAuditLogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return AdminModel.getAuditLogs(params);
  }

  /**
   * Get analytics overview metrics
   */
  public static async getAnalyticsOverview(): Promise<any> {
    return AdminModel.getAnalyticsOverview();
  }
}

export default AdminService;
