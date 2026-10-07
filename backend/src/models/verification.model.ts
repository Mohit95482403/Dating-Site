import { query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { VerificationStatus, VerificationStatusResponse } from '../types/profile.types';

export class VerificationModel {
  /**
   * Get the latest verification status for a user
   */
  public static async getVerificationStatus(
    userId: number
  ): Promise<VerificationStatusResponse> {
    // 1. Check profiles.is_verified flag
    const profRows = await query<RowDataPacket[]>(
      'SELECT is_verified FROM profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const isProfileVerified = Boolean(profRows[0]?.is_verified);

    // 2. Query verification_requests for latest request details
    const reqRows = await query<RowDataPacket[]>(
      `SELECT status, document_url, selfie_url, rejection_reason, created_at, reviewed_at
       FROM verification_requests
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (isProfileVerified) {
      return {
        status: 'verified',
        isVerified: true,
        documentUrl: reqRows[0]?.document_url || reqRows[0]?.selfie_url || null,
        rejectionReason: null,
        createdAt: reqRows[0]?.created_at ? new Date(reqRows[0].created_at).toISOString() : null,
        reviewedAt: reqRows[0]?.reviewed_at ? new Date(reqRows[0].reviewed_at).toISOString() : null,
      };
    }

    if (reqRows.length === 0) {
      return {
        status: 'not_verified',
        isVerified: false,
        documentUrl: null,
        rejectionReason: null,
        createdAt: null,
        reviewedAt: null,
      };
    }

    const r = reqRows[0];
    const rawStatus = String(r.status).toLowerCase();
    let status: VerificationStatus = 'not_verified';

    if (rawStatus === 'approved') status = 'verified';
    else if (rawStatus === 'pending') status = 'pending';
    else if (rawStatus === 'rejected') status = 'rejected';

    return {
      status,
      isVerified: status === 'verified',
      documentUrl: r.document_url || r.selfie_url || null,
      rejectionReason: r.rejection_reason || null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
    };
  }

  /**
   * Submit or replace a verification request
   */
  public static async submitVerificationRequest(
    userId: number,
    documentUrl: string
  ): Promise<number> {
    const sql = `
      INSERT INTO verification_requests (user_id, document_url, selfie_url, status)
      VALUES (?, ?, ?, 'pending')
    `;
    const result = await execute(sql, [userId, documentUrl, documentUrl]);
    return result.insertId;
  }

  /**
   * Approve a user verification
   */
  public static async approveVerification(
    userId: number,
    reviewerId: number
  ): Promise<void> {
    await execute(
      `UPDATE verification_requests 
       SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'pending'`,
      [reviewerId, userId]
    );

    await execute('UPDATE profiles SET is_verified = TRUE WHERE user_id = ?', [userId]);
  }

  /**
   * Reject a user verification
   */
  public static async rejectVerification(
    userId: number,
    reviewerId: number,
    reason: string
  ): Promise<void> {
    await execute(
      `UPDATE verification_requests 
       SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
       WHERE user_id = ? AND status = 'pending'`,
      [reviewerId, reason, userId]
    );

    await execute('UPDATE profiles SET is_verified = FALSE WHERE user_id = ?', [userId]);
  }
}

export default VerificationModel;
