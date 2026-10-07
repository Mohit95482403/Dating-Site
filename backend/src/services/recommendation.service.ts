// Connectly Day 26: Central Recommendation Intelligence & Behavioral Learning Service
// Unifies Candidate Generation, Hard Filters (Privacy, Safety, Restrictions),
// Deterministic Scoring, Controlled Diversity, Telemetry, and Real-time Invalidation

import { PersonalizationModel } from '../models/personalization.model';
import { RecommendationExplanationService } from './recommendationExplanation.service';
import { emitRecommendationsUpdated } from '../sockets/socket';
import { AIService } from './ai.service';
import {
  BehaviorEventType,
  EntityType,
  RecommendationType,
  FeedbackType,
  ExposureAction,
  PersonalizationSettings,
  PersonalizedHomeResponse,
  ScoredRecommendation,
  AdminPersonalizationAnalytics,
  RecommendationExperiment,
} from '../types/personalization.types';

// In-memory short-lived cache (60 seconds) with user-specific keys
interface CacheEntry {
  data: PersonalizedHomeResponse;
  expiresAt: number;
}
const homeCache = new Map<number, CacheEntry>();

export class RecommendationService {
  /**
   * Invalidate cached recommendations for a specific user
   */
  public static invalidateCache(userId: number): void {
    homeCache.delete(userId);
  }

  /**
   * Main Personalized Home Feed API
   */
  public static async getPersonalizedHome(userId: number, forceRefresh: boolean = false): Promise<PersonalizedHomeResponse> {
    const now = Date.now();
    if (!forceRefresh) {
      const cached = homeCache.get(userId);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }
    }

    // 1. Fetch user personalization settings & apply decay
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    await PersonalizationModel.applyInterestDecay(userId);
    await PersonalizationModel.syncExplicitInterests(userId);

    // 2. Fetch user interest model
    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);

    // 3. Candidate Generation with Hard Safety & Privacy Filters first
    const [hardExcludedUserIds, negativePeopleFeedback, negativeCommFeedback, negativeEventFeedback, negativePostFeedback] =
      await Promise.all([
        PersonalizationModel.getHardExcludedUserIds(userId),
        PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'PEOPLE'),
        PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'COMMUNITY'),
        PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'EVENT'),
        PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'POST'),
      ]);

    // Also exclude people who received negative feedback
    for (const pid of negativePeopleFeedback) {
      hardExcludedUserIds.add(Number(pid));
    }

    // 4. Fetch recent exposures for repetition penalty
    const [peopleExposures, commExposures] = await Promise.all([
      PersonalizationModel.getRecentExposures(userId, 'PEOPLE', 5),
      PersonalizationModel.getRecentExposures(userId, 'COMMUNITY', 5),
    ]);

    // 5. Parallel Candidate Generation
    const [rawPeople, rawCommunities, rawEvents, rawPosts, rawTrending] = await Promise.all([
      PersonalizationModel.getCandidatePeople(userId, hardExcludedUserIds, 15),
      PersonalizationModel.getCandidateCommunities(userId, negativeCommFeedback, 10),
      PersonalizationModel.getCandidateEvents(userId, negativeEventFeedback, 8),
      PersonalizationModel.getCandidatePosts(userId, hardExcludedUserIds, negativePostFeedback, 12),
      PersonalizationModel.getCandidateTrending(userId, 8),
    ]);

    // 6. Score & Rank People (with controlled premium boost and repetition penalty)
    const scoredPeople: ScoredRecommendation<any>[] = rawPeople.map((person) => {
      const sharedInterests = Number(person.shared_interests_count) || 0;
      const sharedCommunities = Number(person.shared_communities_count) || 0;
      const isComplete = Boolean(person.is_profile_complete);
      const isVerified = Boolean(person.profile_verified || person.user_email_verified);
      const hasSubscription = Boolean(person.has_active_subscription);

      // Repetition penalty
      const expCount = peopleExposures.get(String(person.user_id)) || 0;
      const repPenalty = Math.min(expCount * 1.5, 6.0);

      // Scoring formula
      let score =
        sharedInterests * 4.0 +
        sharedCommunities * 3.0 +
        (isComplete ? 2.0 : 0.0) +
        (isVerified ? 2.5 : 0.0) +
        (hasSubscription ? 3.0 : 0.0) -
        repPenalty;

      // Experiment V2 boosts behavioral community affinity higher
      if (settings.experiment_version === 'v2') {
        score += sharedCommunities * 1.5;
      }

      score = Math.max(0.5, Number(score.toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('PEOPLE', person, userInterestNames);

      // Async record shown exposure
      PersonalizationModel.recordRecommendationExposure(
        userId,
        'PEOPLE',
        String(person.user_id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: person,
        score,
        explanation,
        recommendationType: 'PEOPLE',
      };
    });
    scoredPeople.sort((a, b) => b.score - a.score);

    // 7. Score & Rank Communities
    const scoredCommunities: ScoredRecommendation<any>[] = rawCommunities.map((comm) => {
      const matchBonus = (Number(comm.category_interest_match) || 0) * 5.0;
      const boostedBonus = comm.is_boosted ? 3.5 : 0.0;
      const popularityBonus = Math.min((Number(comm.member_count) || 0) * 0.1, 4.0);
      const expCount = commExposures.get(String(comm.id)) || 0;
      const repPenalty = Math.min(expCount * 1.2, 4.0);

      let score = matchBonus + boostedBonus + popularityBonus - repPenalty;
      if (settings.experiment_version === 'v2') {
        score += matchBonus * 0.5;
      }
      score = Math.max(0.5, Number(score.toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('COMMUNITY', comm, userInterestNames);

      PersonalizationModel.recordRecommendationExposure(
        userId,
        'COMMUNITY',
        String(comm.id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: comm,
        score,
        explanation,
        recommendationType: 'COMMUNITY',
      };
    });
    scoredCommunities.sort((a, b) => b.score - a.score);

    // 8. Score & Rank Events
    const scoredEvents: ScoredRecommendation<any>[] = rawEvents.map((evt) => {
      const matchBonus = (Number(evt.category_interest_match) || 0) * 4.5;
      const attendeesBonus = Math.min((Number(evt.attendees_count) || 0) * 0.3, 3.5);
      const score = Math.max(0.5, Number((matchBonus + attendeesBonus + 2.0).toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('EVENT', evt, userInterestNames);

      PersonalizationModel.recordRecommendationExposure(
        userId,
        'EVENT',
        String(evt.id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: evt,
        score,
        explanation,
        recommendationType: 'EVENT',
      };
    });
    scoredEvents.sort((a, b) => b.score - a.score);

    // 9. Score & Rank Posts
    const scoredPosts: ScoredRecommendation<any>[] = rawPosts.map((post) => {
      const likesBonus = Math.min((Number(post.likes_count) || 0) * 0.4, 5.0);
      const commentsBonus = Math.min((Number(post.comments_count) || 0) * 0.6, 5.0);
      const score = Math.max(0.5, Number((likesBonus + commentsBonus + 1.5).toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('POST', post, userInterestNames);

      PersonalizationModel.recordRecommendationExposure(
        userId,
        'POST',
        String(post.id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: post,
        score,
        explanation,
        recommendationType: 'POST',
      };
    });
    scoredPosts.sort((a, b) => b.score - a.score);

    // 10. Score & Rank Trending
    const scoredTrending: ScoredRecommendation<any>[] = rawTrending.map((tr) => {
      const isInterest = Number(tr.is_user_interest) > 0;
      const countScore = Math.min((Number(tr.posts_count) || 0) * 0.5, 10.0);
      const score = Math.max(0.5, Number((countScore + (isInterest ? 5.0 : 0.0)).toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('TRENDING', tr, userInterestNames);

      return {
        item: tr,
        score,
        explanation,
        recommendationType: 'TRENDING',
      };
    });
    scoredTrending.sort((a, b) => b.score - a.score);

    // Assemble final response
    const inferredInterests = scoredInterests
      .filter((si) => si.source !== 'EXPLICIT')
      .map((si) => ({
        interest_id: si.interest_id,
        name: si.name,
        score: si.score,
        source: si.source,
      }));

    const explicitInterests = scoredInterests
      .filter((si) => si.source === 'EXPLICIT')
      .map((si) => ({
        interest_id: si.interest_id,
        name: si.name,
      }));

    const response: PersonalizedHomeResponse = {
      experimentVersion: settings.experiment_version,
      people: scoredPeople.slice(0, 8),
      communities: scoredCommunities.slice(0, 6),
      events: scoredEvents.slice(0, 5),
      posts: scoredPosts.slice(0, 8),
      trending: scoredTrending.slice(0, 6),
      inferredInterests,
      explicitInterests,
      userSettings: settings,
    };

    // Store in cache for 60 seconds
    homeCache.set(userId, { data: response, expiresAt: now + 60 * 1000 });

    return response;
  }

  /**
   * People Recommendations standalone endpoint
   */
  public static async getPeopleRecommendations(userId: number, limit: number = 20): Promise<ScoredRecommendation<any>[]> {
    const hardExcludedUserIds = await PersonalizationModel.getHardExcludedUserIds(userId);
    const negativeFeedback = await PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'PEOPLE');
    for (const id of negativeFeedback) hardExcludedUserIds.add(Number(id));

    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);
    const exposures = await PersonalizationModel.getRecentExposures(userId, 'PEOPLE', 5);

    const candidates = await PersonalizationModel.getCandidatePeople(userId, hardExcludedUserIds, limit);

    return candidates.map((p): ScoredRecommendation<any> => {
      const expCount = exposures.get(String(p.user_id)) || 0;
      const score = Math.max(
        0.5,
        Number(
          (
            (Number(p.shared_interests_count) || 0) * 4.0 +
            (Number(p.shared_communities_count) || 0) * 3.0 +
            (p.is_profile_complete ? 2.0 : 0.0) +
            (p.profile_verified ? 2.5 : 0.0) +
            (p.has_active_subscription ? 3.0 : 0.0) -
            Math.min(expCount * 1.5, 6.0)
          ).toFixed(2)
        )
      );
      return {
        item: p,
        score,
        explanation: RecommendationExplanationService.generateExplanation('PEOPLE', p, userInterestNames),
        recommendationType: 'PEOPLE',
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Community Recommendations standalone endpoint
   */
  public static async getCommunityRecommendations(userId: number, limit: number = 15): Promise<ScoredRecommendation<any>[]> {
    const negativeFeedback = await PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'COMMUNITY');
    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);
    const exposures = await PersonalizationModel.getRecentExposures(userId, 'COMMUNITY', 5);

    const candidates = await PersonalizationModel.getCandidateCommunities(userId, negativeFeedback, limit);

    return candidates.map((c): ScoredRecommendation<any> => {
      const expCount = exposures.get(String(c.id)) || 0;
      const score = Math.max(
        0.5,
        Number(
          (
            (Number(c.category_interest_match) || 0) * 5.0 +
            (c.is_boosted ? 3.5 : 0.0) +
            Math.min((Number(c.member_count) || 0) * 0.1, 4.0) -
            Math.min(expCount * 1.2, 4.0)
          ).toFixed(2)
        )
      );
      return {
        item: c,
        score,
        explanation: RecommendationExplanationService.generateExplanation('COMMUNITY', c, userInterestNames),
        recommendationType: 'COMMUNITY',
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Event Recommendations standalone endpoint
   */
  public static async getEventRecommendations(userId: number, limit: number = 15): Promise<ScoredRecommendation<any>[]> {
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    const negativeFeedback = await PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'EVENT');
    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);
    const exposures = await PersonalizationModel.getRecentExposures(userId, 'EVENT', 5);

    const candidates = await PersonalizationModel.getCandidateEvents(userId, negativeFeedback, limit);

    return candidates.map((evt): ScoredRecommendation<any> => {
      const expCount = exposures.get(String(evt.id)) || 0;
      const matchBonus = (Number(evt.category_interest_match) || 0) * 4.5;
      const attendeesBonus = Math.min((Number(evt.attendees_count) || 0) * 0.3, 3.5);
      const repPenalty = Math.min(expCount * 1.0, 4.0);

      let score = matchBonus + attendeesBonus + 2.0 - repPenalty;
      if (settings.experiment_version === 'v2') {
        score += matchBonus * 0.5;
      }
      score = Math.max(0.5, Number(score.toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('EVENT', evt, userInterestNames);

      PersonalizationModel.recordRecommendationExposure(
        userId,
        'EVENT',
        String(evt.id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: evt,
        score,
        explanation,
        recommendationType: 'EVENT',
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Post Recommendations standalone endpoint
   */
  public static async getPostRecommendations(userId: number, limit: number = 20): Promise<ScoredRecommendation<any>[]> {
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    const hardExcludedUserIds = await PersonalizationModel.getHardExcludedUserIds(userId);
    const negativePostFeedback = await PersonalizationModel.getNegativeFeedbackEntityIds(userId, 'POST');
    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);
    const exposures = await PersonalizationModel.getRecentExposures(userId, 'POST', 5);

    const candidates = await PersonalizationModel.getCandidatePosts(userId, hardExcludedUserIds, negativePostFeedback, limit);

    return candidates.map((post): ScoredRecommendation<any> => {
      const expCount = exposures.get(String(post.id)) || 0;
      const likesBonus = Math.min((Number(post.likes_count) || 0) * 0.4, 5.0);
      const commentsBonus = Math.min((Number(post.comments_count) || 0) * 0.6, 5.0);
      const repPenalty = Math.min(expCount * 0.8, 3.0);

      let score = likesBonus + commentsBonus + 1.5 - repPenalty;
      score = Math.max(0.5, Number(score.toFixed(2)));

      const explanation = RecommendationExplanationService.generateExplanation('POST', post, userInterestNames);

      PersonalizationModel.recordRecommendationExposure(
        userId,
        'POST',
        String(post.id),
        'SHOWN',
        settings.experiment_version,
        score
      ).catch(() => {});

      return {
        item: post,
        score,
        explanation,
        recommendationType: 'POST',
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Personalized Feed with cursor / pagination
   */
  public static async getPersonalizedFeed(
    userId: number,
    page: number = 1,
    limit: number = 15
  ): Promise<{ posts: ScoredRecommendation<any>[]; pagination: { page: number; limit: number; hasMore: boolean } }> {
    const allPosts = await this.getPostRecommendations(userId, page * limit + 1);
    const startIndex = (page - 1) * limit;
    const paginated = allPosts.slice(startIndex, startIndex + limit);
    const hasMore = allPosts.length > page * limit;

    return {
      posts: paginated,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Personalized Trending for user
   */
  public static async getTrendingForUser(userId: number, limit: number = 10): Promise<ScoredRecommendation<any>[]> {
    const scoredInterests = await PersonalizationModel.getUserInterestScores(userId);
    const userInterestNames = scoredInterests.map((si) => si.name);
    const candidates = await PersonalizationModel.getCandidateTrending(userId, limit);

    return candidates.map((tr): ScoredRecommendation<any> => {
      const isInterest = Number(tr.is_user_interest) > 0;
      const countScore = Math.min((Number(tr.posts_count) || 0) * 0.5, 10.0);
      const score = Math.max(0.5, Number((countScore + (isInterest ? 5.0 : 0.0)).toFixed(2)));
      const explanation = RecommendationExplanationService.generateExplanation('TRENDING', tr, userInterestNames);

      return {
        item: tr,
        score,
        explanation,
        recommendationType: 'TRENDING',
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * AI-assisted discovery themes and activity suggestions
   */
  public static async getAiDiscoverySuggestions(userId: number): Promise<{
    themes: string[];
    summary: string;
    suggestedActivities: Array<{ title: string; category: string; description: string }>;
  }> {
    return await AIService.getPersonalizedDiscoverySuggestions(userId);
  }


  /**
   * Record recommendation action / feedback
   */
  public static async recordInteraction(
    userId: number,
    recommendationType: RecommendationType,
    entityId: string,
    action: ExposureAction
  ): Promise<void> {
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    await PersonalizationModel.recordRecommendationExposure(
      userId,
      recommendationType,
      entityId,
      action,
      settings.experiment_version
    );
  }

  /**
   * Submit negative or dismiss feedback: NOT_INTERESTED, SHOW_LESS, DISMISS
   */
  public static async submitFeedback(
    userId: number,
    recommendationType: RecommendationType,
    entityId: string,
    feedbackType: FeedbackType,
    reason?: string
  ): Promise<void> {
    await PersonalizationModel.recordRecommendationFeedback(userId, recommendationType, entityId, feedbackType, reason);
    this.invalidateCache(userId);
    emitRecommendationsUpdated(userId, 'feedback');
  }

  /**
   * Reset personalization for user
   */
  public static async resetPersonalization(userId: number): Promise<void> {
    await PersonalizationModel.resetPersonalization(userId);
    this.invalidateCache(userId);
    emitRecommendationsUpdated(userId, 'reset');
  }

  /**
   * Ingest behavior events
   */
  public static async ingestBehaviorEvent(
    userId: number,
    eventType: BehaviorEventType,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    // Respect user privacy: if personalized recommendations disabled, do not ingest
    if (!settings.personalized_recommendations) {
      return false;
    }
    const success = await PersonalizationModel.recordBehaviorEvent(userId, eventType, entityType, entityId, metadata);
    if (success) {
      this.invalidateCache(userId);
    }
    return success;
  }

  /**
   * Ingest batched behavior events
   */
  public static async ingestBatchBehaviorEvents(
    userId: number,
    events: Array<{
      eventType: BehaviorEventType;
      entityType: EntityType;
      entityId: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<{ inserted: number; rejected: number }> {
    const settings = await PersonalizationModel.getPersonalizationSettings(userId);
    if (!settings.personalized_recommendations) {
      return { inserted: 0, rejected: events.length };
    }
    const result = await PersonalizationModel.recordBatchBehaviorEvents(userId, events);
    if (result.inserted > 0) {
      this.invalidateCache(userId);
    }
    return result;
  }

  /**
   * Admin analytics & experiments
   */
  public static async getAdminAnalytics(): Promise<AdminPersonalizationAnalytics> {
    return await PersonalizationModel.getAdminRecommendationAnalytics();
  }

  public static async getExperiments(): Promise<RecommendationExperiment[]> {
    return await PersonalizationModel.getRecommendationExperiments();
  }
}
