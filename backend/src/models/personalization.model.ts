// Connectly Day 26: AI Personalization, Recommendation Intelligence & Behavioral Learning Model
// Handles behavior event logging, deterministic interest modeling, hard filter enforcement, candidate generation, and telemetry

import { query, execute } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logger } from '../utils/logger';
import {
  BehaviorEventType,
  ALLOWED_BEHAVIOR_EVENTS,
  EntityType,
  RecommendationType,
  FeedbackType,
  ExposureAction,
  PersonalizationSettings,
  RecommendationExperiment,
  AdminPersonalizationAnalytics,
} from '../types/personalization.types';

export class PersonalizationModel {
  // ────────────────────────── BEHAVIOR EVENTS ──────────────────────────

  /**
   * Record a single validated behavioral event
   */
  public static async recordBehaviorEvent(
    userId: number,
    eventType: BehaviorEventType,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!ALLOWED_BEHAVIOR_EVENTS.includes(eventType)) {
      logger.warn(`[PersonalizationModel] Disallowed behavior event type attempted: ${eventType}`);
      return false;
    }

    try {
      await execute(
        `INSERT INTO user_behavior_events (user_id, event_type, entity_type, entity_id, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, eventType, entityType, String(entityId), metadata ? JSON.stringify(metadata) : null]
      );

      // Async trigger soft interest reinforcement based on event
      this.reinforceInterestsFromBehavior(userId, eventType, entityType, entityId, metadata).catch((err) => {
        logger.debug('[PersonalizationModel] reinforceInterestsFromBehavior non-critical error:', err);
      });

      return true;
    } catch (err) {
      logger.error('[PersonalizationModel] Error recording behavior event:', err);
      return false;
    }
  }

  /**
   * Batch ingest behavioral events with validation and maximum batch size (50)
   */
  public static async recordBatchBehaviorEvents(
    userId: number,
    events: Array<{
      eventType: BehaviorEventType;
      entityType: EntityType;
      entityId: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<{ inserted: number; rejected: number }> {
    const validEvents = events
      .slice(0, 50)
      .filter((ev) => ALLOWED_BEHAVIOR_EVENTS.includes(ev.eventType) && ev.entityType && ev.entityId);

    if (validEvents.length === 0) {
      return { inserted: 0, rejected: events.length };
    }

    try {
      const valuesSql = validEvents.map(() => `(?, ?, ?, ?, ?)`).join(', ');
      const params: any[] = [];
      for (const ev of validEvents) {
        params.push(userId, ev.eventType, ev.entityType, String(ev.entityId), ev.metadata ? JSON.stringify(ev.metadata) : null);
      }

      await execute(
        `INSERT INTO user_behavior_events (user_id, event_type, entity_type, entity_id, metadata)
         VALUES ${valuesSql}`,
        params
      );

      // Reinforce top events
      for (const ev of validEvents.slice(0, 10)) {
        this.reinforceInterestsFromBehavior(userId, ev.eventType, ev.entityType, ev.entityId, ev.metadata).catch(() => {});
      }

      return { inserted: validEvents.length, rejected: events.length - validEvents.length };
    } catch (err) {
      logger.error('[PersonalizationModel] Batch behavior events error:', err);
      return { inserted: 0, rejected: events.length };
    }
  }

  /**
   * Reinforce interests from permitted non-sensitive interactions
   */
  private static async reinforceInterestsFromBehavior(
    userId: number,
    eventType: BehaviorEventType,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    let weight = 0.5;
    if (eventType === 'COMMUNITY_JOIN' || eventType === 'EVENT_RSVP') weight = 2.0;
    else if (eventType === 'POST_LIKE' || eventType === 'POST_SAVE') weight = 1.0;
    else if (eventType === 'PROFILE_LIKE') weight = 1.5;
    else if (eventType === 'SEARCH' || eventType === 'POST_VIEW') weight = 0.3;

    // Check if event maps to community or post with relevant interest keywords
    if (entityType === 'COMMUNITY') {
      const rows = await query<RowDataPacket[]>(
        `SELECT c.category_id, cc.slug as category_slug 
         FROM communities c 
         JOIN community_categories cc ON c.category_id = cc.id 
         WHERE c.id = ? LIMIT 1`,
        [Number(entityId)]
      );
      if (rows.length > 0) {
        const catSlug = rows[0].category_slug;
        const interestRows = await query<RowDataPacket[]>(
          `SELECT id FROM interests WHERE slug = ? OR slug LIKE ? LIMIT 1`,
          [catSlug, `%${catSlug}%`]
        );
        if (interestRows.length > 0) {
          await this.incrementInterestScore(userId, interestRows[0].id, weight, 'COMMUNITY', 0.85);
        }
      }
    } else if (entityType === 'EVENT') {
      const rows = await query<RowDataPacket[]>(
        `SELECT ce.community_id, cc.slug as category_slug
         FROM community_events ce
         JOIN communities c ON ce.community_id = c.id
         JOIN community_categories cc ON c.category_id = cc.id
         WHERE ce.id = ? LIMIT 1`,
        [Number(entityId)]
      );
      if (rows.length > 0) {
        const catSlug = rows[0].category_slug;
        const interestRows = await query<RowDataPacket[]>(
          `SELECT id FROM interests WHERE slug = ? OR slug LIKE ? LIMIT 1`,
          [catSlug, `%${catSlug}%`]
        );
        if (interestRows.length > 0) {
          await this.incrementInterestScore(userId, interestRows[0].id, weight, 'EVENT', 0.9);
        }
      }
    } else if (entityType === 'PROFILE' && eventType === 'PROFILE_LIKE') {
      // Find candidate's interests and reinforce them with light weight
      const candidateInterests = await query<RowDataPacket[]>(
        `SELECT interest_id FROM user_interests WHERE user_id = ? LIMIT 5`,
        [Number(entityId)]
      );
      for (const ci of candidateInterests) {
        await this.incrementInterestScore(userId, ci.interest_id, 0.4, 'BEHAVIORAL', 0.7);
      }
    }
  }

  // ────────────────────────── INTEREST MODEL ──────────────────────────

  /**
   * Increment an interest score with bounds and source attribution
   */
  public static async incrementInterestScore(
    userId: number,
    interestId: number,
    delta: number,
    source: 'EXPLICIT' | 'BEHAVIORAL' | 'COMMUNITY' | 'EVENT' | 'POST' | 'AI',
    confidence: number = 0.8
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO user_interest_scores (user_id, interest_id, score, source, confidence, last_updated)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
           score = LEAST(25.0, score + ?),
           confidence = GREATEST(confidence, ?),
           last_updated = NOW()`,
        [userId, interestId, delta, source, confidence, delta, confidence]
      );
    } catch (err) {
      logger.debug('[PersonalizationModel] incrementInterestScore error:', err);
    }
  }

  /**
   * Sync explicit interests from user_interests table to ensure they carry strong baseline score (10.0)
   */
  public static async syncExplicitInterests(userId: number): Promise<void> {
    try {
      const explicitRows = await query<RowDataPacket[]>(
        `SELECT interest_id FROM user_interests WHERE user_id = ?`,
        [userId]
      );

      for (const row of explicitRows) {
        await execute(
          `INSERT INTO user_interest_scores (user_id, interest_id, score, source, confidence, last_updated)
           VALUES (?, ?, 10.0, 'EXPLICIT', 1.0, NOW())
           ON DUPLICATE KEY UPDATE 
             score = GREATEST(score, 10.0),
             source = 'EXPLICIT',
             confidence = 1.0,
             last_updated = NOW()`,
          [userId, row.interest_id]
        );
      }
    } catch (err) {
      logger.error('[PersonalizationModel] syncExplicitInterests error:', err);
    }
  }

  /**
   * Apply deterministic time decay to behavioral interest scores
   * Formula: score = score * (0.95 ^ days_elapsed)
   */
  public static async applyInterestDecay(userId: number): Promise<void> {
    try {
      await execute(
        `UPDATE user_interest_scores
         SET score = GREATEST(0.1, score * POWER(0.95, GREATEST(0, DATEDIFF(NOW(), last_updated)))),
             last_updated = NOW()
         WHERE user_id = ? AND source != 'EXPLICIT' AND DATEDIFF(NOW(), last_updated) > 0`,
        [userId]
      );
    } catch (err) {
      logger.debug('[PersonalizationModel] applyInterestDecay error:', err);
    }
  }

  /**
   * Get user's scored interests (both explicit and inferred)
   */
  public static async getUserInterestScores(userId: number): Promise<Array<{
    interest_id: number;
    name: string;
    slug: string;
    score: number;
    source: string;
    confidence: number;
  }>> {
    const rows = await query<RowDataPacket[]>(
      `SELECT uis.interest_id, i.name, i.slug, uis.score, uis.source, uis.confidence
       FROM user_interest_scores uis
       JOIN interests i ON uis.interest_id = i.id
       WHERE uis.user_id = ? AND uis.score > 0.1
       ORDER BY uis.score DESC
       LIMIT 30`,
      [userId]
    );

    return rows.map((r) => ({
      interest_id: Number(r.interest_id),
      name: String(r.name),
      slug: String(r.slug),
      score: Number(r.score),
      source: String(r.source),
      confidence: Number(r.confidence),
    }));
  }

  /**
   * Reset personalization for user:
   * Clears inferred/behavioral scores and feedback, retaining explicit profile selections
   */
  public static async resetPersonalization(userId: number): Promise<void> {
    await execute(`DELETE FROM user_interest_scores WHERE user_id = ? AND source != 'EXPLICIT'`, [userId]);
    await execute(`DELETE FROM recommendation_feedback WHERE user_id = ?`, [userId]);
    await execute(`DELETE FROM user_behavior_events WHERE user_id = ?`, [userId]);
    await this.syncExplicitInterests(userId);
  }

  // ────────────────────────── PERSONALIZATION SETTINGS ──────────────────────────

  /**
   * Fetch personalization settings or initialize with defaults
   */
  public static async getPersonalizationSettings(userId: number): Promise<PersonalizationSettings> {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM personalization_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: Number(r.id),
        user_id: Number(r.user_id),
        personalized_recommendations: Boolean(r.personalized_recommendations),
        personalized_feed: Boolean(r.personalized_feed),
        personalized_communities: Boolean(r.personalized_communities),
        personalized_events: Boolean(r.personalized_events),
        search_personalization: Boolean(r.search_personalization),
        ai_recommendations: Boolean(r.ai_recommendations),
        experiment_version: String(r.experiment_version || 'v1'),
        updated_at: r.updated_at,
      };
    }

    // Deterministic A/B experiment assignment based on userId hash
    const experimentVersion = userId % 2 === 0 ? 'v2' : 'v1';

    await execute(
      `INSERT INTO personalization_settings (user_id, experiment_version)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE experiment_version = VALUES(experiment_version)`,
      [userId, experimentVersion]
    );

    return {
      user_id: userId,
      personalized_recommendations: true,
      personalized_feed: true,
      personalized_communities: true,
      personalized_events: true,
      search_personalization: true,
      ai_recommendations: true,
      experiment_version: experimentVersion,
    };
  }

  /**
   * Update personalization settings
   */
  public static async updatePersonalizationSettings(
    userId: number,
    settings: Partial<PersonalizationSettings>
  ): Promise<PersonalizationSettings> {
    await this.getPersonalizationSettings(userId); // ensure row exists

    const updates: string[] = [];
    const params: any[] = [];

    if (settings.personalized_recommendations !== undefined) {
      updates.push('personalized_recommendations = ?');
      params.push(Boolean(settings.personalized_recommendations));
    }
    if (settings.personalized_feed !== undefined) {
      updates.push('personalized_feed = ?');
      params.push(Boolean(settings.personalized_feed));
    }
    if (settings.personalized_communities !== undefined) {
      updates.push('personalized_communities = ?');
      params.push(Boolean(settings.personalized_communities));
    }
    if (settings.personalized_events !== undefined) {
      updates.push('personalized_events = ?');
      params.push(Boolean(settings.personalized_events));
    }
    if (settings.search_personalization !== undefined) {
      updates.push('search_personalization = ?');
      params.push(Boolean(settings.search_personalization));
    }
    if (settings.ai_recommendations !== undefined) {
      updates.push('ai_recommendations = ?');
      params.push(Boolean(settings.ai_recommendations));
    }

    if (updates.length > 0) {
      params.push(userId);
      await execute(`UPDATE personalization_settings SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }

    return this.getPersonalizationSettings(userId);
  }

  // ────────────────────────── EXPOSURE & FEEDBACK ──────────────────────────

  /**
   * Record recommendation exposure/interaction
   */
  public static async recordRecommendationExposure(
    userId: number,
    recommendationType: RecommendationType,
    entityId: string,
    action: ExposureAction,
    experimentVersion: string = 'v1',
    score?: number
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO recommendation_exposures (user_id, recommendation_type, entity_id, action, experiment_version, score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, recommendationType, String(entityId), action, experimentVersion, score || null]
      );
    } catch (err) {
      logger.debug('[PersonalizationModel] recordRecommendationExposure error:', err);
    }
  }

  /**
   * Record explicit negative feedback: NOT_INTERESTED, SHOW_LESS, DISMISS
   */
  public static async recordRecommendationFeedback(
    userId: number,
    recommendationType: RecommendationType,
    entityId: string,
    feedbackType: FeedbackType,
    reason?: string
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO recommendation_feedback (user_id, recommendation_type, entity_id, feedback_type, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, recommendationType, String(entityId), feedbackType, reason || null]
      );
    } catch (err) {
      logger.error('[PersonalizationModel] recordRecommendationFeedback error:', err);
    }
  }

  /**
   * Get set of entity IDs user dismissed or marked as not interested
   */
  public static async getNegativeFeedbackEntityIds(
    userId: number,
    recommendationType: RecommendationType
  ): Promise<Set<string>> {
    const rows = await query<RowDataPacket[]>(
      `SELECT entity_id FROM recommendation_feedback 
       WHERE user_id = ? AND recommendation_type = ? AND feedback_type IN ('NOT_INTERESTED', 'DISMISS')`,
      [userId, recommendationType]
    );
    return new Set(rows.map((r) => String(r.entity_id)));
  }

  /**
   * Get recent recommendation exposures for repetition penalty
   */
  public static async getRecentExposures(
    userId: number,
    recommendationType: RecommendationType,
    days: number = 7
  ): Promise<Map<string, number>> {
    const rows = await query<RowDataPacket[]>(
      `SELECT entity_id, COUNT(*) as count 
       FROM recommendation_exposures 
       WHERE user_id = ? AND recommendation_type = ? AND action = 'SHOWN' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY entity_id`,
      [userId, recommendationType, days]
    );

    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(String(r.entity_id), Number(r.count));
    }
    return map;
  }

  // ────────────────────────── HARD FILTERING HELPERS ──────────────────────────

  /**
   * Retrieve all user IDs that MUST be hard-filtered for safety, privacy, or blocking:
   * - Blocked by user or blocking user
   * - Users with active account restrictions
   * - Users who already have an active match or like (if specified)
   */
  public static async getHardExcludedUserIds(userId: number): Promise<Set<number>> {
    const excluded = new Set<number>();
    excluded.add(userId);

    // 1. Blocks (bidirectional)
    try {
      const blockRows = await query<RowDataPacket[]>(
        `SELECT blocked_user_id as id FROM blocks WHERE blocker_id = ?
         UNION
         SELECT blocker_id as id FROM blocks WHERE blocked_user_id = ?`,
        [userId, userId]
      );
      for (const r of blockRows) excluded.add(Number(r.id));
    } catch (err) {
      logger.debug('[PersonalizationModel] blocks check error:', err);
    }

    // 2. Active account restrictions (banned/locked)
    try {
      const restRows = await query<RowDataPacket[]>(
        `SELECT user_id as id FROM account_restrictions WHERE is_active = TRUE`
      );
      for (const r of restRows) excluded.add(Number(r.id));
    } catch (err) {
      logger.debug('[PersonalizationModel] restrictions check error:', err);
    }

    // 3. Discovery disabled users
    try {
      const discRows = await query<RowDataPacket[]>(
        `SELECT user_id as id FROM user_settings WHERE show_in_discovery = FALSE`
      );
      for (const r of discRows) excluded.add(Number(r.id));
    } catch (err) {
      logger.debug('[PersonalizationModel] discovery check error:', err);
    }

    return excluded;
  }

  // ────────────────────────── CANDIDATE GENERATION ──────────────────────────

  /**
   * Candidate People Generation with Hard Filters & Soft Signals
   */
  public static async getCandidatePeople(
    userId: number,
    excludedUserIds: Set<number>,
    limit: number = 20
  ): Promise<any[]> {
    const excludedArr = Array.from(excludedUserIds);
    const excludePlaceholders = excludedArr.length > 0 ? excludedArr.map(() => '?').join(', ') : '0';

    const sql = `
      SELECT 
        u.id as user_id,
        u.email,
        u.role,
        u.status,
        u.is_email_verified as user_email_verified,
        p.first_name,
        p.last_name,
        p.bio,
        p.gender,
        p.date_of_birth,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
        p.occupation,
        p.location_city,
        p.location_country,
        (SELECT ph.file_url FROM photos ph WHERE ph.user_id = u.id ORDER BY ph.is_primary DESC, ph.display_order ASC, ph.id ASC LIMIT 1) as avatar_url,
        p.is_verified as profile_verified,
        p.is_profile_complete,
        u.last_seen_at,
        p.created_at,
        -- Premium boost check
        EXISTS (
          SELECT 1 FROM subscriptions s 
          WHERE s.user_id = u.id AND s.status = 'active'
        ) as has_active_subscription,
        (
          SELECT GROUP_CONCAT(i.name SEPARATOR ',')
          FROM user_interests ui
          JOIN interests i ON ui.interest_id = i.id
          WHERE ui.user_id = u.id
        ) as interests_str,
        (
          SELECT COUNT(*)
          FROM user_interests ui1
          JOIN user_interests ui2 ON ui1.interest_id = ui2.interest_id
          WHERE ui1.user_id = ? AND ui2.user_id = u.id
        ) as shared_interests_count,
        (
          SELECT COUNT(*)
          FROM community_members cm1
          JOIN community_members cm2 ON cm1.community_id = cm2.community_id
          WHERE cm1.user_id = ? AND cm2.user_id = u.id AND cm1.status = 'active' AND cm2.status = 'active'
        ) as shared_communities_count
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id NOT IN (${excludePlaceholders})
        AND u.status = 'active'
        AND p.first_name IS NOT NULL
        AND (us.show_in_discovery IS NULL OR us.show_in_discovery = TRUE)
      ORDER BY 
        shared_interests_count DESC,
        shared_communities_count DESC,
        u.last_seen_at DESC
      LIMIT ?
    `;

    const params: any[] = [userId, userId, ...excludedArr, limit];
    return await query<RowDataPacket[]>(sql, params);
  }

  /**
   * Candidate Community Generation with Hard Filters
   */
  public static async getCandidateCommunities(
    userId: number,
    feedbackExcludedIds: Set<string>,
    limit: number = 15
  ): Promise<any[]> {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.category_id,
        c.cover_image,
        c.avatar_image,
        c.visibility,
        c.join_policy,
        c.member_count,
        c.post_count,
        c.event_count,
        c.is_boosted,
        cc.name as category_name,
        cc.slug as category_slug,
        -- Check if category matches user's interests
        (
          SELECT COUNT(*)
          FROM user_interests ui
          JOIN interests i ON ui.interest_id = i.id
          WHERE ui.user_id = ? AND (i.slug = cc.slug OR cc.slug LIKE CONCAT('%', i.slug, '%'))
        ) as category_interest_match
      FROM communities c
      JOIN community_categories cc ON c.category_id = cc.id
      WHERE c.status = 'active'
        AND c.visibility = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM community_members cm 
          WHERE cm.community_id = c.id AND cm.user_id = ? AND cm.status = 'active'
        )
      ORDER BY 
        c.is_boosted DESC,
        category_interest_match DESC,
        c.member_count DESC
      LIMIT ?
    `;

    const rows = await query<RowDataPacket[]>(sql, [userId, userId, limit * 2]);
    return rows.filter((r) => !feedbackExcludedIds.has(String(r.id))).slice(0, limit);
  }

  /**
   * Candidate Community Event Generation with Hard Filters
   */
  public static async getCandidateEvents(
    userId: number,
    feedbackExcludedIds: Set<string>,
    limit: number = 15
  ): Promise<any[]> {
    const sql = `
      SELECT 
        ce.id,
        ce.community_id,
        ce.title,
        ce.description,
        ce.cover_image,
        ce.event_date,
        ce.start_time,
        ce.location_type,
        ce.location_name,
        ce.attendees_count,
        ce.max_attendees,
        c.name as community_name,
        c.slug as community_slug,
        cc.name as category_name,
        cc.slug as category_slug,
        (
          SELECT COUNT(*)
          FROM user_interests ui
          JOIN interests i ON ui.interest_id = i.id
          WHERE ui.user_id = ? AND (i.slug = cc.slug OR cc.slug LIKE CONCAT('%', i.slug, '%'))
        ) as category_interest_match,
        (
          SELECT status FROM community_event_rsvps rsvp
          WHERE rsvp.event_id = ce.id AND rsvp.user_id = ?
        ) as user_rsvp_status
      FROM community_events ce
      JOIN communities c ON ce.community_id = c.id
      JOIN community_categories cc ON c.category_id = cc.id
      WHERE ce.status = 'scheduled'
        AND ce.event_date >= CURDATE()
        AND c.status = 'active'
      ORDER BY 
        ce.event_date ASC,
        category_interest_match DESC,
        ce.attendees_count DESC
      LIMIT ?
    `;

    const rows = await query<RowDataPacket[]>(sql, [userId, userId, limit * 2]);
    return rows
      .filter((r) => !feedbackExcludedIds.has(String(r.id)) && r.user_rsvp_status !== 'going' && r.user_rsvp_status !== 'not_going')
      .slice(0, limit);
  }

  /**
   * Candidate Social Feed Posts Generation with Hard Filters
   */
  public static async getCandidatePosts(
    userId: number,
    excludedAuthorIds: Set<number>,
    feedbackExcludedIds: Set<string>,
    limit: number = 20
  ): Promise<any[]> {
    const excludedArr = Array.from(excludedAuthorIds);
    const excludePlaceholders = excludedArr.length > 0 ? excludedArr.map(() => '?').join(', ') : '0';

    const sql = `
      SELECT 
        p.id,
        p.user_id,
        p.community_id,
        p.content,
        p.visibility,
        p.likes_count,
        p.comments_count,
        p.shares_count,
        p.created_at,
        u.email as author_email,
        pr.first_name as author_first_name,
        pr.last_name as author_last_name,
        (SELECT ph.file_url FROM photos ph WHERE ph.user_id = u.id ORDER BY ph.is_primary DESC, ph.display_order ASC, ph.id ASC LIMIT 1) as author_avatar_url,
        pr.is_verified as author_verified,
        c.name as community_name,
        c.slug as community_slug,
        EXISTS (
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?
        ) as is_liked_by_user
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN profiles pr ON u.id = pr.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      WHERE p.status = 'active'
        AND p.visibility = 'public'
        AND p.user_id NOT IN (${excludePlaceholders})
      ORDER BY 
        p.created_at DESC,
        p.likes_count DESC
      LIMIT ?
    `;

    const params: any[] = [userId, ...excludedArr, limit * 2];
    const rows = await query<RowDataPacket[]>(sql, params);
    return rows.filter((r) => !feedbackExcludedIds.has(String(r.id))).slice(0, limit);
  }

  /**
   * Candidate Trending For User (combining global trend volume + personal interest affinity)
   */
  public static async getCandidateTrending(
    userId: number,
    limit: number = 10
  ): Promise<any[]> {
    // Top hashtags from Day 23 exploration
    const sql = `
      SELECT 
        h.id,
        h.name,
        h.posts_count,
        (
          SELECT COUNT(*) 
          FROM user_interests ui 
          JOIN interests i ON ui.interest_id = i.id 
          WHERE ui.user_id = ? AND LOWER(i.name) = LOWER(h.name)
        ) as is_user_interest
      FROM hashtags h
      WHERE h.posts_count > 0
      ORDER BY 
        is_user_interest DESC,
        h.posts_count DESC
      LIMIT ?
    `;

    return await query<RowDataPacket[]>(sql, [userId, limit]);
  }

  // ────────────────────────── ADMIN ANALYTICS & EXPERIMENTS ──────────────────────────

  /**
   * Aggregated recommendation performance metrics for admin dashboard
   */
  public static async getAdminRecommendationAnalytics(): Promise<AdminPersonalizationAnalytics> {
    // 1. Overall exposures and actions
    const [exposureTotals] = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_impressions,
        SUM(CASE WHEN action = 'CLICKED' THEN 1 ELSE 0 END) as total_clicks,
        SUM(CASE WHEN action = 'LIKED' THEN 1 ELSE 0 END) as total_likes,
        SUM(CASE WHEN action = 'SKIPPED' THEN 1 ELSE 0 END) as total_skips
      FROM recommendation_exposures
    `);

    const totalImpressions = Number(exposureTotals?.total_impressions) || 0;
    const totalClicks = Number(exposureTotals?.total_clicks) || 0;
    const totalLikes = Number(exposureTotals?.total_likes) || 0;
    const totalSkips = Number(exposureTotals?.total_skips) || 0;
    const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    // 2. Feedback totals
    const [feedbackTotals] = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_feedback,
        SUM(CASE WHEN feedback_type = 'NOT_INTERESTED' THEN 1 ELSE 0 END) as not_interested_count
      FROM recommendation_feedback
    `);
    const totalFeedback = Number(feedbackTotals?.total_feedback) || 0;
    const notInterestedCount = Number(feedbackTotals?.not_interested_count) || 0;
    const notInterestedRate = totalImpressions > 0 ? Number(((notInterestedCount / totalImpressions) * 100).toFixed(2)) : 0;

    // 3. Recommendation Type Breakdown
    const typeBreakdownRows = await query<RowDataPacket[]>(`
      SELECT 
        recommendation_type,
        COUNT(*) as impressions,
        SUM(CASE WHEN action = 'CLICKED' THEN 1 ELSE 0 END) as clicks
      FROM recommendation_exposures
      GROUP BY recommendation_type
    `);
    const recommendationTypeBreakdown = typeBreakdownRows.map((r) => {
      const imps = Number(r.impressions) || 0;
      const clks = Number(r.clicks) || 0;
      return {
        type: r.recommendation_type as RecommendationType,
        impressions: imps,
        clicks: clks,
        ctr: imps > 0 ? Number(((clks / imps) * 100).toFixed(2)) : 0,
      };
    });

    // 4. Experiment performance
    const expRows = await query<RowDataPacket[]>(`
      SELECT 
        re.experiment_version as version,
        COUNT(DISTINCT re.user_id) as users,
        COUNT(*) as impressions,
        SUM(CASE WHEN re.action = 'CLICKED' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN re.action = 'LIKED' THEN 1 ELSE 0 END) as likes
      FROM recommendation_exposures re
      GROUP BY re.experiment_version
    `);

    const experiments = await query<RowDataPacket[]>(`SELECT version, name FROM recommendation_experiments`);
    const expMap = new Map<string, string>();
    for (const e of experiments) expMap.set(e.version, e.name);

    const experimentPerformance = expRows.map((r) => {
      const imps = Number(r.impressions) || 0;
      const clks = Number(r.clicks) || 0;
      const lks = Number(r.likes) || 0;
      return {
        version: String(r.version),
        name: expMap.get(String(r.version)) || String(r.version),
        users: Number(r.users) || 0,
        impressions: imps,
        clicks: clks,
        ctr: imps > 0 ? Number(((clks / imps) * 100).toFixed(2)) : 0,
        likeRate: imps > 0 ? Number(((lks / imps) * 100).toFixed(2)) : 0,
      };
    });

    // 5. Recent feedback items
    const recentFeedbackRows = await query<RowDataPacket[]>(`
      SELECT id, user_id, recommendation_type, entity_id, feedback_type, reason, created_at
      FROM recommendation_feedback
      ORDER BY created_at DESC
      LIMIT 15
    `);

    return {
      totalImpressions,
      totalClicks,
      ctr,
      totalLikes,
      totalSkips,
      totalFeedback,
      notInterestedRate,
      recommendationTypeBreakdown,
      experimentPerformance,
      recentFeedback: recentFeedbackRows.map((r) => ({
        id: Number(r.id),
        user_id: Number(r.user_id),
        recommendation_type: String(r.recommendation_type),
        entity_id: String(r.entity_id),
        feedback_type: String(r.feedback_type),
        reason: r.reason || null,
        created_at: String(r.created_at),
      })),
    };
  }

  /**
   * Get all recommendation experiments
   */
  public static async getRecommendationExperiments(): Promise<RecommendationExperiment[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM recommendation_experiments ORDER BY id ASC`
    );
    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      version: String(r.version),
      description: String(r.description || ''),
      traffic_percentage: Number(r.traffic_percentage),
      status: r.status as 'active' | 'paused' | 'completed',
      created_at: r.created_at,
    }));
  }
}
