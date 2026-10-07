// Connectly Day 26: AI Personalization & Recommendation Intelligence Client Service

import api from './api';
import type {
  PersonalizedHomeResponse,
  ScoredRecommendation,
  PersonalizationSettings,
  FeedbackType,
  RecommendationType,
  BehaviorEventType,
  AdminPersonalizationAnalytics,
  RecommendationExperiment,
} from '../types/personalization';

class PersonalizationService {
  /**
   * Fetch full personalized home experience
   */
  public async getPersonalizedHome(forceRefresh: boolean = false): Promise<PersonalizedHomeResponse> {
    const res = await api.get('/personalization/home', {
      params: forceRefresh ? { refresh: 'true' } : {},
    });
    return res.data.data;
  }

  /**
   * Fetch people recommendations
   */
  public async getPeopleRecommendations(limit: number = 20): Promise<ScoredRecommendation<any>[]> {
    const res = await api.get('/personalization/people', { params: { limit } });
    return res.data.data;
  }

  /**
   * Fetch community recommendations
   */
  public async getCommunityRecommendations(limit: number = 15): Promise<ScoredRecommendation<any>[]> {
    const res = await api.get('/personalization/communities', { params: { limit } });
    return res.data.data;
  }

  /**
   * Fetch event recommendations
   */
  public async getEventRecommendations(limit: number = 15): Promise<ScoredRecommendation<any>[]> {
    const res = await api.get('/personalization/events', { params: { limit } });
    return res.data.data;
  }

  /**
   * Fetch post recommendations
   */
  public async getPostRecommendations(limit: number = 20): Promise<ScoredRecommendation<any>[]> {
    const res = await api.get('/personalization/posts', { params: { limit } });
    return res.data.data;
  }

  /**
   * Fetch personalized feed
   */
  public async getPersonalizedFeed(page: number = 1, limit: number = 15): Promise<{
    posts: ScoredRecommendation<any>[];
    pagination: { page: number; limit: number; hasMore: boolean };
  }> {
    const res = await api.get('/personalization/feed', { params: { page, limit } });
    return res.data.data;
  }

  /**
   * Fetch personalized trending
   */
  public async getTrending(limit: number = 10): Promise<ScoredRecommendation<any>[]> {
    const res = await api.get('/personalization/trending', { params: { limit } });
    return res.data.data;
  }

  /**
   * Fetch AI-assisted discovery suggestions
   */
  public async getAiSuggestions(): Promise<{
    themes: string[];
    summary: string;
    suggestedActivities: Array<{ title: string; category: string; description: string }>;
  }> {
    const res = await api.get('/personalization/ai-suggestions');
    return res.data.data;
  }

  /**
   * Submit negative or dismiss feedback
   */
  public async submitFeedback(
    recommendationType: RecommendationType,
    entityId: string | number,
    feedbackType: FeedbackType,
    reason?: string
  ): Promise<void> {
    await api.post('/personalization/feedback', {
      recommendationType,
      entityId: String(entityId),
      feedbackType,
      reason,
    });
  }

  /**
   * Record exposure action (click, shown, skip)
   */
  public async recordExposure(
    recommendationType: RecommendationType,
    entityId: string | number,
    action: 'CLICKED' | 'LIKED' | 'SKIPPED' | 'JOINED' | 'RSVP'
  ): Promise<void> {
    try {
      await api.post('/personalization/exposure', {
        recommendationType,
        entityId: String(entityId),
        action,
      });
    } catch {
      // Non-blocking telemetry
    }
  }

  /**
   * Ingest single behavioral event
   */
  public async ingestEvent(
    eventType: BehaviorEventType,
    entityType: 'PROFILE' | 'POST' | 'COMMUNITY' | 'EVENT' | 'STORY' | 'HASHTAG' | 'SEARCH_QUERY',
    entityId: string | number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await api.post('/personalization/events', {
        eventType,
        entityType,
        entityId: String(entityId),
        metadata,
      });
    } catch {
      // Non-blocking telemetry
    }
  }

  /**
   * Ingest batch behavioral events
   */
  public async ingestBatchEvents(
    events: Array<{
      eventType: BehaviorEventType;
      entityType: 'PROFILE' | 'POST' | 'COMMUNITY' | 'EVENT' | 'STORY' | 'HASHTAG' | 'SEARCH_QUERY';
      entityId: string | number;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      await api.post('/personalization/events', { events });
    } catch {
      // Non-blocking telemetry
    }
  }

  /**
   * Fetch personalization settings
   */
  public async getSettings(): Promise<PersonalizationSettings> {
    const res = await api.get('/personalization/settings');
    return res.data.data;
  }

  /**
   * Update personalization settings
   */
  public async updateSettings(settings: Partial<PersonalizationSettings>): Promise<PersonalizationSettings> {
    const res = await api.put('/personalization/settings', settings);
    return res.data.data;
  }

  /**
   * Reset personalization recommendations & inferred scores
   */
  public async resetPersonalization(): Promise<void> {
    await api.post('/personalization/reset');
  }

  /**
   * Fetch explicit and inferred interests
   */
  public async getUserInterests(): Promise<{
    explicit: Array<{ interest_id: number; name: string }>;
    inferred: Array<{ interest_id: number; name: string; score: number; source: string }>;
  }> {
    const res = await api.get('/personalization/interests');
    return res.data.data;
  }

  /**
   * Admin recommendations analytics and A/B experiments
   */
  public async getAdminAnalytics(): Promise<{
    analytics: AdminPersonalizationAnalytics;
    experiments: RecommendationExperiment[];
  }> {
    const res = await api.get('/admin/recommendations');
    return res.data.data;
  }
}

export const personalizationService = new PersonalizationService();
export default personalizationService;
