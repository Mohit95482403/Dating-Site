import api from './api';
import type { MatchesResponseData, MatchItem, MatchDetailResponseData } from '../types/match';
import type { ApiResponse } from '../types';

export const matchService = {
  /**
   * Get all active mutual matches for the authenticated user
   */
  getMatches: async (): Promise<MatchesResponseData> => {
    const response = await api.get<ApiResponse<MatchesResponseData>>('/matches');
    return response.data?.data || { matches: [], count: 0 };
  },

  /**
   * Get total match count for badges and navbar
   */
  getMatchCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/matches/count');
      return response.data?.data?.count ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get detailed profile and match info for a specific match
   */
  getMatchById: async (matchId: number): Promise<MatchItem> => {
    const response = await api.get<ApiResponse<MatchDetailResponseData>>(`/matches/${matchId}`);
    if (!response.data?.data?.match) {
      throw new Error('Match record not found');
    }
    return response.data.data.match;
  },

  /**
   * Unmatch with partner
   */
  unmatch: async (matchId: number): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/matches/${matchId}`);
  },
};

export default matchService;
