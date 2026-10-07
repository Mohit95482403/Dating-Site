import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AdminController } from '../controllers/admin.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { PersonalizationController } from '../controllers/personalization.controller';
import { SupportController } from '../controllers/support.controller';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

// Strict security: Every endpoint requires valid JWT authentication AND Admin role
router.use(requireAuth);
router.use(requireRole('admin'));

// 1. Dashboard Statistics & Trend Charts
router.get('/dashboard/stats', asyncHandler(AdminController.getDashboardStats as any));

// 2. Global Unified Search (Users, Reports, Tickets, Payments)
router.get('/search', asyncHandler(SettingsController.globalAdminSearch as any));

// 3. User Directory & Inspection
router.get('/users', asyncHandler(AdminController.getUsers as any));
router.get('/users/:userId', asyncHandler(AdminController.getUserDetail as any));
router.patch('/users/:userId/role', asyncHandler(AdminController.updateUserRole as any));

// 4. User Moderation Actions
router.post('/users/:userId/suspend', asyncHandler(AdminController.suspendUser as any));
router.post('/users/:userId/unsuspend', asyncHandler(AdminController.unsuspendUser as any));
router.post('/users/:userId/ban', asyncHandler(AdminController.banUser as any));
router.post('/users/:userId/unban', asyncHandler(AdminController.unbanUser as any));
router.post('/users/:userId/reset-sessions', asyncHandler(AdminController.resetSessions as any));

// 5. Reports Management & Resolution Workflow
router.get('/reports', asyncHandler(AdminController.getReports as any));
router.get('/reports/:reportId', asyncHandler(AdminController.getReportDetail as any));
router.patch('/reports/:reportId/status', asyncHandler(AdminController.updateReportStatus as any));
router.post('/reports/:reportId/resolve', asyncHandler(AdminController.resolveReport as any));

// 6. User Support Ticket Management
router.get('/support/stats', asyncHandler(SupportController.getSupportStats as any));
router.get('/support/tickets', asyncHandler(SupportController.getAdminTickets as any));
router.get('/support/tickets/:id', asyncHandler(SupportController.getTicketDetail as any));
router.post('/support/tickets/:id/reply', asyncHandler(SupportController.replyTicket as any));
router.patch('/support/tickets/:id/status', asyncHandler(SupportController.updateTicketStatus as any));
router.patch('/support/tickets/:id/assign', asyncHandler(SupportController.assignTicket as any));

// 7. Identity Verification Review
router.get('/verifications', asyncHandler(AdminController.getVerifications as any));
router.get('/verifications/:verificationId', asyncHandler(AdminController.getVerificationDetail as any));
router.post('/verifications/:verificationId/approve', asyncHandler(AdminController.approveVerification as any));
router.post('/verifications/:verificationId/reject', asyncHandler(AdminController.rejectVerification as any));

// 8. Payment & Subscription Operations
router.get('/payments/transactions', asyncHandler(AdminController.getTransactions as any));
router.post('/payments/transactions/:transactionId/refund', asyncHandler(AdminController.refundTransaction as any));
router.get('/subscriptions', asyncHandler(AdminController.getSubscriptions as any));
router.get('/subscriptions/plans', asyncHandler(AdminController.getPlans as any));
router.put('/subscriptions/plans/:planId', asyncHandler(AdminController.updatePlan as any));

// 9. Platform Operations & Settings
router.get('/settings', asyncHandler(SettingsController.getAllSettings as any));
router.put('/settings/:key', asyncHandler(SettingsController.updateSetting as any));

// 10. Dynamic Feature Flags Management
router.get('/features', asyncHandler(SettingsController.getFeatureFlags as any));
router.patch('/features/:key/toggle', asyncHandler(SettingsController.toggleFeatureFlag as any));
router.patch('/features/:key', asyncHandler(SettingsController.updateFeatureFlag as any));

// 11. System Announcement Broadcasting
router.post('/notifications/broadcast', asyncHandler(AdminController.broadcastAnnouncement as any));

// 12. Compliance Audit Logs
router.get('/audit-logs', asyncHandler(AdminController.getAuditLogs as any));

// 13. Platform Analytics Suite
router.get('/analytics/overview', asyncHandler(AnalyticsController.getOverview as any));
router.get('/analytics/users', asyncHandler(AnalyticsController.getUsers as any));
router.get('/analytics/engagement', asyncHandler(AnalyticsController.getEngagement as any));
router.get('/analytics/matching', asyncHandler(AnalyticsController.getMatching as any));
router.get('/analytics/safety', asyncHandler(AnalyticsController.getSafety as any));
router.get('/analytics/retention', asyncHandler(AnalyticsController.getRetention as any));
router.get('/analytics/export', asyncHandler(AnalyticsController.exportCsv as any));

// 14. Recommendation Intelligence & A/B Experiments
router.get('/recommendations', asyncHandler(PersonalizationController.getAdminAnalytics as any));

// 15. System Health & Security Telemetry
router.get('/health', asyncHandler(AdminController.getSystemHealth as any));
router.get('/security/events', asyncHandler(AdminController.getSecurityEvents as any));

export default router;
