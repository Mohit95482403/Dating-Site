export type AdminDateRange = '7d' | '30d' | '90d' | 'all';

export type UserStatusFilter = 'all' | 'active' | 'suspended' | 'banned';
export type VerificationFilter = 'all' | 'verified' | 'unverified' | 'pending';
export type ReportStatusFilter = 'all' | 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type VerificationStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

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
  role: 'user' | 'moderator' | 'admin';
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
    role: 'user' | 'moderator' | 'admin';
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
