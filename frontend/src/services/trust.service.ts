// Connectly Day 25: Trust & Safety API Service

import { api } from './api';
import type {
  TrustSignals,
  VerificationRequestItem,
  TwoFactorSetupResponse,
  SecurityEventItem,
  UserSubmittedReportItem,
  TrustSafetyAdminOverview,
  AccountRestrictionItem,
} from '../types/trust';

export class TrustService {
  /**
   * Fetch Trust Center status and indicators
   */
  public static async getTrustCenter(): Promise<{
    trustSignals: TrustSignals;
    verification: VerificationRequestItem | null;
    security: {
      twoFactorEnabled: boolean;
      isPhoneVerified: boolean;
      phoneNumber: string | null;
    };
    activeRestrictions: AccountRestrictionItem[];
  }> {
    const res = await api.get('/trust/overview');
    return res.data.data;
  }

  /**
   * Submit document verification
   */
  public static async submitVerification(formData: FormData): Promise<{ verificationId: number; status: string }> {
    const res = await api.post('/trust/verification', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  }

  /**
   * Send Email verification token
   */
  public static async sendEmailVerification(): Promise<{ message: string; devToken?: string }> {
    const res = await api.post('/trust/email/send');
    return res.data.data;
  }

  /**
   * Confirm email verification token
   */
  public static async verifyEmail(token: string): Promise<void> {
    await api.post('/trust/email/verify', { token });
  }

  /**
   * Request phone verification OTP
   */
  public static async sendPhoneOtp(phoneNumber: string): Promise<{ message: string; devOtp?: string }> {
    const res = await api.post('/trust/phone/send', { phoneNumber });
    return res.data.data;
  }

  /**
   * Verify phone code
   */
  public static async verifyPhoneOtp(otp: string): Promise<void> {
    await api.post('/trust/phone/verify', { otp });
  }

  /**
   * Initialize 2FA setup
   */
  public static async setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    const res = await api.post('/trust/2fa/setup');
    return res.data.data;
  }

  /**
   * Enable 2FA with authenticator app token
   */
  public static async enableTwoFactor(token: string): Promise<void> {
    await api.post('/trust/2fa/enable', { token });
  }

  /**
   * Disable 2FA
   */
  public static async disableTwoFactor(token: string): Promise<void> {
    await api.post('/trust/2fa/disable', { token });
  }

  /**
   * Fetch account security events
   */
  public static async getSecurityEvents(): Promise<SecurityEventItem[]> {
    const res = await api.get('/trust/security-events');
    return res.data.data || [];
  }

  /**
   * Fetch user submitted reports history
   */
  public static async getUserReports(): Promise<UserSubmittedReportItem[]> {
    const res = await api.get('/trust/reports');
    return res.data.data || [];
  }

  /**
   * Admin: Get Trust & Safety dashboard overview
   */
  public static async getAdminOverview(): Promise<TrustSafetyAdminOverview> {
    const res = await api.get('/trust/admin/overview');
    return res.data.data;
  }

  /**
   * Admin: Issue Account Restriction
   */
  public static async issueRestriction(data: {
    userId: number;
    restrictionType: string;
    reason: string;
    durationHours?: number;
  }): Promise<{ restrictionId: number }> {
    const res = await api.post('/trust/admin/restrictions', data);
    return res.data.data;
  }

  /**
   * Admin: Revoke Account Restriction
   */
  public static async revokeRestriction(id: number): Promise<void> {
    await api.delete(`/trust/admin/restrictions/${id}`);
  }
}
