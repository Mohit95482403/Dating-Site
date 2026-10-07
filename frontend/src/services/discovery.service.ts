import api from './api';
import type { ApiResponse } from '../types';
import type {
  DiscoveryFiltersState,
  DiscoveryResponse,
  InteractionResponse,
} from '../types/discovery';

export const discoveryService = {
  /**
   * GET /api/discovery
   * Fetch candidate discovery feed
   */
  getDiscoveryProfiles: async (
    filters?: DiscoveryFiltersState,
    limit: number = 20,
    cursor?: number | null
  ): Promise<DiscoveryResponse> => {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    if (filters?.minAge != null) params.minAge = filters.minAge;
    if (filters?.maxAge != null) params.maxAge = filters.maxAge;
    if (filters?.gender && filters.gender !== 'all') params.gender = filters.gender;
    if (filters?.maxDistanceKm != null) params.maxDistanceKm = filters.maxDistanceKm;

    const response = await api.get<ApiResponse<DiscoveryResponse>>('/discovery', { params });
    if (!response.data.data) {
      return { profiles: [], nextCursor: null };
    }
    return response.data.data;
  },

  /**
   * POST /api/discovery/:userId/like
   * Record LIKE on candidate profile
   */
  likeProfile: async (userId: number): Promise<InteractionResponse> => {
    const response = await api.post<ApiResponse<InteractionResponse>>(`/discovery/${userId}/like`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to like profile');
    }
    return response.data.data;
  },

  /**
   * POST /api/discovery/:userId/pass
   * Record PASS on candidate profile
   */
  passProfile: async (userId: number): Promise<{ passed: boolean; targetUserId: number }> => {
    const response = await api.post<ApiResponse<{ passed: boolean; targetUserId: number }>>(
      `/discovery/${userId}/pass`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to pass profile');
    }
    return response.data.data;
  },

  /**
   * POST /api/discovery/:userId/super-like
   * Record SUPER LIKE on candidate profile
   */
  superLikeProfile: async (userId: number): Promise<InteractionResponse> => {
    const response = await api.post<ApiResponse<InteractionResponse>>(`/discovery/${userId}/super-like`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to super-like profile');
    }
    return response.data.data;
  },
};

export default discoveryService;
