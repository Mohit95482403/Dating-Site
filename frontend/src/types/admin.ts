export type AdminDateRange = '7d' | '30d' | '90d' | 'all';

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  newUsers: number;
  totalMatches: number;
  totalMessages: number;
  pendingReports: number;
  pendingVerifications: number;
  verifiedUsers: number;
  dateRange: AdminDateRange;
  charts: {
    labels: string[];
    userGrowth: number[];
    matchGrowth: number[];
    messageGrowth: number[];
    reportGrowth: number[];
  };
  recentActivity: Array<{
    id: number;
    type: 'user_registered' | 'verification_submitted' | 'report_submitted' | 'user_moderated' | 'verification_reviewed' | 'report_resolved';
    title: string;
    description: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export interface AdminUserListItem {
  id: number;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'banned' | 'deleted';
  isEmailVerified: boolean;
  isVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  gender: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  reportsReceivedCount: number;
}

export interface AdminUserDetail {
  account: {
    id: number;
    email: string;
    role: 'user' | 'admin';
    status: 'active' | 'inactive' | 'suspended' | 'banned' | 'deleted';
    isEmailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    lastSeenAt: string | null;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bio: string | null;
    occupation: string | null;
    education: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationCountry: string | null;
    isProfileComplete: boolean;
    isVerified: boolean;
    completionPercentage: number;
    photos: Array<{
      id: number;
      fileUrl: string;
      isPrimary: boolean;
      displayOrder: number;
    }>;
    interests: Array<{
      id: number;
      name: string;
      slug: string;
    }>;
    prompts: Array<{
      id: number;
      promptText: string;
      answerText: string;
      category?: string;
    }>;
  };
  safety: {
    reportsReceived: number;
    reportsSubmitted: number;
    blocksCount: number;
    verificationStatus: 'not_verified' | 'pending' | 'verified' | 'rejected';
    verificationDocumentUrl: string | null;
    recentReports: Array<{
      id: number;
      reporterId: number;
      reporterName: string;
      reason: string;
      status: string;
      createdAt: string;
    }>;
  };
  activity: {
    matchesCount: number;
    messagesSentCount: number;
  };
  moderationHistory: Array<{
    id: number;
    adminId: number;
    adminName: string;
    action: string;
    reason: string;
    createdAt: string;
  }>;
}

export interface AdminReportListItem {
  id: number;
  reporterId: number;
  reporterEmail: string;
  reporterName: string;
  reporterAvatar: string | null;
  reportedUserId: number;
  reportedEmail: string;
  reportedName: string;
  reportedAvatar: string | null;
  reportedStatus: string;
  reportedIsVerified: boolean;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes: string | null;
  resolvedBy: number | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminVerificationListItem {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  documentUrl: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  adminNotes: string | null;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminAnnouncementPayload {
  title: string;
  message: string;
  audience: 'all' | 'active' | 'verified';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubsystemStatusItem {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface DetailedSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  subsystems: {
    api: SubsystemStatusItem;
    database: SubsystemStatusItem;
    socketIo: SubsystemStatusItem;
    storage: SubsystemStatusItem;
    aiService: SubsystemStatusItem;
    paymentService: SubsystemStatusItem;
  };
  metrics: {
    onlineUsers: number;
    dbPoolConnections: {
      total: number;
      free: number;
      queue: number;
    };
    recentSecurityAlerts: number;
  };
}

export interface SecurityEventItem extends AdminAuditLogItem {}

// ==========================================
// DAY 28 ADMIN TYPES
// ==========================================

export interface SupportTicketItem {
  id: number;
  ticketNumber: string;
  userId: number;
  userEmail?: string;
  userName?: string;
  subject: string;
  category: 'account' | 'login' | 'profile' | 'messages' | 'calls' | 'payments' | 'subscription' | 'safety' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  assignedTo: number | null;
  assignedStaffName?: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SupportMessageItem {
  id: number;
  ticketId: number;
  senderId: number;
  senderName?: string;
  senderRole: 'user' | 'moderator' | 'admin';
  isInternalNote: boolean;
  message: string;
  attachments?: any;
  createdAt: string;
}

export interface SupportStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  urgentTickets: number;
  urgentOpenTickets?: number;
  waitingTickets?: number;
  closedTickets?: number;
  totalTickets: number;
  avgResolutionHours: number;
}

export interface PlatformSettingItem {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedBy: number | null;
  updatedByName?: string | null;
  updatedAt: string;
}

export interface FeatureFlagItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  updatedBy: number | null;
  updatedByName?: string | null;
  updatedAt: string;
}

export interface GlobalSearchResult {
  query: string;
  users: Array<{
    id: number;
    email: string;
    role: string;
    status: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  }>;
  reports: Array<{
    id: number;
    reason: string;
    status: string;
    created_at: string;
    reporter_email?: string;
    reported_name?: string;
  }>;
  tickets: Array<{
    id: number;
    ticket_number: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    user_email?: string;
  }>;
  transactions: Array<{
    id: number;
    provider_order_id?: string;
    provider_payment_id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    user_email?: string;
  }>;
}

export interface AdminPaymentTransaction {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  subscriptionId: number | null;
  planId: number;
  planCode: string;
  planName: string;
  provider: string;
  providerPaymentId: string;
  providerOrderId: string | null;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  createdAt: string;
}

