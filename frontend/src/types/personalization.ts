// Connectly Day 26: AI Personalization, Recommendation Intelligence & Behavioral Learning Types

export type RecommendationType =
  | 'PEOPLE'
  | 'COMMUNITY'
  | 'EVENT'
  | 'POST'
  | 'TRENDING';

export type FeedbackType =
  | 'NOT_INTERESTED'
  | 'SHOW_LESS'
  | 'DISMISS'
  | 'REPORT';

export type BehaviorEventType =
  | 'PROFILE_VIEW'
  | 'PROFILE_LIKE'
  | 'PROFILE_SKIP'
  | 'MATCH_CREATED'
  | 'POST_VIEW'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'POST_SAVE'
  | 'STORY_VIEW'
  | 'STORY_INTERACTION'
  | 'COMMUNITY_VIEW'
  | 'COMMUNITY_JOIN'
  | 'EVENT_VIEW'
  | 'EVENT_RSVP'
  | 'SEARCH'
  | 'HASHTAG_VIEW';

export interface RecommendationExplanation {
  primary: string;
  details?: string[];
  confidence: number;
  factors: {
    shared_interests?: string[];
    community_overlap?: string[];
    is_premium_boosted?: boolean;
    is_verified?: boolean;
    activity_recency?: string;
    behavioral_affinity?: string;
  };
}

export interface ScoredRecommendation<T> {
  item: T;
  score: number;
  explanation: RecommendationExplanation;
  recommendationType: RecommendationType;
}

export interface PersonalizationSettings {
  id?: number;
  user_id?: number;
  personalized_recommendations: boolean;
  personalized_feed: boolean;
  personalized_communities: boolean;
  personalized_events: boolean;
  search_personalization: boolean;
  ai_recommendations: boolean;
  experiment_version: string;
  updated_at?: string;
}

export interface PersonalizedHomeResponse {
  experimentVersion: string;
  people: ScoredRecommendation<any>[];
  communities: ScoredRecommendation<any>[];
  events: ScoredRecommendation<any>[];
  posts: ScoredRecommendation<any>[];
  trending: ScoredRecommendation<any>[];
  inferredInterests: Array<{
    interest_id: number;
    name: string;
    score: number;
    source: string;
  }>;
  explicitInterests: Array<{
    interest_id: number;
    name: string;
  }>;
  userSettings: PersonalizationSettings;
}

export interface AdminPersonalizationAnalytics {
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  totalLikes: number;
  totalSkips: number;
  totalFeedback: number;
  notInterestedRate: number;
  recommendationTypeBreakdown: Array<{
    type: RecommendationType;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  experimentPerformance: Array<{
    version: string;
    name: string;
    users: number;
    impressions: number;
    clicks: number;
    ctr: number;
    likeRate: number;
  }>;
  recentFeedback: Array<{
    id: number;
    user_id: number;
    recommendation_type: string;
    entity_id: string;
    feedback_type: string;
    reason: string | null;
    created_at: string;
  }>;
}

export interface RecommendationExperiment {
  id: number;
  name: string;
  version: string;
  description: string;
  traffic_percentage: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}
