import { api } from './api';
import type { ApiResponse } from '../types';
import type {
  AdminDashboardStats,
  AdminDateRange,
  AdminUserListItem,
  AdminUserDetail,
  AdminReportListItem,
  AdminVerificationListItem,
  AdminAuditLogItem,
  AdminAnnouncementPayload,
  DetailedSystemHealth,
  SecurityEventItem,
  SupportTicketItem,
  SupportMessageItem,
  SupportStats,
  PlatformSettingItem,
  FeatureFlagItem,
  GlobalSearchResult,
  AdminPaymentTransaction,
} from '../types/admin';

export const adminService = {
  /**
   * Fetch aggregate dashboard statistics and trend metrics
   */
  async getDashboardStats(range: AdminDateRange = '30d'): Promise<AdminDashboardStats> {
    const response = await api.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard/stats', {
      params: { range },
    });
    return response.data.data!;
  },

  /**
   * Fetch paginated users directory
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    verification?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ users: AdminUserListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ users: AdminUserListItem[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/users', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Fetch full user administrative inspection detail
   */
  async getUserDetail(userId: number): Promise<AdminUserDetail> {
    const response = await api.get<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`);
    return response.data.data!;
  },

  /**
   * Suspend user account with optional duration
   */
  async suspendUser(userId: number, reason: string, durationHours?: number | null): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/users/${userId}/suspend`, { reason, durationHours });
  },

  /**
   * Lift user account suspension
   */
  async unsuspendUser(userId: number, reason?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/users/${userId}/unsuspend`, { reason });
  },

  /**
   * Permanently ban user account
   */
  async banUser(userId: number, reason: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/users/${userId}/ban`, { reason });
  },

  /**
   * Remove ban from user account
   */
  async unbanUser(userId: number, reason?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/users/${userId}/unban`, { reason });
  },

  /**
   * Invalidate all sessions of a user
   */
  async resetSessions(userId: number, reason?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/users/${userId}/reset-sessions`, { reason });
  },

  /**
   * Fetch paginated reports
   */
  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ reports: AdminReportListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ reports: AdminReportListItem[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/reports', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Fetch single report detail
   */
  async getReportDetail(reportId: number): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/admin/reports/${reportId}`);
    return response.data.data;
  },

  /**
   * Update report status (e.g. to under_review)
   */
  async updateReportStatus(reportId: number, status: 'pending' | 'under_review'): Promise<void> {
    await api.patch<ApiResponse<void>>(`/admin/reports/${reportId}/status`, { status });
  },

  /**
   * Resolve a report with specific administrative action
   */
  async resolveReport(
    reportId: number,
    data: {
      action: 'dismiss' | 'warn' | 'suspend' | 'ban';
      resolutionNotes: string;
      warningMessage?: string;
    }
  ): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/reports/${reportId}/resolve`, data);
  },

  /**
   * Fetch paginated verification requests
   */
  async getVerifications(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ verifications: AdminVerificationListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ verifications: AdminVerificationListItem[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/verifications', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Fetch single verification request details
   */
  async getVerificationDetail(verificationId: number): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/admin/verifications/${verificationId}`);
    return response.data.data;
  },

  /**
   * Approve a verification request
   */
  async approveVerification(verificationId: number, adminNotes?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/verifications/${verificationId}/approve`, { adminNotes });
  },

  /**
   * Reject a verification request with reason
   */
  async rejectVerification(verificationId: number, reason: string, adminNotes?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/admin/verifications/${verificationId}/reject`, { reason, adminNotes });
  },

  /**
   * Broadcast an administrative announcement
   */
  async broadcastAnnouncement(payload: AdminAnnouncementPayload): Promise<{ deliveredCount: number }> {
    const response = await api.post<ApiResponse<{ deliveredCount: number }>>('/admin/notifications/broadcast', payload);
    return response.data.data!;
  },

  /**
   * Fetch paginated audit logs
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  }): Promise<{ logs: AdminAuditLogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ logs: AdminAuditLogItem[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/audit-logs', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Fetch platform analytics overview
   */
  async getAnalyticsOverview(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/admin/analytics/overview');
    return response.data.data;
  },

  /**
   * Day 27: Fetch live system health telemetry & subsystem metrics
   */
  async getSystemHealth(): Promise<DetailedSystemHealth> {
    const response = await api.get<ApiResponse<DetailedSystemHealth>>('/admin/health');
    return response.data.data!;
  },

  /**
   * Day 27: Fetch security audit trail with filtering & pagination
   */
  async getSecurityEvents(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
    userId?: number;
  }): Promise<{ events: SecurityEventItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ events: SecurityEventItem[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/security/events', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Day 28: Update user authorization role
   */
  async updateUserRole(userId: number, role: 'user' | 'moderator' | 'admin'): Promise<void> {
    await api.patch<ApiResponse<void>>(`/admin/users/${userId}/role`, { role });
  },

  // ==========================================
  // DAY 28: SUPPORT CENTER OPERATIONS
  // ==========================================

  /**
   * Get aggregate support desk statistics
   */
  async getSupportStats(): Promise<SupportStats> {
    const response = await api.get<ApiResponse<SupportStats>>('/admin/support/stats');
    const raw = response.data?.data || (response.data as any) || {};
    return {
      openTickets: Number(raw.openTickets || 0),
      inProgressTickets: Number(raw.inProgressTickets || 0),
      resolvedTickets: Number(raw.resolvedTickets || 0),
      urgentTickets: Number(raw.urgentTickets || raw.urgentOpenTickets || 0),
      urgentOpenTickets: Number(raw.urgentOpenTickets || 0),
      waitingTickets: Number(raw.waitingTickets || 0),
      closedTickets: Number(raw.closedTickets || 0),
      totalTickets: Number(raw.totalTickets || 0),
      avgResolutionHours: Number(raw.avgResolutionHours || 0),
    };
  },

  /**
   * List paginated support tickets with filtering
   */
  async getSupportTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    assignedTo?: number;
  }): Promise<{ tickets: SupportTicketItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ tickets: SupportTicketItem[]; total: number; page: number; limit: number; totalPages: number }>>(
      '/admin/support/tickets',
      { params }
    );
    const data = response.data?.data;
    if (data && Array.isArray(data.tickets)) {
      return {
        tickets: data.tickets,
        total: Number(data.total || data.tickets.length),
        page: Number(data.page || params.page || 1),
        limit: Number(data.limit || params.limit || 20),
        totalPages: Number(data.totalPages || 1),
      };
    }
    if (Array.isArray(data)) {
      return {
        tickets: data,
        total: data.length,
        page: Number(params.page || 1),
        limit: Number(params.limit || 20),
        totalPages: 1,
      };
    }
    return {
      tickets: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
  },

  /**
   * View support ticket detail and thread
   */
  async getSupportTicketDetail(ticketId: number): Promise<{ ticket: SupportTicketItem; messages: SupportMessageItem[] }> {
    const response = await api.get<ApiResponse<{ ticket: SupportTicketItem; messages: SupportMessageItem[] }>>(
      `/admin/support/tickets/${ticketId}`
    );
    const data = response.data?.data;
    return {
      ticket: data?.ticket as SupportTicketItem,
      messages: Array.isArray(data?.messages) ? data.messages : [],
    };
  },

  /**
   * Post reply or internal staff note on ticket
   */
  async replySupportTicket(ticketId: number, message: string, isInternalNote = false): Promise<SupportMessageItem> {
    const response = await api.post<ApiResponse<SupportMessageItem>>(`/admin/support/tickets/${ticketId}/reply`, {
      message,
      isInternalNote,
    });
    return response.data.data!;
  },

  /**
   * Update support ticket status & resolution notes
   */
  async updateSupportTicketStatus(ticketId: number, status: string, resolutionNotes?: string): Promise<SupportTicketItem> {
    const response = await api.patch<ApiResponse<SupportTicketItem>>(`/admin/support/tickets/${ticketId}/status`, {
      status,
      resolutionNotes,
    });
    return response.data.data!;
  },

  /**
   * Assign support ticket to staff member
   */
  async assignSupportTicket(ticketId: number, assignedTo: number | null): Promise<SupportTicketItem> {
    const response = await api.patch<ApiResponse<SupportTicketItem>>(`/admin/support/tickets/${ticketId}/assign`, {
      assignedTo,
    });
    return response.data.data!;
  },

  // ==========================================
  // DAY 28: PLATFORM SETTINGS & FLAGS
  // ==========================================

  /**
   * Fetch all operational platform settings
   */
  async getPlatformSettings(): Promise<PlatformSettingItem[]> {
    const response = await api.get<ApiResponse<PlatformSettingItem[]>>('/admin/settings');
    return response.data.data!;
  },

  /**
   * Update single platform configuration setting
   */
  async updatePlatformSetting(key: string, value: string): Promise<PlatformSettingItem> {
    const response = await api.put<ApiResponse<PlatformSettingItem>>(`/admin/settings/${key}`, { value });
    return response.data.data!;
  },

  /**
   * Fetch dynamic feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlagItem[]> {
    const response = await api.get<ApiResponse<FeatureFlagItem[]>>('/admin/features');
    return response.data.data!;
  },

  /**
   * Toggle feature flag ON/OFF
   */
  async toggleFeatureFlag(key: string, isEnabled: boolean): Promise<void> {
    await api.patch<ApiResponse<void>>(`/admin/features/${key}/toggle`, { isEnabled });
  },

  /**
   * Update feature flag rollout and metadata
   */
  async updateFeatureFlag(
    key: string,
    data: { name?: string; description?: string; isEnabled?: boolean; rolloutPercentage?: number }
  ): Promise<void> {
    await api.patch<ApiResponse<void>>(`/admin/features/${key}`, data);
  },

  // ==========================================
  // DAY 28: GLOBAL ADMIN SEARCH
  // ==========================================

  /**
   * Execute real-time multi-entity search across Users, Reports, Tickets, Payments
   */
  async globalSearch(q: string): Promise<GlobalSearchResult> {
    const response = await api.get<ApiResponse<GlobalSearchResult>>('/admin/search', {
      params: { q },
    });
    return response.data.data!;
  },

  // ==========================================
  // DAY 28: PAYMENTS & SUBSCRIPTIONS
  // ==========================================

  /**
   * Fetch paginated payment transactions
   */
  async getPaymentTransactions(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ transactions: AdminPaymentTransaction[]; total: number; page: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ transactions: AdminPaymentTransaction[]; total: number; page: number; totalPages: number }>>(
      '/admin/payments/transactions',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Refund payment transaction and reconcile subscription status
   */
  async refundTransaction(transactionId: number, reason: string): Promise<{ transactionId: number; amount: number; currency: string; status: string }> {
    const response = await api.post<ApiResponse<{ transactionId: number; amount: number; currency: string; status: string }>>(
      `/admin/payments/transactions/${transactionId}/refund`,
      { reason }
    );
    return response.data.data!;
  },

  /**
   * Fetch paginated subscribers list
   */
  async getSubscribers(params: {
    page?: number;
    limit?: number;
    status?: string;
    planCode?: string;
    search?: string;
  }): Promise<{ subscribers: any[]; total: number; page: number; totalPages: number }> {
    const response = await api.get<ApiResponse<{ subscribers: any[]; total: number; page: number; totalPages: number }>>(
      '/admin/subscriptions',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Fetch all subscription plans
   */
  async getSubscriptionPlans(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/admin/subscriptions/plans');
    return response.data.data!;
  },

  /**
   * Update subscription tier configuration
   */
  async updateSubscriptionPlan(planId: number, data: any): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/admin/subscriptions/plans/${planId}`, data);
    return response.data.data!;
  },
};

export default adminService;
