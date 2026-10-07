import { api } from './api';
import type { ApiResponse } from '../types';
import type {
  AnalyticsOverviewPayload,
  DateRangeFilter,
  UserGrowthData,
  EngagementData,
  MatchingFunnelData,
  SafetyAnalyticsData,
  RetentionCohortData,
} from '../types/analytics';

export const analyticsService = {
  /**
   * Fetch complete platform analytics overview with all KPIs, charts, and insights
   */
  async getOverview(filter?: DateRangeFilter): Promise<AnalyticsOverviewPayload> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<AnalyticsOverviewPayload>>('/admin/analytics/overview', { params });
    return res.data.data!;
  },

  /**
   * Fetch user growth, DAU/WAU/MAU and retention telemetry
   */
  async getUsersAnalytics(filter?: DateRangeFilter): Promise<{
    growth: UserGrowthData;
    activeUsers: { dau: number; wau: number; mau: number };
    retention: RetentionCohortData;
  }> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<any>>('/admin/analytics/users', { params });
    return res.data.data!;
  },

  /**
   * Fetch engagement time series
   */
  async getEngagementAnalytics(filter?: DateRangeFilter): Promise<EngagementData> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<EngagementData>>('/admin/analytics/engagement', { params });
    return res.data.data!;
  },

  /**
   * Fetch matching funnel telemetry
   */
  async getMatchingAnalytics(filter?: DateRangeFilter): Promise<MatchingFunnelData> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<MatchingFunnelData>>('/admin/analytics/matching', { params });
    return res.data.data!;
  },

  /**
   * Fetch safety and moderation metrics
   */
  async getSafetyAnalytics(filter?: DateRangeFilter): Promise<SafetyAnalyticsData> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<SafetyAnalyticsData>>('/admin/analytics/safety', { params });
    return res.data.data!;
  },

  /**
   * Fetch retention cohort data
   */
  async getRetentionAnalytics(filter?: DateRangeFilter): Promise<RetentionCohortData> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await api.get<ApiResponse<RetentionCohortData>>('/admin/analytics/retention', { params });
    return res.data.data!;
  },

  /**
   * Download real CSV export directly in browser
   */
  async downloadCsv(filter?: DateRangeFilter): Promise<void> {
    const params: Record<string, string> = {};
    if (filter?.range) params.range = filter.range;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const response = await api.get('/admin/analytics/export', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const rangeName = filter?.range || '7d';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `connectly_analytics_${rangeName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default analyticsService;
