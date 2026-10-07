export type AnalyticsDateRange = '7d' | '30d' | '90d' | '6m' | '12m' | 'all' | 'custom';

export interface DateRangeFilter {
  range: AnalyticsDateRange;
  startDate?: string;
  endDate?: string;
}

export interface DateWindow {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
  label: string;
  isCustom: boolean;
}

export interface KpiMetric {
  value: number;
  previousValue: number | null;
  changePercentage: number | null;
  formattedChange: string;
  direction: 'up' | 'down' | 'neutral' | 'na';
}

export interface OverviewKpis {
  totalUsers: KpiMetric;
  newUsers: KpiMetric;
  activeUsers: KpiMetric;
  dau: number;
  wau: number;
  mau: number;
  totalLikes: KpiMetric;
  totalSuperLikes: KpiMetric;
  totalMatches: KpiMetric;
  totalMessages: KpiMetric;
  pendingReports: KpiMetric;
  resolvedReports: KpiMetric;
  pendingVerification: KpiMetric;
  verifiedUsers: KpiMetric;
}

export interface UserGrowthData {
  labels: string[];
  newUsers: number[];
  activeUsers: number[];
}

export interface EngagementData {
  labels: string[];
  likes: number[];
  superLikes: number[];
  matches: number[];
  messages: number[];
  reactions: number[];
}

export interface MatchingFunnelData {
  discoveryViews: number;
  likes: number;
  mutualLikes: number;
  matches: number;
  conversations: number;
  messages: number;
  conversionRates: {
    likeToMatch: string;
    matchToConversation: string;
    conversationToMessage: string;
  };
}

export interface MessageAnalyticsData {
  totalMessages: number;
  messagesToday: number;
  messagesThisWeek: number;
  averageMessagesPerActiveUser: string;
  totalConversations: number;
  newConversations: number;
  activeConversations: number;
  conversationsWithMessages: number;
  totalReactions: number;
  mostUsedReaction: string;
  reactionBreakdown: Array<{ reaction: string; count: number }>;
  notificationsTotal: number;
  notificationsRead: number;
  notificationsUnread: number;
  notificationReadRate: string;
}

export interface ProfileAnalyticsData {
  completed: number;
  incomplete: number;
  avgCompletionPercentage: number;
  completionDistribution: {
    '0-20%': number;
    '21-40%': number;
    '41-60%': number;
    '61-80%': number;
    '81-100%': number;
  };
  withPhoto: number;
  withoutPhoto: number;
  avgPhotosPerProfile: number;
  verifiedCount: number;
}

export interface VerificationAnalyticsData {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  successRate: string;
  averageReviewTime: string;
  trend: {
    labels: string[];
    approved: number[];
    rejected: number[];
  };
}

export interface SafetyAnalyticsData {
  totalReports: number;
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  reportStatusCounts: Record<string, number>;
  reportCategories: Record<string, number>;
  moderationActionsBreakdown: Record<string, number>;
  reportTrend: {
    labels: string[];
    counts: number[];
  };
  moderationTrend: {
    labels: string[];
    actions: number[];
  };
  adminWorkload: Array<{
    adminId: number;
    email: string;
    username: string | null;
    reportsHandled: number;
    verificationsReviewed: number;
    moderationActions: number;
  }>;
}

export interface RetentionCohortData {
  newUsersCount: number;
  returnedDay1: number;
  day1Rate: string;
  returnedDay7: number;
  day7Rate: string;
  returnedDay30: number;
  day30Rate: string;
}

export interface HealthMetric {
  status: 'Healthy' | 'Growing' | 'Stable' | 'Needs Attention';
  detail: string;
}

export interface PlatformHealth {
  growth: HealthMetric;
  engagement: HealthMetric;
  safety: HealthMetric;
  verification: HealthMetric;
}

export interface AnalyticsInsight {
  id: string;
  category: 'growth' | 'engagement' | 'matching' | 'safety' | 'verification';
  type: 'positive' | 'neutral' | 'alert';
  text: string;
}

export interface AnalyticsOverviewPayload {
  filter: DateRangeFilter;
  window: {
    start: string;
    end: string;
    label: string;
    isCustom?: boolean;
  };
  kpis: OverviewKpis;
  userGrowth: UserGrowthData;
  engagement: EngagementData;
  matchingFunnel: MatchingFunnelData;
  messages: MessageAnalyticsData;
  profiles: ProfileAnalyticsData;
  verification: VerificationAnalyticsData;
  safety: SafetyAnalyticsData;
  retention: RetentionCohortData;
  platformHealth: PlatformHealth;
  insights: AnalyticsInsight[];
  demographics?: Array<{ gender: string; count: number }>;
  verificationStats?: { verified: number; unverified: number };
  reportStats?: Array<{ status: string; count: number }>;
  generatedAt: string;
}
