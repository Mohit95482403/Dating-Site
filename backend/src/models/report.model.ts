import { query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

export const ALLOWED_REPORT_REASONS = [
  'Fake profile',
  'Harassment',
  'Spam',
  'Inappropriate content',
  'Scam',
  'Underage',
  'Other',
];

export class ReportModel {
  /**
   * Insert a new user report
   */
  public static async createReport(
    reporterId: number,
    reportedUserId: number,
    reason: string,
    description?: string
  ): Promise<number> {
    if (reporterId === reportedUserId) {
      throw new Error('You cannot report your own account.');
    }

    const sql = `
      INSERT INTO reports (reporter_id, reported_user_id, reason, description, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
    const result = await execute(sql, [
      reporterId,
      reportedUserId,
      reason,
      description?.trim() || null,
    ]);

    return result.insertId;
  }

  /**
   * Check if a reporter recently reported the target user for the same reason
   */
  public static async hasRecentReport(
    reporterId: number,
    reportedUserId: number,
    reason: string
  ): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id FROM reports 
       WHERE reporter_id = ? AND reported_user_id = ? AND reason = ? AND status = 'pending'
       LIMIT 1`,
      [reporterId, reportedUserId, reason]
    );
    return rows.length > 0;
  }
}

export default ReportModel;
