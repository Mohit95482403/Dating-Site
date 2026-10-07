import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { logger } from '../utils/logger';
import type {
  FeatureKey,
  PlanCode,
  PlanLimits,
  UserEntitlements,
  ActiveBoostInfo,
  FeatureUsageSummary,
} from '../types/subscription.types';

export class EntitlementService {
  /**
   * Get complete user entitlements, effective plan, features, limits, and daily usage
   */
  public static async getUserEntitlements(userId: number): Promise<UserEntitlements> {
    const conn = await pool.getConnection();
    try {
      // 1. Auto-expire any past-due subscriptions for this user
      await conn.query(
        `UPDATE subscriptions 
         SET status = 'expired' 
         WHERE user_id = ? AND status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()`,
        [userId]
      );

      // 2. Auto-expire any active boosts that have lapsed
      await conn.query(
        `UPDATE profile_boosts 
         SET status = 'expired' 
         WHERE user_id = ? AND status = 'active' AND expires_at < NOW()`,
        [userId]
      );

      // 3. Fetch active or latest subscription + plan details
      const [subRows] = await conn.query<RowDataPacket[]>(
        `SELECT s.id as sub_id, s.status, s.started_at, s.expires_at,
                p.id as plan_id, p.code as plan_code, p.name as plan_name,
                p.features, p.limits, p.price_inr
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.user_id = ? AND s.status IN ('active', 'cancelled') 
           AND (s.expires_at IS NULL OR s.expires_at >= NOW())
         ORDER BY (p.code = 'PREMIUM_PLUS') DESC, (p.code = 'PREMIUM') DESC, s.id DESC
         LIMIT 1`,
        [userId]
      );

      let planCode: PlanCode = 'FREE';
      let planName = 'Connectly Free';
      let status: any = 'active';
      let startedAt: string | null = null;
      let expiresAt: string | null = null;
      let features: string[] = ['BASIC_MATCHING', 'TEXT_CHAT', 'AUDIO_VIDEO_CALLS'];
      let limits: PlanLimits = { dailyLikes: 25, dailySuperLikes: 1, dailyAiRequests: 5, monthlyBoosts: 0 };

      if (subRows.length > 0) {
        const sub = subRows[0];
        planCode = sub.plan_code as PlanCode;
        planName = sub.plan_name;
        status = sub.status;
        startedAt = sub.started_at ? new Date(sub.started_at).toISOString() : null;
        expiresAt = sub.expires_at ? new Date(sub.expires_at).toISOString() : null;
        features = typeof sub.features === 'string' ? JSON.parse(sub.features) : sub.features || [];
        limits = typeof sub.limits === 'string' ? JSON.parse(sub.limits) : sub.limits || limits;
      } else {
        // Retrieve Free plan defaults from database if available
        const [freePlanRows] = await conn.query<RowDataPacket[]>(
          `SELECT features, limits FROM subscription_plans WHERE code = 'FREE' LIMIT 1`
        );
        if (freePlanRows.length > 0) {
          const fp = freePlanRows[0];
          features = typeof fp.features === 'string' ? JSON.parse(fp.features) : fp.features;
          limits = typeof fp.limits === 'string' ? JSON.parse(fp.limits) : fp.limits;
        }
      }

      // 4. Check today's feature usage
      const [usageRows] = await conn.query<RowDataPacket[]>(
        `SELECT feature_key, usage_count 
         FROM feature_usage 
         WHERE user_id = ? AND window_date = CURDATE()`,
        [userId]
      );

      const usageMap: Record<string, number> = {};
      for (const row of usageRows) {
        usageMap[row.feature_key] = Number(row.usage_count || 0);
      }

      const likesUsed = usageMap['likes'] || 0;
      const superLikesUsed = usageMap['super_likes'] || 0;
      const aiRequestsUsed = usageMap['ai_requests'] || 0;

      // 5. Check monthly boosts used in last 30 days
      const [boostRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count 
         FROM profile_boosts 
         WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId]
      );
      const boostsUsedThisMonth = Number(boostRows[0]?.count || 0);

      const likesRemaining = limits.dailyLikes === -1 ? -1 : Math.max(0, limits.dailyLikes - likesUsed);
      const superLikesRemaining = Math.max(0, limits.dailySuperLikes - superLikesUsed);
      const aiRequestsRemaining = limits.dailyAiRequests === -1 ? -1 : Math.max(0, limits.dailyAiRequests - aiRequestsUsed);
      const boostsRemaining = Math.max(0, limits.monthlyBoosts - boostsUsedThisMonth);

      const usage: FeatureUsageSummary = {
        likesUsed,
        likesRemaining,
        superLikesUsed,
        superLikesRemaining,
        aiRequestsUsed,
        aiRequestsRemaining,
        boostsUsedThisMonth,
        boostsRemaining,
      };

      // 6. Check currently active boost
      const [activeBoostRows] = await conn.query<RowDataPacket[]>(
        `SELECT started_at, expires_at, multiplier, TIMESTAMPDIFF(SECOND, NOW(), expires_at) as remaining_seconds
         FROM profile_boosts 
         WHERE user_id = ? AND status = 'active' AND expires_at > NOW() 
         ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      let activeBoost: ActiveBoostInfo = {
        isActive: false,
        startedAt: null,
        expiresAt: null,
        remainingSeconds: 0,
        multiplier: 1.0,
      };

      if (activeBoostRows.length > 0) {
        const b = activeBoostRows[0];
        activeBoost = {
          isActive: true,
          startedAt: b.started_at ? new Date(b.started_at).toISOString() : null,
          expiresAt: new Date(b.expires_at).toISOString(),
          remainingSeconds: Math.max(0, Number(b.remaining_seconds || 0)),
          multiplier: Number(b.multiplier || 2.5),
        };
      }

      const isPremium = planCode === 'PREMIUM' || planCode === 'PREMIUM_PLUS';
      const badge = planCode === 'PREMIUM_PLUS' ? 'VIP' : isPremium ? 'PRO' : null;

      return {
        planCode,
        planName,
        isPremium,
        badge,
        status,
        startedAt,
        expiresAt,
        features,
        limits,
        usage,
        activeBoost,
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Check if a user possesses a specific entitlement feature
   */
  public static async hasFeature(userId: number, featureKey: FeatureKey): Promise<boolean> {
    const entitlements = await this.getUserEntitlements(userId);
    return entitlements.features.includes(featureKey);
  }

  /**
   * Centralized quota validation and atomic usage increment
   */
  public static async checkAndIncrementUsage(
    userId: number,
    featureKey: 'likes' | 'super_likes' | 'boosts' | 'ai_requests'
  ): Promise<{ allowed: boolean; remaining: number; limit: number; isPremium: boolean }> {
    const entitlements = await this.getUserEntitlements(userId);
    const { limits, usage, isPremium } = entitlements;

    let limit = 0;
    let currentUsage = 0;

    if (featureKey === 'likes') {
      limit = limits.dailyLikes;
      currentUsage = usage.likesUsed;
    } else if (featureKey === 'super_likes') {
      limit = limits.dailySuperLikes;
      currentUsage = usage.superLikesUsed;
    } else if (featureKey === 'ai_requests') {
      limit = limits.dailyAiRequests;
      currentUsage = usage.aiRequestsUsed;
    } else if (featureKey === 'boosts') {
      limit = limits.monthlyBoosts;
      currentUsage = usage.boostsUsedThisMonth;
    }

    // Unlimited quota check
    if (limit === -1) {
      if (featureKey !== 'boosts') {
        await this.incrementDailyUsage(userId, featureKey);
      }
      return { allowed: true, remaining: -1, limit: -1, isPremium };
    }

    // Zero allowance (e.g. Free users trying to boost without entitlement)
    if (limit === 0) {
      return { allowed: false, remaining: 0, limit: 0, isPremium };
    }

    // Quota exhausted
    if (currentUsage >= limit) {
      return { allowed: false, remaining: 0, limit, isPremium };
    }

    // Permitted: atomic increment
    if (featureKey !== 'boosts') {
      await this.incrementDailyUsage(userId, featureKey);
    }

    const remaining = Math.max(0, limit - (currentUsage + 1));
    return { allowed: true, remaining, limit, isPremium };
  }

  /**
   * Atomic daily counter increment in MySQL
   */
  private static async incrementDailyUsage(
    userId: number,
    featureKey: 'likes' | 'super_likes' | 'ai_requests'
  ): Promise<void> {
    await pool.query(
      `INSERT INTO feature_usage (user_id, feature_key, usage_count, window_date)
       VALUES (?, ?, 1, CURDATE())
       ON DUPLICATE KEY UPDATE usage_count = usage_count + 1`,
      [userId, featureKey]
    );
  }
}

export default EntitlementService;
