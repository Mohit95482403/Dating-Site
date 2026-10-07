// Connectly Day 25: Trust, Safety, Identity Verification, Privacy & Anti-Abuse Types

export type VerificationStatusType = 'not_verified' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

export type DocumentType = 'national_id' | 'passport' | 'drivers_license' | 'other';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'SESSION_REVOKED'
  | 'VERIFICATION_SUBMITTED'
  | 'RESTRICTION_APPLIED'
  | 'RESTRICTION_REVOKED';

export type AccountRestrictionType =
  | 'MESSAGE_RESTRICTED'
  | 'LIKE_RESTRICTED'
  | 'COMMUNITY_RESTRICTED'
  | 'POST_RESTRICTED'
  | 'TEMPORARILY_LOCKED';

export type LocationVisibilityType = 'city_only' | 'approximate' | 'hidden';
export type MessagePermissionsType = 'everyone' | 'matches_only' | 'verified_only';
export type CallPermissionsType = 'matches_only' | 'verified_only' | 'nobody';

export interface TrustSignals {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  isProfileComplete: boolean;
  completionPercentage: number;
  accountAgeDays: number;
  reportsReceivedCount: number;
  blocksAgainstCount: number;
  activeRestrictionsCount: number;
  trustTier: 'trusted' | 'verified' | 'standard' | 'under_review' | 'restricted';
}

export interface SecurityEventItem {
  id: number;
  userId: number;
  eventType: SecurityEventType;
  ipAddress: string | null;
  userAgent: string | null;
  details: any;
  createdAt: string;
}

export interface AccountRestrictionItem {
  id: number;
  userId: number;
  restrictionType: AccountRestrictionType;
  reason: string;
  issuedBy: number | null;
  issuerName?: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface VerificationRequestItem {
  id: number;
  userId: number;
  documentType: DocumentType;
  documentUrl: string;
  selfieUrl: string;
  status: VerificationStatusType;
  rejectionReason: string | null;
  adminNotes: string | null;
  reviewedBy: number | null;
  reviewerName?: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationAuditLogItem {
  id: number;
  verificationId: number;
  actorId: number | null;
  actorName?: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrDataUri: string;
  recoveryCodes: string[];
}

export interface UserSubmittedReportItem {
  id: number;
  targetType: string;
  targetId: number;
  reason: string;
  details: string | null;
  status: 'pending' | 'under_review' | 'action_taken' | 'dismissed' | 'resolved';
  createdAt: string;
}

export interface TrustSafetyAdminOverview {
  metrics: {
    pendingVerifications: number;
    verifiedUsers: number;
    rejectedVerifications: number;
    restrictedAccounts: number;
    securityEventsRecorded: number;
    reportsToday: number;
  };
  activeRestrictions: AccountRestrictionItem[];
}
