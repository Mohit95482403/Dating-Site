// Connectly Day 23: Explore & Discovery API Service

import { api } from './api';
import type {
  SearchType,
  GlobalSearchResponse,
  TrendingResponse,
  SuggestedPeopleResponse,
  SearchResultProfile,
  SearchHistoryItem,
  PeopleFilterParams,
  HashtagDetailResponse,
} from '../types/explore';

export class ExploreService {
  /**
   * Global Search across people, posts, stories, hashtags, and interests
   */
  public static async search(params: {
    q: string;
    type?: SearchType;
    page?: number;
    limit?: number;
  }): Promise<GlobalSearchResponse> {
    const response = await api.get('/explore/search', {
      params: {
        q: params.q,
        type: params.type || 'all',
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });
    return response.data.data;
  }

  /**
   * Fetch recent search history for current user
   */
  public static async getSearchHistory(): Promise<SearchHistoryItem[]> {
    const response = await api.get('/explore/search/history');
    return response.data.data || [];
  }

  /**
   * Delete a single search query from history
   */
  public static async removeSearchHistoryItem(id: number): Promise<void> {
    await api.delete(`/explore/search/history/${id}`);
  }

  /**
   * Clear all search history
   */
  public static async clearSearchHistory(): Promise<void> {
    await api.delete('/explore/search/history');
  }

  /**
   * Get trending hashtags, posts, and active stories
   */
  public static async getTrending(): Promise<TrendingResponse> {
    const response = await api.get('/explore/trending');
    return response.data.data;
  }

  /**
   * Get suggested profiles with real signals & compatibility
   */
  public static async getSuggestedPeople(): Promise<SuggestedPeopleResponse> {
    const response = await api.get('/explore/suggested/people');
    return {
      profiles: response.data.data || [],
      total: response.data.meta?.total || response.data.data?.length || 0,
    };
  }

  /**
   * Filtered people discovery with age, distance/city, interests, verification, and presence
   */
  public static async getFilteredPeople(filters: PeopleFilterParams): Promise<{
    profiles: SearchResultProfile[];
    total: number;
    page: number;
    limit: number;
    isEntitled: boolean;
  }> {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 20,
    };

    if (filters.minAge != null) params.minAge = filters.minAge;
    if (filters.maxAge != null) params.maxAge = filters.maxAge;
    if (filters.city) params.city = filters.city;
    if (filters.gender && filters.gender !== 'all') params.gender = filters.gender;
    if (filters.verifiedOnly) params.verifiedOnly = true;
    if (filters.onlineOnly) params.onlineOnly = true;
    if (filters.hasPhoto) params.hasPhoto = true;
    if (filters.sort) params.sort = filters.sort;
    if (filters.interests && filters.interests.length > 0) {
      params.interests = filters.interests.join(',');
    }

    const response = await api.get('/explore/people', { params });
    return {
      profiles: response.data.data || [],
      total: response.data.meta?.total || response.data.data?.length || 0,
      page: response.data.meta?.page || filters.page || 1,
      limit: response.data.meta?.limit || filters.limit || 20,
      isEntitled: response.data.meta?.isEntitled ?? true,
    };
  }

  /**
   * Get hashtag details & posts (popular vs recent)
   */
  public static async getHashtagDetail(
    tag: string,
    sort: 'popular' | 'recent' = 'popular',
    page = 1,
    limit = 20
  ): Promise<HashtagDetailResponse> {
    const cleanTag = tag.replace(/^#/, '');
    const response = await api.get(`/explore/hashtags/${encodeURIComponent(cleanTag)}`, {
      params: { sort, page, limit },
    });
    return response.data.data;
  }
}
