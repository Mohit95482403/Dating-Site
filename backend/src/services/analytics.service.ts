import { AnalyticsModel } from '../models/analytics.model';
import {
  DateRangeFilter,
  AnalyticsOverviewPayload,
  UserGrowthData,
  EngagementData,
  MatchingFunnelData,
  SafetyAnalyticsData,
  RetentionCohortData,
  OverviewKpis,
} from '../types/analytics.types';

export class AnalyticsService {
  /**
   * Retrieves aggregated platform analytics overview
   */
  public static async getOverview(filter: DateRangeFilter): Promise<AnalyticsOverviewPayload> {
    return AnalyticsModel.getOverview(filter);
  }

  /**
   * Retrieves user growth and active telemetry
   */
  public static async getUserAnalytics(filter: DateRangeFilter): Promise<{
    growth: UserGrowthData;
    activeUsers: { dau: number; wau: number; mau: number };
    retention: RetentionCohortData;
  }> {
    const window = AnalyticsModel.resolveDateWindow(filter);
    const growth = await AnalyticsModel.getUserGrowthSeries(window);
    const kpis = await AnalyticsModel.getKpis(window);
    const retention = await AnalyticsModel.getRetentionCohort(window);

    return {
      growth,
      activeUsers: {
        dau: kpis.dau,
        wau: kpis.wau,
        mau: kpis.mau,
      },
      retention,
    };
  }

  /**
   * Retrieves engagement metrics and time series
   */
  public static async getEngagementAnalytics(filter: DateRangeFilter): Promise<EngagementData> {
    const window = AnalyticsModel.resolveDateWindow(filter);
    return AnalyticsModel.getEngagementSeries(window);
  }

  /**
   * Retrieves matching funnel breakdown
   */
  public static async getMatchingAnalytics(filter: DateRangeFilter): Promise<MatchingFunnelData> {
    const window = AnalyticsModel.resolveDateWindow(filter);
    return AnalyticsModel.getMatchingFunnel(window);
  }

  /**
   * Retrieves safety, reports, and moderation analytics
   */
  public static async getSafetyAnalytics(filter: DateRangeFilter): Promise<SafetyAnalyticsData> {
    const window = AnalyticsModel.resolveDateWindow(filter);
    return AnalyticsModel.getSafetyStats(window);
  }

  /**
   * Retrieves user retention cohort metrics
   */
  public static async getRetentionAnalytics(filter: DateRangeFilter): Promise<RetentionCohortData> {
    const window = AnalyticsModel.resolveDateWindow(filter);
    return AnalyticsModel.getRetentionCohort(window);
  }

  /**
   * Exports aggregated analytics to CSV format (Zero PII, aggregate only)
   */
  public static async exportAnalyticsCsv(filter: DateRangeFilter): Promise<string> {
    const overview = await this.getOverview(filter);

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];

    // Header & Meta
    lines.push('CONNECTLY PLATFORM ANALYTICS REPORT');
    lines.push(`Date Range,${escapeCsv(overview.filter.range)}`);
    lines.push(`Window Start,${escapeCsv(overview.window.start)}`);
    lines.push(`Window End,${escapeCsv(overview.window.end)}`);
    lines.push(`Comparison,${escapeCsv(overview.window.label)}`);
    lines.push(`Generated At,${escapeCsv(overview.generatedAt)}`);
    lines.push('');

    // Platform Health
    lines.push('SECTION: PLATFORM HEALTH');
    lines.push('Domain,Status,Detail');
    lines.push(`User Growth,${overview.platformHealth.growth.status},${escapeCsv(overview.platformHealth.growth.detail)}`);
    lines.push(`Engagement,${overview.platformHealth.engagement.status},${escapeCsv(overview.platformHealth.engagement.detail)}`);
    lines.push(`Safety,${overview.platformHealth.safety.status},${escapeCsv(overview.platformHealth.safety.detail)}`);
    lines.push(`Verification,${overview.platformHealth.verification.status},${escapeCsv(overview.platformHealth.verification.detail)}`);
    lines.push('');

    // Overview KPIs
    lines.push('SECTION: KEY PERFORMANCE INDICATORS');
    lines.push('Metric,Current Value,Previous Value,Change %,Direction');
    const kpiEntries: Array<[string, any]> = [
      ['Total Users', overview.kpis.totalUsers],
      ['New Users', overview.kpis.newUsers],
      ['Active Users', overview.kpis.activeUsers],
      ['Total Likes', overview.kpis.totalLikes],
      ['Total Super Likes', overview.kpis.totalSuperLikes],
      ['Total Matches', overview.kpis.totalMatches],
      ['Total Messages', overview.kpis.totalMessages],
      ['Pending Reports', overview.kpis.pendingReports],
      ['Resolved Reports', overview.kpis.resolvedReports],
      ['Pending Verifications', overview.kpis.pendingVerification],
      ['Verified Users', overview.kpis.verifiedUsers],
    ];

    for (const [name, k] of kpiEntries) {
      lines.push(`${escapeCsv(name)},${k.value},${k.previousValue ?? 'N/A'},${escapeCsv(k.formattedChange)},${k.direction}`);
    }
    lines.push('');

    // Matching Funnel
    lines.push('SECTION: MATCHING FUNNEL & CONVERSION');
    lines.push('Funnel Stage,Count,Conversion Rate');
    lines.push(`Profiles Discovered,${overview.matchingFunnel.discoveryViews},Baseline`);
    lines.push(`Likes Expressed,${overview.matchingFunnel.likes},${overview.matchingFunnel.discoveryViews > 0 ? (overview.matchingFunnel.likes / overview.matchingFunnel.discoveryViews * 100).toFixed(1) + '%' : 'N/A'}`);
    lines.push(`Mutual Matches,${overview.matchingFunnel.matches},${overview.matchingFunnel.conversionRates.likeToMatch}`);
    lines.push(`Active Conversations,${overview.matchingFunnel.conversations},${overview.matchingFunnel.conversionRates.matchToConversation}`);
    lines.push(`Messages Exchanged,${overview.matchingFunnel.messages},${overview.matchingFunnel.conversionRates.conversationToMessage}`);
    lines.push('');

    // Safety & Moderation
    lines.push('SECTION: SAFETY & REPORT STATUS');
    lines.push('Report Status,Count');
    for (const [status, count] of Object.entries(overview.safety.reportStatusCounts)) {
      lines.push(`${escapeCsv(status)},${count}`);
    }
    lines.push('');

    // Time Series - User Growth
    lines.push('SECTION: DAILY USER ACTIVITY');
    lines.push('Date,New Users,Active Users');
    for (let i = 0; i < overview.userGrowth.labels.length; i++) {
      lines.push(`${overview.userGrowth.labels[i]},${overview.userGrowth.newUsers[i] || 0},${overview.userGrowth.activeUsers[i] || 0}`);
    }
    lines.push('');

    // Time Series - Engagement
    lines.push('SECTION: DAILY ENGAGEMENT ACTIVITY');
    lines.push('Date,Likes,Super Likes,Matches,Messages,Reactions');
    for (let i = 0; i < overview.engagement.labels.length; i++) {
      lines.push(`${overview.engagement.labels[i]},${overview.engagement.likes[i] || 0},${overview.engagement.superLikes[i] || 0},${overview.engagement.matches[i] || 0},${overview.engagement.messages[i] || 0},${overview.engagement.reactions[i] || 0}`);
    }

    return lines.join('\n');
  }
}

export default AnalyticsService;
