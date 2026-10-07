import { Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { ReportModel, ALLOWED_REPORT_REASONS } from '../models/report.model';
import { UserModel } from '../models/user.model';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class ReportController {
  /**
   * POST /api/reports/profile or POST /api/reports
   * Submit a report against a user profile
   */
  public static reportProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    // 1. Strictly derive reporterId from authenticated JWT
    const reporterId = req.user!.id;

    // 2. Parse target reported user ID
    const rawReportedId =
      req.body.reportedUserId ||
      req.body.reported_user_id ||
      req.body.userId ||
      req.params.userId;
    const reportedUserId = parseInt(rawReportedId, 10);

    if (isNaN(reportedUserId) || reportedUserId <= 0) {
      throw AppError.badRequest('Valid reportedUserId is required.');
    }

    // 3. User cannot report themselves
    if (reporterId === reportedUserId) {
      throw AppError.badRequest('You cannot report your own profile.');
    }

    // 4. Verify reported user exists
    const reportedUser = await UserModel.findById(reportedUserId);
    if (!reportedUser) {
      throw AppError.notFound('The user you are trying to report does not exist.');
    }

    // 5. Validate reason
    const { reason, description } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw AppError.badRequest('A valid reason for reporting is required.');
    }

    const trimmedReason = reason.trim();
    const matchedReason = ALLOWED_REPORT_REASONS.find(
      (r) => r.toLowerCase() === trimmedReason.toLowerCase()
    );
    const finalReason = matchedReason || trimmedReason;

    // 6. Validate description length
    if (description && typeof description === 'string' && description.length > 1000) {
      throw AppError.badRequest('Description cannot exceed 1000 characters.');
    }

    // 7. Prevent uncontrolled duplicate pending reports
    const alreadyReported = await ReportModel.hasRecentReport(
      reporterId,
      reportedUserId,
      finalReason
    );
    if (alreadyReported) {
      ApiResponse.success(
        res,
        'A report for this user with the same reason has already been submitted and is under review.',
        { alreadySubmitted: true },
        HttpStatus.OK
      );
      return;
    }

    // 8. Persist report in MySQL
    const reportId = await ReportModel.createReport(
      reporterId,
      reportedUserId,
      finalReason,
      description
    );

    // Notify online admins via Socket.IO
    try {
      const { emitToAdmins } = await import('../sockets/socket');
      emitToAdmins('report:new', {
        reportId,
        reporterId,
        reportedUserId,
        reason: finalReason,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // non-fatal
    }

    ApiResponse.success(
      res,
      'Thank you. Your report has been submitted for moderation review.',
      { reportId, reportedUserId, reason: finalReason },
      HttpStatus.CREATED
    );
  };
}

export default ReportController;
