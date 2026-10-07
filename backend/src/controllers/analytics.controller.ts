import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { DateRangeFilter, AnalyticsDateRange } from '../types/analytics.types';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';

export class AnalyticsController {
  private static parseDateFilter(req: Request): DateRangeFilter {
    const rawRange = String(req.query.range || '7d').toLowerCase();
    const validRanges: AnalyticsDateRange[] = ['7d', '30d', '90d', '6m', '12m', 'all', 'custom'];
    const range: AnalyticsDateRange = validRanges.includes(rawRange as AnalyticsDateRange)
      ? (rawRange as AnalyticsDateRange)
      : '7d';

    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    return { range, startDate, endDate };
  }

  /**
   * GET /api/admin/analytics/overview
   */
  public static getOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getOverview(filter);
      ApiResponse.success(res, 'Platform analytics overview retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve analytics overview', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/users
   */
  public static getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getUserAnalytics(filter);
      ApiResponse.success(res, 'User growth and retention analytics retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve user analytics', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/engagement
   */
  public static getEngagement = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getEngagementAnalytics(filter);
      ApiResponse.success(res, 'Engagement analytics retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve engagement analytics', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/matching
   */
  public static getMatching = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getMatchingAnalytics(filter);
      ApiResponse.success(res, 'Matching funnel analytics retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve matching analytics', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/safety
   */
  public static getSafety = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getSafetyAnalytics(filter);
      ApiResponse.success(res, 'Safety and moderation analytics retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve safety analytics', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/retention
   */
  public static getRetention = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const data = await AnalyticsService.getRetentionAnalytics(filter);
      ApiResponse.success(res, 'Retention cohort analytics retrieved successfully', data);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to retrieve retention analytics', [], HttpStatus.BAD_REQUEST);
    }
  };

  /**
   * GET /api/admin/analytics/export
   */
  public static exportCsv = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = AnalyticsController.parseDateFilter(req);
      const csvContent = await AnalyticsService.exportAnalyticsCsv(filter);

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `connectly_analytics_${filter.range}_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err: any) {
      ApiResponse.error(res, err?.message || 'Failed to export analytics report', [], HttpStatus.BAD_REQUEST);
    }
  };
}

export default AnalyticsController;
