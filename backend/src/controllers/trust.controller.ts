// Connectly Day 25: Trust, Safety & Anti-Abuse Controller

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { TrustService } from '../services/trust.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class TrustController {
  /**
   * GET /api/trust/overview - User's complete trust & verification status
   */
  public static async getTrustCenter(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = await TrustService.getTrustCenter(userId);
      ApiResponse.success(res, 'Trust Center overview retrieved', data, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/verification - Upload and submit ID document for verification
   */
  public static async submitVerification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { documentType } = req.body;

      let documentUrl = '';
      if (req.file) {
        documentUrl = `/uploads/verifications/user-${userId}/${req.file.filename}`;
      } else if (req.body.documentUrl) {
        documentUrl = req.body.documentUrl;
      }

      if (!documentUrl) {
        throw AppError.badRequest('Identity verification document is required.');
      }

      const id = await TrustService.submitVerification(
        userId,
        documentType || 'national_id',
        documentUrl,
        req.body.selfieUrl
      );

      ApiResponse.success(
        res,
        'Verification request submitted successfully for moderation review.',
        { verificationId: id, status: 'pending' },
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/email/send - Request email verification token
   */
  public static async sendEmailVerification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const email = req.user!.email;
      const result = await TrustService.sendEmailVerification(userId, email);
      ApiResponse.success(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/email/verify - Confirm email verification token
   */
  public static async verifyEmail(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { token } = req.body;
      if (!token) throw AppError.badRequest('Verification token is required.');

      await TrustService.verifyEmail(userId, token);
      ApiResponse.success(res, 'Email address successfully verified! ✓', { isEmailVerified: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/phone/send - Send OTP to phone number
   */
  public static async sendPhoneOtp(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { phoneNumber } = req.body;
      const result = await TrustService.sendPhoneOtp(userId, phoneNumber);
      ApiResponse.success(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/phone/verify - Confirm phone OTP
   */
  public static async verifyPhoneOtp(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { otp } = req.body;
      if (!otp) throw AppError.badRequest('Verification code is required.');

      await TrustService.verifyPhoneOtp(userId, otp);
      ApiResponse.success(res, 'Phone number successfully verified! ✓', { isPhoneVerified: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/2fa/setup - Generate TOTP secret and setup info
   */
  public static async setupTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const email = req.user!.email;
      const data = await TrustService.setupTwoFactor(userId, email);
      ApiResponse.success(res, 'Two-factor setup initialized', data, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/2fa/enable - Enable 2FA with verified code
   */
  public static async enableTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { token } = req.body;
      if (!token) throw AppError.badRequest('Authenticator 6-digit code is required.');

      await TrustService.enableTwoFactor(userId, token);
      ApiResponse.success(res, 'Two-factor authentication successfully enabled! 🛡️', {
        twoFactorEnabled: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/2fa/disable - Disable 2FA
   */
  public static async disableTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { token } = req.body;
      if (!token) throw AppError.badRequest('Verification code or recovery code is required.');

      await TrustService.disableTwoFactor(userId, token);
      ApiResponse.success(res, 'Two-factor authentication has been disabled.', {
        twoFactorEnabled: false,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trust/security-events - Retrieve recent account security activity
   */
  public static async getSecurityEvents(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const events = await TrustService.getSecurityEvents(userId);
      ApiResponse.success(res, 'Security events retrieved', events, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trust/reports - Retrieve reports user has submitted
   */
  public static async getUserReports(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const reports = await TrustService.getUserReports(userId);
      ApiResponse.success(res, 'Submitted reports history retrieved', reports, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trust/admin/overview - Admin Trust & Safety dashboard metrics
   */
  public static async getAdminOverview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.user!.role !== 'admin') {
        throw AppError.forbidden('Admin authorization required.');
      }

      const overview = await TrustService.getAdminTrustOverview();
      ApiResponse.success(res, 'Admin Trust & Safety metrics retrieved', overview, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trust/admin/restrictions - Issue account restriction
   */
  public static async issueRestriction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.user!.role !== 'admin') {
        throw AppError.forbidden('Admin authorization required.');
      }

      const adminId = req.user!.id;
      const { userId, restrictionType, reason, durationHours } = req.body;

      if (!userId || !restrictionType || !reason) {
        throw AppError.badRequest('userId, restrictionType, and reason are required.');
      }

      const id = await TrustService.issueRestriction(
        adminId,
        Number(userId),
        restrictionType,
        reason,
        durationHours ? Number(durationHours) : undefined
      );

      ApiResponse.success(res, 'Account restriction issued', { restrictionId: id }, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/trust/admin/restrictions/:id - Revoke restriction
   */
  public static async revokeRestriction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.user!.role !== 'admin') {
        throw AppError.forbidden('Admin authorization required.');
      }

      const adminId = req.user!.id;
      const restrictionId = Number(req.params.id);
      await TrustService.revokeRestriction(adminId, restrictionId);
      ApiResponse.success(res, 'Restriction revoked successfully', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
