import { Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { AdminService } from '../services/admin.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import { AdminDateRange } from '../types/admin.types';

import { HealthService } from '../services/health.service';
import { AuditService } from '../services/audit.service';
import { SubscriptionService } from '../services/subscription.service';

export class AdminController {
  /**
   * GET /api/admin/dashboard/stats
   */
  public static getDashboardStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const range = (req.query.range as AdminDateRange) || '30d';
    const stats = await AdminService.getDashboardStats(range);
    ApiResponse.success(res, 'Dashboard statistics fetched successfully', stats);
  };

  /**
   * GET /api/admin/users
   */
  public static getUsers = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const verification = req.query.verification as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';

    const result = await AdminService.getUsers({
      page,
      limit,
      search,
      status,
      verification,
      sortBy,
      sortOrder,
    });

    ApiResponse.success(res, 'Users fetched successfully', result);
  };

  /**
   * GET /api/admin/users/:userId
   */
  public static getUserDetail = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }

    const detail = await AdminService.getUserDetail(userId);
    ApiResponse.success(res, 'User detail fetched successfully', detail);
  };

  /**
   * POST /api/admin/users/:userId/suspend
   */
  public static suspendUser = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { reason, durationHours } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw AppError.badRequest('A valid reason for suspension is required.');
    }

    const duration = durationHours ? Number(durationHours) : null;
    await AdminService.suspendUser(adminId, userId, reason, duration);
    ApiResponse.success(res, 'User suspended successfully', { userId, status: 'suspended', durationHours: duration });
  };

  /**
   * POST /api/admin/users/:userId/unsuspend
   */
  public static unsuspendUser = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }

    await AdminService.unsuspendUser(adminId, userId, reason);
    ApiResponse.success(res, 'User suspension lifted successfully', { userId, status: 'active' });
  };

  /**
   * POST /api/admin/users/:userId/ban
   */
  public static banUser = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw AppError.badRequest('A valid reason for banning is required.');
    }

    await AdminService.banUser(adminId, userId, reason);
    ApiResponse.success(res, 'User banned permanently', { userId, status: 'banned' });
  };

  /**
   * POST /api/admin/users/:userId/unban
   */
  public static unbanUser = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }

    await AdminService.unbanUser(adminId, userId, reason);
    ApiResponse.success(res, 'User ban lifted successfully', { userId, status: 'active' });
  };

  /**
   * POST /api/admin/users/:userId/reset-sessions
   */
  public static resetSessions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }

    await AdminService.resetSessions(adminId, userId, reason);
    ApiResponse.success(res, 'User sessions revoked successfully', { userId });
  };

  /**
   * GET /api/admin/reports
   */
  public static getReports = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await AdminService.getReports({ page, limit, status, search });
    ApiResponse.success(res, 'Reports fetched successfully', result);
  };

  /**
   * GET /api/admin/reports/:reportId
   */
  public static getReportDetail = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId) || reportId <= 0) {
      throw AppError.badRequest('Invalid report ID.');
    }

    const report = await AdminService.getReportDetail(reportId);
    ApiResponse.success(res, 'Report detail fetched successfully', report);
  };

  /**
   * PATCH /api/admin/reports/:reportId/status
   */
  public static updateReportStatus = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const reportId = parseInt(req.params.reportId, 10);
    const { status } = req.body;

    if (isNaN(reportId) || reportId <= 0) {
      throw AppError.badRequest('Invalid report ID.');
    }
    if (!['pending', 'under_review'].includes(status)) {
      throw AppError.badRequest("Status must be either 'pending' or 'under_review'.");
    }

    await AdminService.updateReportStatus(reportId, status);
    ApiResponse.success(res, 'Report status updated', { reportId, status });
  };

  /**
   * POST /api/admin/reports/:reportId/resolve
   */
  public static resolveReport = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const reportId = parseInt(req.params.reportId, 10);
    const { action, resolutionNotes, warningMessage } = req.body;

    if (isNaN(reportId) || reportId <= 0) {
      throw AppError.badRequest('Invalid report ID.');
    }
    if (!['dismiss', 'warn', 'suspend', 'ban'].includes(action)) {
      throw AppError.badRequest("Action must be one of: 'dismiss', 'warn', 'suspend', 'ban'.");
    }
    if (!resolutionNotes || typeof resolutionNotes !== 'string' || !resolutionNotes.trim()) {
      throw AppError.badRequest('Resolution notes are required.');
    }

    await AdminService.resolveReport({
      reportId,
      adminId,
      action,
      resolutionNotes: resolutionNotes.trim(),
      warningMessage,
    });

    ApiResponse.success(res, 'Report resolved successfully', { reportId, action });
  };

  /**
   * GET /api/admin/verifications
   */
  public static getVerifications = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await AdminService.getVerifications({ page, limit, status, search });
    ApiResponse.success(res, 'Verification submissions fetched successfully', result);
  };

  /**
   * GET /api/admin/verifications/:verificationId
   */
  public static getVerificationDetail = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const verificationId = parseInt(req.params.verificationId, 10);
    if (isNaN(verificationId) || verificationId <= 0) {
      throw AppError.badRequest('Invalid verification ID.');
    }

    const detail = await AdminService.getVerificationDetail(verificationId);
    ApiResponse.success(res, 'Verification detail fetched successfully', detail);
  };

  /**
   * POST /api/admin/verifications/:verificationId/approve
   */
  public static approveVerification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const verificationId = parseInt(req.params.verificationId, 10);
    const { adminNotes } = req.body;

    if (isNaN(verificationId) || verificationId <= 0) {
      throw AppError.badRequest('Invalid verification ID.');
    }

    await AdminService.approveVerification(adminId, verificationId, adminNotes);
    ApiResponse.success(res, 'Verification approved successfully', { verificationId, status: 'approved' });
  };

  /**
   * POST /api/admin/verifications/:verificationId/reject
   */
  public static rejectVerification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const verificationId = parseInt(req.params.verificationId, 10);
    const { reason, adminNotes } = req.body;

    if (isNaN(verificationId) || verificationId <= 0) {
      throw AppError.badRequest('Invalid verification ID.');
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw AppError.badRequest('A valid rejection reason is required.');
    }

    await AdminService.rejectVerification(adminId, verificationId, reason, adminNotes);
    ApiResponse.success(res, 'Verification rejected', { verificationId, status: 'rejected' });
  };

  /**
   * POST /api/admin/notifications/broadcast
   */
  public static broadcastAnnouncement = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const { title, message, audience } = req.body;

    const result = await AdminService.broadcastAnnouncement(adminId, title, message, audience);
    ApiResponse.success(
      res,
      `Announcement successfully delivered to ${result.deliveredCount} users`,
      result,
      HttpStatus.CREATED
    );
  };

  /**
   * GET /api/admin/audit-logs
   */
  public static getAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const action = req.query.action as string;
    const search = req.query.search as string;

    const result = await AdminService.getAuditLogs({ page, limit, action, search });
    ApiResponse.success(res, 'Audit logs fetched successfully', result);
  };

  /**
   * GET /api/admin/analytics/overview
   */
  public static getAnalyticsOverview = async (
    _req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const overview = await AdminService.getAnalyticsOverview();
    ApiResponse.success(res, 'Analytics overview fetched successfully', overview);
  };

  /**
   * GET /api/admin/health - Deep system health telemetry & subsystem status
   */
  public static getSystemHealth = async (
    _req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const health = await HealthService.getDetailedHealth();
    ApiResponse.success(res, 'System health telemetry fetched successfully', health);
  };

  /**
   * GET /api/admin/security/events - Filtered security audit trail
   */
  public static getSecurityEvents = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const action = req.query.action as string;
    const search = req.query.search as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

    const result = await AuditService.getSecurityEvents({ page, limit, action, search, userId });
    ApiResponse.success(res, 'Security events fetched successfully', result);
  };

  /**
   * PATCH /api/admin/users/:userId/role - Manage user authorization role
   */
  public static updateUserRole = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId, 10);
    const { role } = req.body;

    if (isNaN(userId) || userId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      throw AppError.badRequest("Role must be 'user', 'moderator', or 'admin'.");
    }

    await AdminService.updateUserRole(adminId, userId, role);
    ApiResponse.success(res, `User role successfully updated to ${role}`, { userId, role });
  };

  /**
   * GET /api/admin/payments/transactions - Paginated payment transactions
   */
  public static getTransactions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await SubscriptionService.getAdminTransactions({ page, limit, status, search });
    ApiResponse.success(res, 'Payment transactions fetched successfully', result);
  };

  /**
   * POST /api/admin/payments/transactions/:transactionId/refund - Reconciled transaction refund
   */
  public static refundTransaction = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const adminId = req.user!.id;
    const transactionId = parseInt(req.params.transactionId, 10);
    const { reason } = req.body;

    if (isNaN(transactionId) || transactionId <= 0) {
      throw AppError.badRequest('Invalid transaction ID parameter.');
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw AppError.badRequest('A refund reason is required for compliance audit.');
    }

    const result = await SubscriptionService.adminRefundTransaction(adminId, transactionId, reason.trim());
    ApiResponse.success(res, 'Transaction successfully refunded and reconciled', result);
  };

  /**
   * GET /api/admin/subscriptions - Platform active & historic subscribers
   */
  public static getSubscriptions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const planCode = req.query.planCode as string;

    const result = await SubscriptionService.getAdminSubscribers({ page, limit, status, planCode });
    ApiResponse.success(res, 'Subscribers list fetched successfully', result);
  };

  /**
   * GET /api/admin/subscriptions/plans - All subscription tiers
   */
  public static getPlans = async (
    _req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const plans = await SubscriptionService.getAllPlans(true);
    ApiResponse.success(res, 'Subscription plans fetched successfully', plans);
  };

  /**
   * PUT /api/admin/subscriptions/plans/:planId - Update subscription tier configuration
   */
  public static updatePlan = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const planId = parseInt(req.params.planId, 10);
    if (isNaN(planId) || planId <= 0) {
      throw AppError.badRequest('Invalid plan ID parameter.');
    }

    const updated = await SubscriptionService.adminUpdatePlan(planId, req.body);
    ApiResponse.success(res, 'Subscription plan updated successfully', updated);
  };
}

export default AdminController;
