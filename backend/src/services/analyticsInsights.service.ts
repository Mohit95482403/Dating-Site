import {
  OverviewKpis,
  MatchingFunnelData,
  SafetyAnalyticsData,
  VerificationAnalyticsData,
  UserGrowthData,
  PlatformHealth,
  AnalyticsInsight,
} from '../types/analytics.types';

export interface InsightContext {
  kpis: OverviewKpis;
  matchingFunnel: MatchingFunnelData;
  safety: SafetyAnalyticsData;
  verification: VerificationAnalyticsData;
  userGrowth?: UserGrowthData;
}

export class AnalyticsInsightsService {
  /**
   * Calculates deterministic platform health scores based on concrete operational thresholds.
   */
  public static calculatePlatformHealth(ctx: InsightContext): PlatformHealth {
    const { kpis, safety, verification } = ctx;

    // 1. Growth Health
    let growthStatus: 'Healthy' | 'Growing' | 'Stable' | 'Needs Attention' = 'Stable';
    let growthDetail = 'Registration flow is maintaining consistent baseline.';

    if (kpis.newUsers.changePercentage !== null) {
      if (kpis.newUsers.changePercentage >= 15) {
        growthStatus = 'Growing';
        growthDetail = `User registrations expanded strongly (${kpis.newUsers.formattedChange}).`;
      } else if (kpis.newUsers.changePercentage >= 0) {
        growthStatus = 'Healthy';
        growthDetail = `User registrations are trending positively (${kpis.newUsers.formattedChange}).`;
      } else if (kpis.newUsers.changePercentage < -20) {
        growthStatus = 'Needs Attention';
        growthDetail = `Registration velocity decreased by ${kpis.newUsers.formattedChange}.`;
      }
    } else if (kpis.newUsers.value > 0) {
      growthStatus = 'Healthy';
      growthDetail = `${kpis.newUsers.value} new users joined during this timeframe.`;
    }

    // 2. Engagement Health
    let engagementStatus: 'Healthy' | 'Growing' | 'Stable' | 'Needs Attention' = 'Stable';
    let engagementDetail = 'Platform interaction volume is active.';

    if (kpis.totalMatches.value > 0 || kpis.totalMessages.value > 0) {
      const msgChange = kpis.totalMessages.changePercentage;
      if (msgChange !== null && msgChange >= 10) {
        engagementStatus = 'Growing';
        engagementDetail = `Message throughput increased by ${kpis.totalMessages.formattedChange}.`;
      } else if (kpis.totalMatches.value > 0) {
        engagementStatus = 'Healthy';
        engagementDetail = `${kpis.totalMatches.value} matches and ${kpis.totalMessages.value} messages recorded.`;
      }
    } else {
      engagementDetail = 'Waiting for more peer-to-peer chat volume in this window.';
    }

    // 3. Safety Health
    let safetyStatus: 'Healthy' | 'Growing' | 'Stable' | 'Needs Attention' = 'Healthy';
    let safetyDetail = 'Safety queue is clean and under control.';

    if (safety.pending > 5) {
      safetyStatus = 'Needs Attention';
      safetyDetail = `${safety.pending} pending safety reports require moderator inspection.`;
    } else if (safety.pending > 0) {
      safetyStatus = 'Stable';
      safetyDetail = `${safety.pending} open reports currently pending review.`;
    } else {
      safetyDetail = 'Zero backlog: all reported profiles are resolved.';
    }

    // 4. Verification Health
    let verifStatus: 'Healthy' | 'Growing' | 'Stable' | 'Needs Attention' = 'Healthy';
    let verifDetail = 'Verification pipeline is processing smoothly.';

    if (verification.pending > 10) {
      verifStatus = 'Needs Attention';
      verifDetail = `${verification.pending} identity verification requests in backlog.`;
    } else if (verification.pending > 0) {
      verifStatus = 'Stable';
      verifDetail = `${verification.pending} requests pending review (avg time: ${verification.averageReviewTime}).`;
    } else {
      verifDetail = `All verifications reviewed (Success rate: ${verification.successRate}).`;
    }

    return {
      growth: { status: growthStatus, detail: growthDetail },
      engagement: { status: engagementStatus, detail: engagementDetail },
      safety: { status: safetyStatus, detail: safetyDetail },
      verification: { status: verifStatus, detail: verifDetail },
    };
  }

  /**
   * Generates deterministic, calculated insights using real metrics.
   */
  public static generateInsights(ctx: InsightContext): AnalyticsInsight[] {
    const { kpis, matchingFunnel, safety, verification } = ctx;
    const insights: AnalyticsInsight[] = [];

    // 1. User Registration Insight
    if (kpis.newUsers.changePercentage !== null) {
      if (kpis.newUsers.changePercentage > 0) {
        insights.push({
          id: 'insight-reg-growth',
          category: 'growth',
          type: 'positive',
          text: `User registrations increased ${kpis.newUsers.formattedChange} compared with the previous equivalent period (${kpis.newUsers.value} vs ${kpis.newUsers.previousValue}).`,
        });
      } else if (kpis.newUsers.changePercentage < 0) {
        insights.push({
          id: 'insight-reg-drop',
          category: 'growth',
          type: 'neutral',
          text: `User registrations adjusted by ${kpis.newUsers.formattedChange} relative to the previous period (${kpis.newUsers.value} new accounts).`,
        });
      } else {
        insights.push({
          id: 'insight-reg-flat',
          category: 'growth',
          type: 'neutral',
          text: `User registration pace is steady with ${kpis.newUsers.value} signups matching the prior period.`,
        });
      }
    } else if (kpis.newUsers.value > 0) {
      insights.push({
        id: 'insight-reg-total',
        category: 'growth',
        type: 'positive',
        text: `Platform currently registers ${kpis.newUsers.value} new members across the chosen timeframe.`,
      });
    }

    // 2. Matching Funnel Insight
    if (matchingFunnel.likes > 0) {
      const matchRateNum = parseFloat(matchingFunnel.conversionRates.likeToMatch);
      if (!isNaN(matchRateNum) && matchRateNum >= 15) {
        insights.push({
          id: 'insight-funnel-healthy',
          category: 'matching',
          type: 'positive',
          text: `Strong match conversion efficiency: ${matchingFunnel.conversionRates.likeToMatch} of recorded likes successfully formed mutual matches.`,
        });
      } else {
        insights.push({
          id: 'insight-funnel-info',
          category: 'matching',
          type: 'neutral',
          text: `Like-to-match conversion is at ${matchingFunnel.conversionRates.likeToMatch} (${matchingFunnel.matches} matches generated from ${matchingFunnel.likes} likes).`,
        });
      }
    }

    // 3. Conversation & Message Activity Insight
    if (matchingFunnel.matches > 0 && matchingFunnel.conversations > 0) {
      insights.push({
        id: 'insight-engagement-active',
        category: 'engagement',
        type: 'positive',
        text: `Match-to-conversation activation rate is ${matchingFunnel.conversionRates.matchToConversation}, generating ${matchingFunnel.messages} total chat messages.`,
      });
    } else if (kpis.totalMessages.value > 0) {
      insights.push({
        id: 'insight-msg-volume',
        category: 'engagement',
        type: 'neutral',
        text: `Platform recorded ${kpis.totalMessages.value} messages sent in this period (${kpis.totalMessages.formattedChange}).`,
      });
    }

    // 4. Safety & Report Backlog Insight
    if (safety.pending > 0) {
      insights.push({
        id: 'insight-safety-pending',
        category: 'safety',
        type: 'alert',
        text: `${safety.pending} member report(s) currently await review in the safety moderation queue.`,
      });
    } else if (safety.resolved > 0) {
      insights.push({
        id: 'insight-safety-resolved',
        category: 'safety',
        type: 'positive',
        text: `Platform safety moderators successfully reviewed and resolved ${safety.resolved} reported incident(s).`,
      });
    }

    // 5. Verification Processing Insight
    if (verification.totalRequests > 0) {
      if (verification.averageReviewTime !== 'Insufficient data') {
        insights.push({
          id: 'insight-verif-time',
          category: 'verification',
          type: 'positive',
          text: `Identity verification reviews are currently processed with an average turnaround time of ${verification.averageReviewTime}.`,
        });
      } else {
        insights.push({
          id: 'insight-verif-rate',
          category: 'verification',
          type: 'neutral',
          text: `Identity verification approval rate stands at ${verification.successRate} across ${verification.totalRequests} submitted requests.`,
        });
      }
    }

    // Fallback if platform is newly initialized
    if (insights.length === 0) {
      insights.push({
        id: 'insight-baseline',
        category: 'growth',
        type: 'neutral',
        text: `Platform telemetry active. Baseline analytics are aggregating from live database operations.`,
      });
    }

    return insights;
  }
}

export default AnalyticsInsightsService;
