// Connectly Day 25: Trust, Safety & Anti-Abuse Service

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { TrustModel } from '../models/trust.model';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import {
  TrustSignals,
  VerificationRequestItem,
  SecurityEventItem,
  AccountRestrictionItem,
  TwoFactorSetupResponse,
  UserSubmittedReportItem,
  TrustSafetyAdminOverview,
  DocumentType,
} from '../types/trust.types';
import { NotificationService } from './notification.service';

export class TrustService {
  /**
   * RFC 6238 Standard TOTP Implementation (HMAC-SHA1, 30s step, 6 digits)
   */
  private static base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  public static generateBase32Secret(length = 20): string {
    let secret = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      secret += this.base32Chars[bytes[i] % 32];
    }
    return secret;
  }

  private static base32ToBuffer(base32: string): Buffer {
    let bits = '';
    const cleanStr = base32.toUpperCase().replace(/=+$/, '');
    for (const char of cleanStr) {
      const val = this.base32Chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }

  public static generateTotp(secret: string, counterOffset = 0): string {
    const key = this.base32ToBuffer(secret);
    const counter = Math.floor(Date.now() / 30000) + counterOffset;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  public static verifyTotp(secret: string, token: string): boolean {
    const cleanToken = token.trim();
    // Check current step, -1 step, and +1 step to account for clock skew
    for (const offset of [0, -1, 1]) {
      if (this.generateTotp(secret, offset) === cleanToken) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fetch complete Trust Center status for a user
   */
  public static async getTrustCenter(userId: number): Promise<{
    trustSignals: TrustSignals;
    verification: VerificationRequestItem | null;
    security: {
      twoFactorEnabled: boolean;
      isPhoneVerified: boolean;
      phoneNumber: string | null;
    };
    activeRestrictions: AccountRestrictionItem[];
  }> {
    const [trustSignals, verification, security, activeRestrictions] = await Promise.all([
      TrustModel.getUserTrustSignals(userId),
      TrustModel.getLatestVerification(userId),
      TrustModel.getUserSecurityDetails(userId),
      TrustModel.getActiveRestrictions(userId),
    ]);

    return {
      trustSignals,
      verification,
      security: {
        twoFactorEnabled: security.twoFactorEnabled,
        isPhoneVerified: security.isPhoneVerified,
        phoneNumber: security.phoneNumber,
      },
      activeRestrictions,
    };
  }

  /**
   * Submit identity document verification
   */
  public static async submitVerification(
    userId: number,
    documentType: DocumentType,
    documentUrl: string,
    selfieUrl?: string
  ): Promise<number> {
    if (!documentUrl) {
      throw AppError.badRequest('Identity document file is required.');
    }

    const current = await TrustModel.getLatestVerification(userId);
    if (current && current.status === 'pending') {
      throw AppError.badRequest('You already have a verification submission pending review.');
    }

    const id = await TrustModel.submitVerification(userId, documentType, documentUrl, selfieUrl);

    await TrustModel.logSecurityEvent(userId, 'VERIFICATION_SUBMITTED', null, null, {
      verificationId: id,
      documentType,
    });

    return id;
  }

  /**
   * Send Email verification token
   */
  public static async sendEmailVerification(
    userId: number,
    email: string
  ): Promise<{ message: string; devToken?: string }> {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await TrustModel.setEmailVerificationToken(userId, token, expiresAt);
    logger.info(`[TrustService] Email verification token generated for user ${userId}`);

    return {
      message: `Verification link generated for ${email}. Check your inbox.`,
      devToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    };
  }

  /**
   * Confirm email verification token
   */
  public static async verifyEmail(userId: number, token: string): Promise<boolean> {
    const ok = await TrustModel.verifyEmailToken(userId, token.trim());
    if (!ok) {
      throw AppError.badRequest('Invalid or expired verification token.');
    }

    await TrustModel.logSecurityEvent(userId, 'LOGIN_SUCCESS', null, null, {
      action: 'EMAIL_VERIFIED',
    });

    return true;
  }

  /**
   * Send Phone verification OTP (with secure test/dev fallback)
   */
  public static async sendPhoneOtp(
    userId: number,
    phoneNumber: string
  ): Promise<{ message: string; devOtp?: string }> {
    if (!phoneNumber || phoneNumber.length < 8) {
      throw AppError.badRequest('Please provide a valid phone number with country code.');
    }

    // 6 digit numeric code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await TrustModel.setPhoneOtp(userId, phoneNumber.trim(), otpHash, expiresAt);

    logger.info(`[TrustService] Phone OTP dispatched for user ${userId}`);

    return {
      message: `A 6-digit verification code has been sent to ${phoneNumber}.`,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify Phone OTP
   */
  public static async verifyPhoneOtp(userId: number, otp: string): Promise<boolean> {
    const { otpHash, isExpired } = await TrustModel.getPhoneOtpDetails(userId);
    if (!otpHash || isExpired) {
      throw AppError.badRequest('OTP code has expired or is invalid. Please request a new code.');
    }

    const matches = await bcrypt.compare(otp.trim(), otpHash);
    if (!matches) {
      throw AppError.badRequest('Incorrect verification code. Please check and try again.');
    }

    await TrustModel.markPhoneVerified(userId);
    await TrustModel.logSecurityEvent(userId, 'LOGIN_SUCCESS', null, null, {
      action: 'PHONE_VERIFIED',
    });

    return true;
  }

  /**
   * Setup Two-Factor Authentication (generates secret, otpauth URL, and recovery codes)
   */
  public static async setupTwoFactor(
    userId: number,
    userEmail: string
  ): Promise<TwoFactorSetupResponse> {
    const secret = this.generateBase32Secret(20);
    const otpauthUrl = `otpauth://totp/Connectly:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=Connectly&digits=6&period=30`;

    // 8 backup recovery codes
    const recoveryCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      recoveryCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    await TrustModel.saveTwoFactorSecret(userId, secret, recoveryCodes);

    // Minimal base64 SVG mock QR representation
    const qrDataUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23f43f5e" font-family="sans-serif" font-size="14">Connectly 2FA Active</text></svg>`;

    return {
      secret,
      otpauthUrl,
      qrDataUri,
      recoveryCodes,
    };
  }

  /**
   * Enable 2FA after confirming valid code
   */
  public static async enableTwoFactor(userId: number, token: string): Promise<boolean> {
    const details = await TrustModel.getUserSecurityDetails(userId);
    if (!details.twoFactorSecret) {
      throw AppError.badRequest('2FA setup not initiated. Please generate a secret first.');
    }

    const isValid = this.verifyTotp(details.twoFactorSecret, token);
    if (!isValid) {
      throw AppError.badRequest('Invalid authenticator code. Check your device time and try again.');
    }

    await TrustModel.enableTwoFactor(userId);
    await TrustModel.logSecurityEvent(userId, 'TWO_FACTOR_ENABLED');

    NotificationService.createNotification({
      userId,
      type: 'SECURITY_ALERT',
      title: 'Two-Factor Authentication Enabled',
      message: 'Two-factor authentication is now protecting your Connectly account.',
    }).catch(() => {});

    return true;
  }

  /**
   * Disable 2FA with verification
   */
  public static async disableTwoFactor(
    userId: number,
    token: string
  ): Promise<boolean> {
    const details = await TrustModel.getUserSecurityDetails(userId);
    if (!details.twoFactorEnabled || !details.twoFactorSecret) {
      throw AppError.badRequest('Two-factor authentication is not currently enabled.');
    }

    const isValid =
      this.verifyTotp(details.twoFactorSecret, token) ||
      details.recoveryCodes.includes(token.trim().toUpperCase());

    if (!isValid) {
      throw AppError.badRequest('Invalid verification or recovery code.');
    }

    await TrustModel.disableTwoFactor(userId);
    await TrustModel.logSecurityEvent(userId, 'TWO_FACTOR_DISABLED');

    return true;
  }

  /**
   * Get user security events history
   */
  public static async getSecurityEvents(userId: number): Promise<SecurityEventItem[]> {
    return TrustModel.getSecurityEvents(userId, 20);
  }

  /**
   * Get user submitted reports history
   */
  public static async getUserReports(userId: number): Promise<UserSubmittedReportItem[]> {
    return TrustModel.getUserReports(userId, 25);
  }

  /**
   * Admin Trust & Safety dashboard overview
   */
  public static async getAdminTrustOverview(): Promise<TrustSafetyAdminOverview> {
    return TrustModel.getAdminTrustOverview();
  }

  /**
   * Admin: Issue Account Restriction
   */
  public static async issueRestriction(
    adminId: number,
    targetUserId: number,
    restrictionType: any,
    reason: string,
    durationHours?: number
  ): Promise<number> {
    const id = await TrustModel.createRestriction(
      targetUserId,
      restrictionType,
      reason,
      adminId,
      durationHours || null
    );

    await TrustModel.logSecurityEvent(targetUserId, 'RESTRICTION_APPLIED', null, null, {
      restrictionId: id,
      restrictionType,
      reason,
      adminId,
    });

    NotificationService.createNotification({
      userId: targetUserId,
      type: 'ACCOUNT_RESTRICTION',
      title: 'Account Safety Notice',
      message: `Your account has received a temporary restriction (${restrictionType}): ${reason}`,
    }).catch(() => {});

    return id;
  }

  /**
   * Admin: Revoke Account Restriction
   */
  public static async revokeRestriction(
    adminId: number,
    restrictionId: number
  ): Promise<void> {
    await TrustModel.revokeRestriction(restrictionId);
    logger.info(`[TrustService] Restriction ${restrictionId} revoked by admin ${adminId}`);
  }
}
