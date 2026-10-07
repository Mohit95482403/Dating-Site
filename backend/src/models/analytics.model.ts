import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';
import {
  DateRangeFilter,
  DateWindow,
  KpiMetric,
  OverviewKpis,
  UserGrowthData,
  EngagementData,
  MatchingFunnelData,
  MessageAnalyticsData,
  ProfileAnalyticsData,
  VerificationAnalyticsData,
  SafetyAnalyticsData,
  RetentionCohortData,
  PlatformHealth,
  AnalyticsOverviewPayload,
} from '../types/analytics.types';
import { AnalyticsInsightsService } from '../services/analyticsInsights.service';

export class AnalyticsModel {
  /**
   * Resolves date filter to current and previous equivalent windows.
   */
  public static resolveDateWindow(filter: DateRangeFilter): DateWindow {
    const now = new Date();
    const range = filter.range || '7d';

    if (range === 'custom') {
      if (!filter.startDate || !filter.endDate) {
        throw new Error('Both startDate and endDate are required for custom range.');
      }
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format provided for custom range.');
      }

      // Set end of day for endDate
      end.setHours(23, 59, 59, 999);

      if (start > end) {
        throw new Error('startDate must be before or equal to endDate.');
      }

      const durationMs = end.getTime() - start.getTime();
      const maxMs = 730 * 24 * 60 * 60 * 1000; // 2 years limit to prevent unbounded scanning

      if (durationMs > maxMs) {
        throw new Error('Custom range cannot exceed 730 days (2 years).');
      }

      const prevStart = new Date(start.getTime() - durationMs);
      const prevEnd = new Date(start.getTime());

      const daysCount = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

      return {
        currentStart: start,
        currentEnd: end,
        previousStart: prevStart,
        previousEnd: prevEnd,
        label: `vs previous ${daysCount} days`,
        isCustom: true,
      };
    }

    if (range === 'all') {
      return {
        currentStart: new Date('2020-01-01T00:00:00.000Z'),
        currentEnd: now,
        previousStart: null,
        previousEnd: null,
        label: 'All Time (No previous period)',
        isCustom: false,
      };
    }

    let days = 7;
    let label = 'vs previous 7 days';

    switch (range) {
      case '30d':
        days = 30;
        label = 'vs previous 30 days';
        break;
      case '90d':
        days = 90;
        label = 'vs previous 90 days';
        break;
      case '6m':
        days = 180;
        label = 'vs previous 6 months';
        break;
      case '12m':
        days = 365;
        label = 'vs previous 12 months';
        break;
      case '7d':
      default:
        days = 7;
        label = 'vs previous 7 days';
        break;
    }

    const currentEnd = new Date(now);
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      label,
      isCustom: false,
    };
  }

  /**
   * Deterministic KPI calculation with zero-division protection and accurate delta reporting.
   */
  public static calculateKpi(current: number, previous: number | null): KpiMetric {
    if (previous === null) {
      return {
        value: current,
        previousValue: null,
        changePercentage: null,
        formattedChange: 'No previous-period data',
        direction: 'na',
      };
    }

    if (previous === 0) {
      if (current === 0) {
        return {
          value: 0,
          previousValue: 0,
          changePercentage: 0,
          formattedChange: '0%',
          direction: 'neutral',
        };
      }
      return {
        value: current,
        previousValue: 0,
        changePercentage: 100,
        formattedChange: '+100%',
        direction: 'up',
      };
    }

    const pct = Math.round(((current - previous) / previous) * 1000) / 10;
    const sign = pct > 0 ? '+' : '';
    const formatted = `${sign}${pct}%`;
    const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';

    return {
      value: current,
      previousValue: previous,
      changePercentage: pct,
      formattedChange: formatted,
      direction,
    };
  }

  /**
   * Gathers all platform overview analytics using optimized MySQL aggregations.
   */
  public static async getOverview(filter: DateRangeFilter): Promise<AnalyticsOverviewPayload> {
    const window = this.resolveDateWindow(filter);

    // 1. KPI Aggregations (Current vs Previous period)
    const kpis = await this.getKpis(window);

    // 2. User Growth Time Series
    const userGrowth = await this.getUserGrowthSeries(window);

    // 3. Engagement Trends
    const engagement = await this.getEngagementSeries(window);

    // 4. Matching Funnel & Conversion Rates
    const matchingFunnel = await this.getMatchingFunnel(window);

    // 5. Message & Communication Stats
    const messages = await this.getMessageStats(window);

    // 6. Profile Completion & Demographics
    const profiles = await this.getProfileStats();

    // 7. Verification Review Velocity & Trends
    const verification = await this.getVerificationStats(window);

    // 8. Safety & Moderation Overview
    const safety = await this.getSafetyStats(window);

    // 9. Retention Cohort Foundation
    const retention = await this.getRetentionCohort(window);

    // 10. Platform Health (Rule-based deterministic signals)
    const platformHealth = AnalyticsInsightsService.calculatePlatformHealth({
      kpis,
      matchingFunnel,
      safety,
      verification,
    });

    // 11. Deterministic Insight Engine
    const insights = AnalyticsInsightsService.generateInsights({
      kpis,
      matchingFunnel,
      safety,
      verification,
      userGrowth,
    });

    // 12. Demographics and legacy verification/report breakdown for full Day 17 backwards compatibility
    const [genderRows] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(gender, 'unspecified') AS gender, COUNT(*) AS count
      FROM profiles
      GROUP BY gender
    `);

    const [verifRatio] = await pool.query<RowDataPacket[]>(`
      SELECT 
        SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN is_verified = FALSE OR is_verified IS NULL THEN 1 ELSE 0 END) AS unverified
      FROM profiles
    `);

    const [reportBreakdown] = await pool.query<RowDataPacket[]>(`
      SELECT status, COUNT(*) AS count
      FROM reports
      GROUP BY status
    `);

    return {
      filter,
      window: {
        start: window.currentStart.toISOString(),
        end: window.currentEnd.toISOString(),
        label: window.label,
        isCustom: window.isCustom,
      },
      kpis,
      userGrowth,
      engagement,
      matchingFunnel,
      messages,
      profiles,
      verification,
      safety,
      retention,
      platformHealth,
      insights,
      demographics: genderRows as any,
      verificationStats: (verifRatio[0] as any) || { verified: 0, unverified: 0 },
      reportStats: reportBreakdown as any,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches Overview KPIs with previous-period comparison
   */
  public static async getKpis(window: DateWindow): Promise<OverviewKpis> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;
    const prevStart = window.previousStart;
    const prevEnd = window.previousEnd;

    // Total Users count
    const [totalUsersRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const totalUsersCount = Number(totalUsersRows[0]?.count || 0);

    // Active user metrics: DAU (last 24h), WAU (last 7d), MAU (last 30d)
    const [activeBuckets] = await pool.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(DISTINCT id) FROM users WHERE last_seen_at >= NOW() - INTERVAL 1 DAY OR last_login_at >= NOW() - INTERVAL 1 DAY) AS dau,
        (SELECT COUNT(DISTINCT id) FROM users WHERE last_seen_at >= NOW() - INTERVAL 7 DAY OR last_login_at >= NOW() - INTERVAL 7 DAY) AS wau,
        (SELECT COUNT(DISTINCT id) FROM users WHERE last_seen_at >= NOW() - INTERVAL 30 DAY OR last_login_at >= NOW() - INTERVAL 30 DAY) AS mau
    `);
    const dau = Number(activeBuckets[0]?.dau || 0);
    const wau = Number(activeBuckets[0]?.wau || 0);
    const mau = Number(activeBuckets[0]?.mau || 0);

    // Helper for period count
    const queryCounts = async (sql: string, params: any[]): Promise<number> => {
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return Number(rows[0]?.count || 0);
    };

    // Current period counts
    const curNewUsers = await queryCounts('SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?', [curStart, curEnd]);
    const curActiveUsers = await queryCounts('SELECT COUNT(DISTINCT id) as count FROM users WHERE last_seen_at BETWEEN ? AND ? OR last_login_at BETWEEN ? AND ?', [curStart, curEnd, curStart, curEnd]);
    const curLikes = await queryCounts('SELECT COUNT(*) as count FROM likes WHERE created_at BETWEEN ? AND ?', [curStart, curEnd]);
    const curSuperLikes = await queryCounts('SELECT COUNT(*) as count FROM super_likes WHERE created_at BETWEEN ? AND ?', [curStart, curEnd]);
    const curMatches = await queryCounts("SELECT COUNT(*) as count FROM matches WHERE status = 'active' AND matched_at BETWEEN ? AND ?", [curStart, curEnd]);
    const curMessages = await queryCounts('SELECT COUNT(*) as count FROM messages WHERE created_at BETWEEN ? AND ?', [curStart, curEnd]);
    const curPendingReports = await queryCounts("SELECT COUNT(*) as count FROM reports WHERE status = 'pending' AND created_at BETWEEN ? AND ?", [curStart, curEnd]);
    const curResolvedReports = await queryCounts("SELECT COUNT(*) as count FROM reports WHERE status = 'resolved' AND (resolved_at BETWEEN ? AND ? OR updated_at BETWEEN ? AND ?)", [curStart, curEnd, curStart, curEnd]);
    const curPendingVerif = await queryCounts("SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending' AND created_at BETWEEN ? AND ?", [curStart, curEnd]);
    const curVerifiedUsers = await queryCounts('SELECT COUNT(*) as count FROM profiles WHERE is_verified = TRUE', []);

    // Previous period counts
    let prevNewUsers: number | null = null;
    let prevActiveUsers: number | null = null;
    let prevLikes: number | null = null;
    let prevSuperLikes: number | null = null;
    let prevMatches: number | null = null;
    let prevMessages: number | null = null;
    let prevPendingReports: number | null = null;
    let prevResolvedReports: number | null = null;
    let prevPendingVerif: number | null = null;

    if (prevStart && prevEnd) {
      prevNewUsers = await queryCounts('SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?', [prevStart, prevEnd]);
      prevActiveUsers = await queryCounts('SELECT COUNT(DISTINCT id) as count FROM users WHERE last_seen_at BETWEEN ? AND ? OR last_login_at BETWEEN ? AND ?', [prevStart, prevEnd, prevStart, prevEnd]);
      prevLikes = await queryCounts('SELECT COUNT(*) as count FROM likes WHERE created_at BETWEEN ? AND ?', [prevStart, prevEnd]);
      prevSuperLikes = await queryCounts('SELECT COUNT(*) as count FROM super_likes WHERE created_at BETWEEN ? AND ?', [prevStart, prevEnd]);
      prevMatches = await queryCounts("SELECT COUNT(*) as count FROM matches WHERE status = 'active' AND matched_at BETWEEN ? AND ?", [prevStart, prevEnd]);
      prevMessages = await queryCounts('SELECT COUNT(*) as count FROM messages WHERE created_at BETWEEN ? AND ?', [prevStart, prevEnd]);
      prevPendingReports = await queryCounts("SELECT COUNT(*) as count FROM reports WHERE status = 'pending' AND created_at BETWEEN ? AND ?", [prevStart, prevEnd]);
      prevResolvedReports = await queryCounts("SELECT COUNT(*) as count FROM reports WHERE status = 'resolved' AND (resolved_at BETWEEN ? AND ? OR updated_at BETWEEN ? AND ?)", [prevStart, prevEnd, prevStart, prevEnd]);
      prevPendingVerif = await queryCounts("SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending' AND created_at BETWEEN ? AND ?", [prevStart, prevEnd]);
    }

    return {
      totalUsers: this.calculateKpi(totalUsersCount, null),
      newUsers: this.calculateKpi(curNewUsers, prevNewUsers),
      activeUsers: this.calculateKpi(curActiveUsers, prevActiveUsers),
      dau,
      wau,
      mau,
      totalLikes: this.calculateKpi(curLikes, prevLikes),
      totalSuperLikes: this.calculateKpi(curSuperLikes, prevSuperLikes),
      totalMatches: this.calculateKpi(curMatches, prevMatches),
      totalMessages: this.calculateKpi(curMessages, prevMessages),
      pendingReports: this.calculateKpi(curPendingReports, prevPendingReports),
      resolvedReports: this.calculateKpi(curResolvedReports, prevResolvedReports),
      pendingVerification: this.calculateKpi(curPendingVerif, prevPendingVerif),
      verifiedUsers: this.calculateKpi(curVerifiedUsers, null),
    };
  }

  /**
   * User Growth and Activity time-series data
   */
  public static async getUserGrowthSeries(window: DateWindow): Promise<UserGrowthData> {
    const [newUsersRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [window.currentStart, window.currentEnd]
    );

    const [activeUsersRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(COALESCE(last_seen_at, last_login_at, created_at)) as date, COUNT(DISTINCT id) as count
       FROM users
       WHERE (last_seen_at BETWEEN ? AND ? OR last_login_at BETWEEN ? AND ?)
       GROUP BY DATE(COALESCE(last_seen_at, last_login_at, created_at))
       ORDER BY date ASC`,
      [window.currentStart, window.currentEnd, window.currentStart, window.currentEnd]
    );

    // Merge dates into continuous map
    const dateMap = new Map<string, { newUsers: number; activeUsers: number }>();

    for (const r of newUsersRows) {
      const d = this.formatDateLabel(r.date);
      if (!dateMap.has(d)) dateMap.set(d, { newUsers: 0, activeUsers: 0 });
      dateMap.get(d)!.newUsers = Number(r.count || 0);
    }

    for (const r of activeUsersRows) {
      const d = this.formatDateLabel(r.date);
      if (!dateMap.has(d)) dateMap.set(d, { newUsers: 0, activeUsers: 0 });
      dateMap.get(d)!.activeUsers = Number(r.count || 0);
    }

    const labels = Array.from(dateMap.keys()).sort();
    const newUsers = labels.map((l) => dateMap.get(l)!.newUsers);
    const activeUsers = labels.map((l) => dateMap.get(l)!.activeUsers);

    return { labels, newUsers, activeUsers };
  }

  /**
   * Engagement series: Likes, Super Likes, Matches, Messages, Reactions
   */
  public static async getEngagementSeries(window: DateWindow): Promise<EngagementData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    const [likesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM likes WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const [superLikesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM super_likes WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const [matchesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(matched_at) as date, COUNT(*) as count FROM matches WHERE status = 'active' AND matched_at BETWEEN ? AND ? GROUP BY DATE(matched_at) ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const [messagesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM messages WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const [reactionsRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM message_reactions WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const dateMap = new Map<string, { likes: number; superLikes: number; matches: number; messages: number; reactions: number }>();

    const mergeSeries = (rows: RowDataPacket[], key: 'likes' | 'superLikes' | 'matches' | 'messages' | 'reactions') => {
      for (const r of rows) {
        const d = this.formatDateLabel(r.date);
        if (!dateMap.has(d)) {
          dateMap.set(d, { likes: 0, superLikes: 0, matches: 0, messages: 0, reactions: 0 });
        }
        dateMap.get(d)![key] = Number(r.count || 0);
      }
    };

    mergeSeries(likesRows, 'likes');
    mergeSeries(superLikesRows, 'superLikes');
    mergeSeries(matchesRows, 'matches');
    mergeSeries(messagesRows, 'messages');
    mergeSeries(reactionsRows, 'reactions');

    const labels = Array.from(dateMap.keys()).sort();

    return {
      labels,
      likes: labels.map((l) => dateMap.get(l)!.likes),
      superLikes: labels.map((l) => dateMap.get(l)!.superLikes),
      matches: labels.map((l) => dateMap.get(l)!.matches),
      messages: labels.map((l) => dateMap.get(l)!.messages),
      reactions: labels.map((l) => dateMap.get(l)!.reactions),
    };
  }

  /**
   * Real matching funnel with zero-division protection
   */
  public static async getMatchingFunnel(window: DateWindow): Promise<MatchingFunnelData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    // Profiles Discovered = Likes + Passes
    const [[discoveryStats]] = await pool.query<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM likes WHERE created_at BETWEEN ? AND ?) AS likesCount,
        (SELECT COUNT(*) FROM passes WHERE created_at BETWEEN ? AND ?) AS passesCount,
        (SELECT COUNT(*) FROM super_likes WHERE created_at BETWEEN ? AND ?) AS superLikesCount,
        (SELECT COUNT(*) FROM matches WHERE matched_at BETWEEN ? AND ?) AS mutualLikesCount,
        (SELECT COUNT(*) FROM matches WHERE status = 'active' AND matched_at BETWEEN ? AND ?) AS matchesCount,
        (SELECT COUNT(DISTINCT conversation_id) FROM messages WHERE created_at BETWEEN ? AND ?) AS activeConversationsCount,
        (SELECT COUNT(*) FROM messages WHERE created_at BETWEEN ? AND ?) AS messagesCount`,
      [curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd]
    );

    const likes = Number(discoveryStats?.likesCount || 0);
    const passes = Number(discoveryStats?.passesCount || 0);
    const superLikes = Number(discoveryStats?.superLikesCount || 0);
    const discoveryViews = likes + passes + superLikes;
    const mutualLikes = Number(discoveryStats?.mutualLikesCount || 0);
    const matches = Number(discoveryStats?.matchesCount || 0);
    const conversations = Number(discoveryStats?.activeConversationsCount || 0);
    const messages = Number(discoveryStats?.messagesCount || 0);

    const likeToMatch = likes > 0 ? `${(Math.round((matches / likes) * 1000) / 10).toFixed(1)}%` : 'N/A';
    const matchToConversation = matches > 0 ? `${(Math.round((conversations / matches) * 1000) / 10).toFixed(1)}%` : 'N/A';
    const conversationToMessage = conversations > 0 ? `${(Math.round((messages / conversations) * 10) / 10).toFixed(1)} msgs/conv` : 'N/A';

    return {
      discoveryViews: discoveryViews > 0 ? discoveryViews : likes,
      likes,
      mutualLikes,
      matches,
      conversations,
      messages,
      conversionRates: {
        likeToMatch,
        matchToConversation,
        conversationToMessage,
      },
    };
  }

  /**
   * Detailed Message & Communication Analytics
   */
  public static async getMessageStats(window: DateWindow): Promise<MessageAnalyticsData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    // Messages overall and time subsets
    const [[msgCounts]] = await pool.query<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM messages WHERE created_at BETWEEN ? AND ?) AS totalMessages,
        (SELECT COUNT(*) FROM messages WHERE created_at >= CURDATE()) AS messagesToday,
        (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL 7 DAY) AS messagesThisWeek,
        (SELECT COUNT(*) FROM conversations) AS totalConversations,
        (SELECT COUNT(*) FROM conversations WHERE created_at BETWEEN ? AND ?) AS newConversations,
        (SELECT COUNT(*) FROM conversations WHERE last_message_at IS NOT NULL) AS activeConversations,
        (SELECT COUNT(DISTINCT conversation_id) FROM messages) AS conversationsWithMessages,
        (SELECT COUNT(*) FROM message_reactions WHERE created_at BETWEEN ? AND ?) AS totalReactions,
        (SELECT COUNT(*) FROM notifications WHERE created_at BETWEEN ? AND ?) AS notificationsTotal,
        (SELECT COUNT(*) FROM notifications WHERE is_read = TRUE AND created_at BETWEEN ? AND ?) AS notificationsRead,
        (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE AND created_at BETWEEN ? AND ?) AS notificationsUnread`,
      [curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd]
    );

    const totalMessages = Number(msgCounts?.totalMessages || 0);
    const messagesToday = Number(msgCounts?.messagesToday || 0);
    const messagesThisWeek = Number(msgCounts?.messagesThisWeek || 0);
    const totalConversations = Number(msgCounts?.totalConversations || 0);
    const newConversations = Number(msgCounts?.newConversations || 0);
    const activeConversations = Number(msgCounts?.activeConversations || 0);
    const conversationsWithMessages = Number(msgCounts?.conversationsWithMessages || 0);
    const totalReactions = Number(msgCounts?.totalReactions || 0);

    const notificationsTotal = Number(msgCounts?.notificationsTotal || 0);
    const notificationsRead = Number(msgCounts?.notificationsRead || 0);
    const notificationsUnread = Number(msgCounts?.notificationsUnread || 0);
    const notificationReadRate = notificationsTotal > 0
      ? `${(Math.round((notificationsRead / notificationsTotal) * 1000) / 10).toFixed(1)}%`
      : 'N/A';

    // Active users in window for average messages calculation
    const [actRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(DISTINCT id) as count FROM users WHERE last_seen_at BETWEEN ? AND ? OR last_login_at BETWEEN ? AND ?',
      [curStart, curEnd, curStart, curEnd]
    );
    const activeUsers = Number(actRows[0]?.count || 0);
    const averageMessagesPerActiveUser = activeUsers > 0 ? (Math.round((totalMessages / activeUsers) * 10) / 10).toFixed(1) : 'N/A';

    // Reaction breakdown
    const [reactionRows] = await pool.query<RowDataPacket[]>(
      `SELECT reaction, COUNT(*) as count
       FROM message_reactions
       WHERE created_at BETWEEN ? AND ?
       GROUP BY reaction
       ORDER BY count DESC
       LIMIT 10`,
      [curStart, curEnd]
    );

    const reactionBreakdown = reactionRows.map((r) => ({
      reaction: String(r.reaction),
      count: Number(r.count || 0),
    }));

    const mostUsedReaction = reactionBreakdown[0]?.reaction || 'None';

    return {
      totalMessages,
      messagesToday,
      messagesThisWeek,
      averageMessagesPerActiveUser,
      totalConversations,
      newConversations,
      activeConversations,
      conversationsWithMessages,
      totalReactions,
      mostUsedReaction,
      reactionBreakdown,
      notificationsTotal,
      notificationsRead,
      notificationsUnread,
      notificationReadRate,
    };
  }

  /**
   * Profile Completion & Distribution Analytics
   */
  public static async getProfileStats(): Promise<ProfileAnalyticsData> {
    const [profileScoreRows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        p.user_id,
        p.is_profile_complete,
        (
          (CASE WHEN p.first_name IS NOT NULL AND p.first_name != '' THEN 15 ELSE 0 END) +
          (CASE WHEN p.date_of_birth IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN p.gender IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN p.bio IS NOT NULL AND CHAR_LENGTH(p.bio) > 5 THEN 15 ELSE 0 END) +
          (CASE WHEN p.occupation IS NOT NULL AND p.occupation != '' THEN 10 ELSE 0 END) +
          (CASE WHEN p.location_city IS NOT NULL AND p.location_city != '' THEN 10 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM photos ph WHERE ph.user_id = p.user_id) > 0 THEN 20 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM user_interests ui WHERE ui.user_id = p.user_id) >= 1 THEN 10 ELSE 0 END)
        ) AS score
      FROM profiles p
    `);

    let completed = 0;
    let incomplete = 0;
    let totalScore = 0;

    const distribution = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0,
    };

    for (const row of profileScoreRows) {
      const score = Math.min(100, Math.max(0, Number(row.score || 0)));
      totalScore += score;

      if (row.is_profile_complete || score >= 80) {
        completed++;
      } else {
        incomplete++;
      }

      if (score <= 20) distribution['0-20%']++;
      else if (score <= 40) distribution['21-40%']++;
      else if (score <= 60) distribution['41-60%']++;
      else if (score <= 80) distribution['61-80%']++;
      else distribution['81-100%']++;
    }

    const totalProfiles = profileScoreRows.length;
    const avgCompletionPercentage = totalProfiles > 0 ? Math.round(totalScore / totalProfiles) : 0;

    // Photos analytics
    const [[photoStats]] = await pool.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM photos) AS usersWithPhoto,
        (SELECT COUNT(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM photos ph WHERE ph.user_id = u.id)) AS usersWithoutPhoto,
        (SELECT COUNT(*) FROM photos) AS totalPhotos,
        (SELECT COUNT(*) FROM profiles WHERE is_verified = TRUE) AS verifiedCount
    `);

    const withPhoto = Number(photoStats?.usersWithPhoto || 0);
    const withoutPhoto = Number(photoStats?.usersWithoutPhoto || 0);
    const totalPhotos = Number(photoStats?.totalPhotos || 0);
    const verifiedCount = Number(photoStats?.verifiedCount || 0);
    const avgPhotosPerProfile = totalProfiles > 0 ? Math.round((totalPhotos / totalProfiles) * 10) / 10 : 0;

    return {
      completed,
      incomplete,
      avgCompletionPercentage,
      completionDistribution: distribution,
      withPhoto,
      withoutPhoto,
      avgPhotosPerProfile,
      verifiedCount,
    };
  }

  /**
   * Verification metrics, success rate, and average review time
   */
  public static async getVerificationStats(window: DateWindow): Promise<VerificationAnalyticsData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    const [[verifCounts]] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(CASE WHEN status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL 
            THEN TIMESTAMPDIFF(SECOND, created_at, reviewed_at) ELSE NULL END) as avgReviewSeconds
       FROM verification_requests
       WHERE created_at BETWEEN ? AND ?`,
      [curStart, curEnd]
    );

    const totalRequests = Number(verifCounts?.totalRequests || 0);
    const pending = Number(verifCounts?.pending || 0);
    const approved = Number(verifCounts?.approved || 0);
    const rejected = Number(verifCounts?.rejected || 0);
    const reviewedTotal = approved + rejected;

    const successRate = reviewedTotal > 0 ? `${(Math.round((approved / reviewedTotal) * 1000) / 10).toFixed(1)}%` : 'N/A';

    let averageReviewTime = 'Insufficient data';
    const avgSec = Number(verifCounts?.avgReviewSeconds);
    if (!isNaN(avgSec) && avgSec > 0) {
      if (avgSec < 60) {
        averageReviewTime = `${Math.round(avgSec)}s`;
      } else if (avgSec < 3600) {
        averageReviewTime = `${Math.round(avgSec / 60)}m`;
      } else {
        const hrs = Math.floor(avgSec / 3600);
        const mins = Math.round((avgSec % 3600) / 60);
        averageReviewTime = `${hrs}h ${mins}m`;
      }
    }

    // Trend: Approved vs Rejected over time
    const [trendRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM verification_requests
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const labels = trendRows.map((r) => this.formatDateLabel(r.date));
    const approvedSeries = trendRows.map((r) => Number(r.approved || 0));
    const rejectedSeries = trendRows.map((r) => Number(r.rejected || 0));

    return {
      totalRequests,
      pending,
      approved,
      rejected,
      successRate,
      averageReviewTime,
      trend: {
        labels,
        approved: approvedSeries,
        rejected: rejectedSeries,
      },
    };
  }

  /**
   * Safety and moderation metrics, trends, and admin workload
   */
  public static async getSafetyStats(window: DateWindow): Promise<SafetyAnalyticsData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    // Report status counts
    const [statusRows] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM reports
       WHERE created_at BETWEEN ? AND ?
       GROUP BY status`,
      [curStart, curEnd]
    );

    const reportStatusCounts: Record<string, number> = {
      pending: 0,
      under_review: 0,
      resolved: 0,
      dismissed: 0,
    };

    let totalReports = 0;
    for (const r of statusRows) {
      const st = String(r.status);
      const cnt = Number(r.count || 0);
      reportStatusCounts[st] = cnt;
      totalReports += cnt;
    }

    // Report categories breakdown
    const [categoryRows] = await pool.query<RowDataPacket[]>(
      `SELECT reason, COUNT(*) as count
       FROM reports
       WHERE created_at BETWEEN ? AND ?
       GROUP BY reason
       ORDER BY count DESC`,
      [curStart, curEnd]
    );

    const reportCategories: Record<string, number> = {};
    for (const r of categoryRows) {
      reportCategories[String(r.reason)] = Number(r.count || 0);
    }

    // Moderation action counts
    const [modActionRows] = await pool.query<RowDataPacket[]>(
      `SELECT action, COUNT(*) as count
       FROM moderation_actions
       WHERE created_at BETWEEN ? AND ?
       GROUP BY action`,
      [curStart, curEnd]
    );

    const moderationActionsBreakdown: Record<string, number> = {};
    for (const r of modActionRows) {
      moderationActionsBreakdown[String(r.action)] = Number(r.count || 0);
    }

    // Report trend over time
    const [reportTrendRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM reports
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [curStart, curEnd]
    );

    // Moderation trend over time
    const [modTrendRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM moderation_actions
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [curStart, curEnd]
    );

    const reportLabels = reportTrendRows.map((r) => this.formatDateLabel(r.date));
    const reportCounts = reportTrendRows.map((r) => Number(r.count || 0));

    const modLabels = modTrendRows.map((r) => this.formatDateLabel(r.date));
    const modActions = modTrendRows.map((r) => Number(r.count || 0));

    // Admin Workload information (operational workload, non-competitive)
    const [workloadRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.id as adminId,
        u.email,
        u.username,
        (SELECT COUNT(*) FROM reports r WHERE r.resolved_by = u.id AND (r.resolved_at BETWEEN ? AND ? OR r.updated_at BETWEEN ? AND ?)) AS reportsHandled,
        (SELECT COUNT(*) FROM verification_requests vr WHERE vr.reviewed_by = u.id AND vr.reviewed_at BETWEEN ? AND ?) AS verificationsReviewed,
        (SELECT COUNT(*) FROM moderation_actions ma WHERE ma.admin_id = u.id AND ma.created_at BETWEEN ? AND ?) AS moderationActions
       FROM users u
       WHERE u.role = 'admin'
       ORDER BY u.id ASC`,
      [curStart, curEnd, curStart, curEnd, curStart, curEnd, curStart, curEnd]
    );

    const adminWorkload = workloadRows.map((w) => ({
      adminId: Number(w.adminId),
      email: String(w.email),
      username: w.username ? String(w.username) : null,
      reportsHandled: Number(w.reportsHandled || 0),
      verificationsReviewed: Number(w.verificationsReviewed || 0),
      moderationActions: Number(w.moderationActions || 0),
    }));

    return {
      totalReports,
      pending: reportStatusCounts.pending || 0,
      underReview: (reportStatusCounts.under_review || 0) + (reportStatusCounts.reviewing || 0),
      resolved: reportStatusCounts.resolved || 0,
      dismissed: reportStatusCounts.dismissed || 0,
      reportStatusCounts,
      reportCategories,
      moderationActionsBreakdown,
      reportTrend: {
        labels: reportLabels,
        counts: reportCounts,
      },
      moderationTrend: {
        labels: modLabels,
        actions: modActions,
      },
      adminWorkload,
    };
  }

  /**
   * Basic User Retention Cohort Foundation (DATEDIFF between registration and last activity)
   */
  public static async getRetentionCohort(window: DateWindow): Promise<RetentionCohortData> {
    const curStart = window.currentStart;
    const curEnd = window.currentEnd;

    // Users registered within the selected window
    const [cohortRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalCohort,
        SUM(CASE WHEN DATEDIFF(COALESCE(last_seen_at, last_login_at), created_at) >= 1 THEN 1 ELSE 0 END) as returnedDay1,
        SUM(CASE WHEN DATEDIFF(COALESCE(last_seen_at, last_login_at), created_at) >= 7 THEN 1 ELSE 0 END) as returnedDay7,
        SUM(CASE WHEN DATEDIFF(COALESCE(last_seen_at, last_login_at), created_at) >= 30 THEN 1 ELSE 0 END) as returnedDay30
       FROM users
       WHERE created_at BETWEEN ? AND ?`,
      [curStart, curEnd]
    );

    const newUsersCount = Number(cohortRows[0]?.totalCohort || 0);
    const returnedDay1 = Number(cohortRows[0]?.returnedDay1 || 0);
    const returnedDay7 = Number(cohortRows[0]?.returnedDay7 || 0);
    const returnedDay30 = Number(cohortRows[0]?.returnedDay30 || 0);

    const day1Rate = newUsersCount > 0 ? `${(Math.round((returnedDay1 / newUsersCount) * 1000) / 10).toFixed(1)}%` : 'N/A';
    const day7Rate = newUsersCount > 0 ? `${(Math.round((returnedDay7 / newUsersCount) * 1000) / 10).toFixed(1)}%` : 'N/A';
    const day30Rate = newUsersCount > 0 ? `${(Math.round((returnedDay30 / newUsersCount) * 1000) / 10).toFixed(1)}%` : 'N/A';

    return {
      newUsersCount,
      returnedDay1,
      day1Rate,
      returnedDay7,
      day7Rate,
      returnedDay30,
      day30Rate,
    };
  }

  /**
   * Helper to format date label safely as YYYY-MM-DD
   */
  private static formatDateLabel(rawDate: any): string {
    if (!rawDate) return '';
    if (typeof rawDate === 'string') {
      return rawDate.slice(0, 10);
    }
    if (rawDate instanceof Date) {
      return rawDate.toISOString().slice(0, 10);
    }
    return String(rawDate);
  }
}

export default AnalyticsModel;
