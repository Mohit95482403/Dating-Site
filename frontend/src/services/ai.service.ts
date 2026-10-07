import api from './api';
import type { ApiResponse } from '../types';
import type {
  CompatibilityResult,
  ProfileInsightsResult,
  BioStyle,
  BioImprovementResult,
  ConversationSuggestionsResult,
  ConversationStarterResult,
  AIAnalyticsSummary,
} from '../types/ai';

export const aiService = {
  /**
   * Get compatibility score and breakdown for an active match
   */
  getMatchCompatibility: async (matchId: number): Promise<CompatibilityResult> => {
    const response = await api.get<ApiResponse<CompatibilityResult>>(
      `/ai/matches/${matchId}/compatibility`
    );
    if (!response.data?.data) {
      throw new Error('Failed to retrieve match compatibility');
    }
    return response.data.data;
  },

  /**
   * Get compatibility score and breakdown for any target user
   */
  getUserCompatibility: async (targetUserId: number): Promise<CompatibilityResult> => {
    const response = await api.get<ApiResponse<CompatibilityResult>>(
      `/ai/users/${targetUserId}/compatibility`
    );
    if (!response.data?.data) {
      throw new Error('Failed to retrieve compatibility score');
    }
    return response.data.data;
  },

  /**
   * Get AI-powered profile insights, strengths, and actionable suggestions
   */
  getProfileInsights: async (): Promise<ProfileInsightsResult> => {
    const response = await api.post<ApiResponse<ProfileInsightsResult>>(
      '/ai/profile/insights',
      {}
    );
    if (!response.data?.data) {
      throw new Error('Failed to retrieve profile insights');
    }
    return response.data.data;
  },

  /**
   * Enhance bio with tone/style options (returns original vs suggested for preview)
   */
  improveBio: async (bio?: string, style: BioStyle = 'confident'): Promise<BioImprovementResult> => {
    const response = await api.post<ApiResponse<BioImprovementResult>>(
      '/ai/profile/improve-bio',
      { bio, style }
    );
    if (!response.data?.data) {
      throw new Error('Failed to generate bio improvement');
    }
    return response.data.data;
  },

  /**
   * Get 3 contextual conversation reply suggestions based on recent conversation context
   */
  getConversationSuggestions: async (conversationId: number): Promise<ConversationSuggestionsResult> => {
    const response = await api.post<ApiResponse<ConversationSuggestionsResult>>(
      '/ai/conversation/suggestions',
      { conversationId }
    );
    if (!response.data?.data) {
      throw new Error('Failed to generate conversation suggestions');
    }
    return response.data.data;
  },

  /**
   * Get 3 personalized icebreaker conversation starters for a target user/match
   */
  getConversationStarter: async (targetUserId: number): Promise<ConversationStarterResult> => {
    const response = await api.post<ApiResponse<ConversationStarterResult>>(
      '/ai/conversation/starter',
      { targetUserId }
    );
    if (!response.data?.data) {
      throw new Error('Failed to generate conversation starters');
    }
    return response.data.data;
  },

  /**
   * Admin-only: Get AI system analytics and telemetry metrics
   */
  getAIAnalytics: async (): Promise<AIAnalyticsSummary> => {
    const response = await api.get<ApiResponse<AIAnalyticsSummary>>(
      '/ai/analytics'
    );
    if (!response.data?.data) {
      throw new Error('Failed to retrieve AI analytics telemetry');
    }
    return response.data.data;
  },
};

export default aiService;
