import { execute } from '../config/database';

export class ReportService {
  public static async createReport(reporterId: number, reportedUserId: number, reason: string, description?: string) {
    return await execute(
      'INSERT INTO reports (reporter_id, reported_user_id, reason, description) VALUES (?, ?, ?, ?)',
      [reporterId, reportedUserId, reason, description || null]
    );
  }
}

export default ReportService;
