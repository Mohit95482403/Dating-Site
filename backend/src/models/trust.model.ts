// Connectly Day 25: Trust, Safety & Anti-Abuse Database Model

import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import {
  TrustSignals,
  SecurityEventItem,
  AccountRestrictionItem,
  VerificationRequestItem,
  UserSubmittedReportItem,
  TrustSafetyAdminOverview,
  DocumentType,
} from '../types/trust.types';

export class TrustModel {
  /**
   * Calculate real trust signals & tier for a user
   */
  public static async getUserTrustSignals(userId: number): Promise<TrustSignals> {
    // 1. Fetch user & profile data
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT u.is_email_verified, u.is_phone_verified, u.created_at,
              p.is_verified, p.is_profile_complete, p.bio, p.occupation, p.location_city
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    const user = userRows[0];
    const isEmailVerified = Boolean(user?.is_email_verified);
    const isPhoneVerified = Boolean(user?.is_phone_verified);
    const isIdentityVerified = Boolean(user?.is_verified);
    const isProfileComplete = Boolean(user?.is_profile_complete);

    // Calculate completion %
    let completedFields = 0;
    const totalFields = 6;
    if (user?.bio) completedFields++;
    if (user?.occupation) completedFields++;
    if (user?.location_city) completedFields++;
    if (isEmailVerified) completedFields++;
    if (isPhoneVerified) completedFields++;
    if (isIdentityVerified) completedFields++;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    // Account age in days
    const createdDate = user?.created_at ? new Date(user.created_at) : new Date();
    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Reports received against user
    const [repRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM reports WHERE reported_user_id = ?`,
      [userId]
    );
    const reportsReceivedCount = Number(repRows[0]?.cnt || 0);

    // Blocks against user
    const [blockRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM blocks WHERE blocked_user_id = ?`,
      [userId]
    );
    const blocksAgainstCount = Number(blockRows[0]?.cnt || 0);

    // Active restrictions
    const [restRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM account_restrictions WHERE user_id = ? AND is_active = TRUE`,
      [userId]
    );
    const activeRestrictionsCount = Number(restRows[0]?.cnt || 0);

    // Determine trust tier
    let trustTier: TrustSignals['trustTier'] = 'standard';
    if (activeRestrictionsCount > 0) {
      trustTier = 'restricted';
    } else if (reportsReceivedCount >= 3 || blocksAgainstCount >= 5) {
      trustTier = 'under_review';
    } else if (isIdentityVerified && isEmailVerified && accountAgeDays >= 3) {
      trustTier = 'trusted';
    } else if (isIdentityVerified || (isEmailVerified && isPhoneVerified)) {
      trustTier = 'verified';
    }

    return {
      isEmailVerified,
      isPhoneVerified,
      isIdentityVerified,
      isProfileComplete,
      completionPercentage,
      accountAgeDays,
      reportsReceivedCount,
      blocksAgainstCount,
      activeRestrictionsCount,
      trustTier,
    };
  }

  /**
   * Log an account security event
   */
  public static async logSecurityEvent(
    userId: number,
    eventType: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    details?: any
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_security_events (user_id, event_type, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, eventType, ipAddress || null, userAgent || null, details ? JSON.stringify(details) : null]
    );
  }

  /**
   * Get recent security events for a user
   */
  public static async getSecurityEvents(userId: number, limit = 15): Promise<SecurityEventItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, event_type, ip_address, user_agent, details, created_at
       FROM user_security_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      eventType: r.event_type,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Alias for getSecurityEvents
   */
  public static async getUserSecurityEvents(userId: number, limit = 15): Promise<SecurityEventItem[]> {
    return this.getSecurityEvents(userId, limit);
  }

  /**
   * Create account restriction
   */
  public static async createRestriction(
    userId: number,
    restrictionType: string,
    reason: string,
    issuedBy?: number | null,
    durationHours?: number | null
  ): Promise<number> {
    const hours = durationHours ? Number(durationHours) : null;
    const [res] = await pool.query(
      `INSERT INTO account_restrictions (user_id, restriction_type, reason, issued_by, expires_at, is_active)
       VALUES (?, ?, ?, ?, IF(? IS NOT NULL, DATE_ADD(NOW(), INTERVAL ? HOUR), NULL), TRUE)`,
      [userId, restrictionType, reason, issuedBy || null, hours, hours]
    );

    return (res as any).insertId;
  }

  /**
   * Fetch active restrictions for a user
   */
  public static async getActiveRestrictions(userId: number): Promise<AccountRestrictionItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ar.*, u.email as issuer_email
       FROM account_restrictions ar
       LEFT JOIN users u ON u.id = ar.issued_by
       WHERE ar.user_id = ? 
         AND ar.is_active = TRUE
         AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
       ORDER BY ar.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      restrictionType: r.restriction_type,
      reason: r.reason,
      issuedBy: r.issued_by,
      issuerName: r.issuer_email || undefined,
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Revoke an account restriction
   */
  public static async revokeRestriction(restrictionId: number): Promise<void> {
    await pool.query(
      `UPDATE account_restrictions SET is_active = FALSE WHERE id = ?`,
      [restrictionId]
    );
  }

  /**
   * Submit or replace identity verification request
   */
  public static async submitVerification(
    userId: number,
    documentType: DocumentType,
    documentUrl: string,
    selfieUrl?: string
  ): Promise<number> {
    const [res] = await pool.query(
      `INSERT INTO verification_requests (user_id, document_type, document_url, selfie_url, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, documentType, documentUrl, selfieUrl || documentUrl]
    );

    const verifId = (res as any).insertId;

    await pool.query(
      `INSERT INTO verification_audit_logs (verification_id, actor_id, action, details)
       VALUES (?, ?, 'SUBMITTED', 'Identity verification document uploaded by user')`,
      [verifId, userId]
    );

    return verifId;
  }

  /**
   * Fetch latest verification for a user
   */
  public static async getLatestVerification(userId: number): Promise<VerificationRequestItem | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT vr.*, u.email as reviewer_email
       FROM verification_requests vr
       LEFT JOIN users u ON u.id = vr.reviewed_by
       WHERE vr.user_id = ?
       ORDER BY vr.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      userId: r.user_id,
      documentType: r.document_type || 'national_id',
      documentUrl: r.document_url,
      selfieUrl: r.selfie_url,
      status: r.status,
      rejectionReason: r.rejection_reason,
      adminNotes: r.admin_notes,
      reviewedBy: r.reviewed_by,
      reviewerName: r.reviewer_email || undefined,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  /**
   * Save 2FA setup secret
   */
  public static async saveTwoFactorSecret(
    userId: number,
    secret: string,
    recoveryCodes: string[]
  ): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET two_factor_secret = ?, two_factor_recovery_codes = ? 
       WHERE id = ?`,
      [secret, JSON.stringify(recoveryCodes), userId]
    );
  }

  /**
   * Enable 2FA for a user
   */
  public static async enableTwoFactor(userId: number): Promise<void> {
    await pool.query(`UPDATE users SET two_factor_enabled = TRUE WHERE id = ?`, [userId]);
  }

  /**
   * Disable 2FA for a user
   */
  public static async disableTwoFactor(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET two_factor_enabled = FALSE, two_factor_secret = NULL, two_factor_recovery_codes = NULL 
       WHERE id = ?`,
      [userId]
    );
  }

  /**
   * Get user 2FA and phone details
   */
  public static async getUserSecurityDetails(userId: number): Promise<{
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    recoveryCodes: string[];
    isPhoneVerified: boolean;
    phoneNumber: string | null;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT two_factor_enabled, two_factor_secret, two_factor_recovery_codes, is_phone_verified, phone_number
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const r = rows[0];
    let recoveryCodes: string[] = [];
    try {
      if (r?.two_factor_recovery_codes) {
        recoveryCodes = JSON.parse(r.two_factor_recovery_codes);
      }
    } catch {}

    return {
      twoFactorEnabled: Boolean(r?.two_factor_enabled),
      twoFactorSecret: r?.two_factor_secret || null,
      recoveryCodes,
      isPhoneVerified: Boolean(r?.is_phone_verified),
      phoneNumber: r?.phone_number || null,
    };
  }

  /**
   * Store email verification token
   */
  public static async setEmailVerificationToken(
    userId: number,
    token: string,
    _expiresAt?: Date
  ): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET email_verification_token = ?, email_verification_expires = DATE_ADD(NOW(), INTERVAL 24 HOUR) 
       WHERE id = ?`,
      [token, userId]
    );
  }

  /**
   * Verify email token
   */
  public static async verifyEmailToken(userId: number, token: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users 
       WHERE id = ? 
         AND email_verification_token = ? 
         AND (email_verification_expires > NOW() OR email_verification_expires IS NULL)
       LIMIT 1`,
      [userId, token]
    );

    if (rows.length === 0) return false;

    await pool.query(
      `UPDATE users 
       SET is_email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL 
       WHERE id = ?`,
      [userId]
    );
    return true;
  }

  /**
   * Store phone OTP
   */
  public static async setPhoneOtp(
    userId: number,
    phone: string,
    otpHash: string,
    _expiresAt?: Date
  ): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET phone_number = ?, phone_otp_hash = ?, phone_otp_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
       WHERE id = ?`,
      [phone, otpHash, userId]
    );
  }

  /**
   * Fetch phone OTP details
   */
  public static async getPhoneOtpDetails(userId: number): Promise<{
    phone: string | null;
    otpHash: string | null;
    isExpired: boolean;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT phone_number, phone_otp_hash, 
              (phone_otp_expires IS NOT NULL AND phone_otp_expires < NOW()) as is_expired 
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const r = rows[0];

    return {
      phone: r?.phone_number || null,
      otpHash: r?.phone_otp_hash || null,
      isExpired: Boolean(r?.is_expired),
    };
  }

  /**
   * Mark phone as verified
   */
  public static async markPhoneVerified(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET is_phone_verified = TRUE, phone_otp_hash = NULL, phone_otp_expires = NULL 
       WHERE id = ?`,
      [userId]
    );
  }

  /**
   * Get user submitted reports history
   */
  public static async getUserReports(reporterId: number, limit = 20): Promise<UserSubmittedReportItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, 'user' as target_type, r.reported_user_id as target_id, r.reason, r.description as details, r.status, r.created_at, u.username as target_name
       FROM reports r
       LEFT JOIN users u ON r.reported_user_id = u.id
       WHERE r.reporter_id = ?
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [reporterId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      targetType: r.target_type || 'user',
      targetId: r.target_id || 0,
      targetName: r.target_name || `User #${r.target_id}`,
      reason: r.reason,
      details: r.details,
      status: r.status || 'pending',
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Get Trust & Safety admin overview metrics
   */
  public static async getAdminTrustOverview(): Promise<TrustSafetyAdminOverview> {
    const [pendingV] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM verification_requests WHERE status = 'pending'`
    );
    const [approvedV] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM verification_requests WHERE status = 'approved'`
    );
    const [rejectedV] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM verification_requests WHERE status = 'rejected'`
    );
    const [activeR] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM account_restrictions WHERE is_active = TRUE`
    );
    const [recentSec] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM user_security_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const [repToday] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM reports WHERE created_at >= CURDATE()`
    );

    const [restrictionsRows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.username as issuer_name
       FROM account_restrictions r
       LEFT JOIN users u ON r.issued_by = u.id
       WHERE r.is_active = TRUE
       ORDER BY r.created_at DESC
       LIMIT 50`
    );

    return {
      metrics: {
        pendingVerifications: Number(pendingV[0]?.cnt || 0),
        verifiedUsers: Number(approvedV[0]?.cnt || 0),
        rejectedVerifications: Number(rejectedV[0]?.cnt || 0),
        restrictedAccounts: Number(activeR[0]?.cnt || 0),
        securityEventsRecorded: Number(recentSec[0]?.cnt || 0),
        reportsToday: Number(repToday[0]?.cnt || 0),
      },
      activeRestrictions: restrictionsRows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        restrictionType: r.restriction_type,
        reason: r.reason,
        issuedBy: r.issued_by,
        issuerName: r.issuer_name || undefined,
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        isActive: Boolean(r.is_active),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  }
}
