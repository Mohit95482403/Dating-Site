// Connectly Day 23: Explore, Global Search, Trending & Discovery Service

import { ExploreModel } from '../models/explore.model';
import EntitlementService from './entitlement.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type {
  SearchType,
  SearchQueryParams,
  GlobalSearchResponse,
  TrendingResponse,
  SuggestedPeopleResponse,
  PeopleFilterParams,
  HashtagDetailResponse,
  SearchHistoryItem,
} from '../types/explore.types';

// In-memory cache for trending data (60 second TTL)
interface TrendingCache {
  timestamp: number;
  data: TrendingResponse;
}
let trendingCache: TrendingCache | null = null;
const CACHE_TTL_MS = 60 * 1000;

export class ExploreService {
  /**
   * Global Search across People, Posts, Stories, Hashtags, and Interests
   */
  public static async search(
    userId: number,
    params: SearchQueryParams
  ): Promise<GlobalSearchResponse> {
    const rawQuery = (params.q || '').trim();
    if (!rawQuery) {
      throw AppError.badRequest('Search query "q" cannot be empty.');
    }
    if (rawQuery.length > 150) {
      throw AppError.badRequest('Search query cannot exceed 150 characters.');
    }

    const type: SearchType = params.type || 'all';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    // Asynchronously record in search history (skip errors so it never blocks search)
    ExploreModel.addSearchHistory(userId, rawQuery, type).catch((err) => {
      logger.warn('[ExploreService] Failed to record search history:', err);
    });

    logger.info(`[ExploreService] User ${userId} searching "${rawQuery}" (type: ${type})`);

    let people: any[] = [];
    let posts: any[] = [];
    let stories: any[] = [];
    let hashtags: any[] = [];
    let interests: any[] = [];

    if (type === 'all' || type === 'people') {
      people = await ExploreModel.searchPeople(userId, rawQuery, type === 'all' ? 8 : limit, offset);
    }
    if (type === 'all' || type === 'posts') {
      posts = await ExploreModel.searchPosts(userId, rawQuery, type === 'all' ? 8 : limit, offset);
    }
    if (type === 'all' || type === 'stories') {
      stories = await ExploreModel.searchStories(userId, rawQuery, type === 'all' ? 6 : limit);
    }
    if (type === 'all' || type === 'hashtags') {
      hashtags = await ExploreModel.searchHashtags(rawQuery, type === 'all' ? 8 : limit);
    }
    if (type === 'all' || type === 'interests') {
      interests = await ExploreModel.searchInterests(rawQuery, type === 'all' ? 8 : limit);
    }

    const totalMatches = people.length + posts.length + stories.length + hashtags.length + interests.length;

    return {
      query: rawQuery,
      type,
      people,
      posts,
      stories,
      hashtags,
      interests,
      totalMatches,
    };
  }

  /**
   * Get user's recent search history
   */
  public static async getSearchHistory(userId: number): Promise<SearchHistoryItem[]> {
    return ExploreModel.getSearchHistory(userId, 10);
  }

  /**
   * Remove a single search history item
   */
  public static async removeSearchHistoryItem(userId: number, historyId: number): Promise<void> {
    const deleted = await ExploreModel.removeSearchHistoryItem(userId, historyId);
    if (!deleted) {
      throw AppError.notFound('Search history item not found or unauthorized.');
    }
  }

  /**
   * Clear all search history for user
   */
  public static async clearSearchHistory(userId: number): Promise<void> {
    await ExploreModel.clearSearchHistory(userId);
  }

  /**
   * Get Trending Content (Hashtags, Posts, Stories) with 60s cache
   */
  public static async getTrending(userId: number): Promise<TrendingResponse> {
    const now = Date.now();
    if (trendingCache && now - trendingCache.timestamp < CACHE_TTL_MS) {
      return trendingCache.data;
    }

    const [hashtags, posts, stories] = await Promise.all([
      ExploreModel.getTrendingHashtags(12),
      ExploreModel.getTrendingPosts(userId, 18),
      ExploreModel.getTrendingStories(userId, 10),
    ]);

    const result: TrendingResponse = {
      hashtags,
      posts,
      stories,
    };

    trendingCache = {
      timestamp: now,
      data: result,
    };

    return result;
  }

  /**
   * Get Suggested People (Multi-signal personalized recommendations)
   */
  public static async getSuggestedPeople(userId: number): Promise<SuggestedPeopleResponse> {
    const profiles = await ExploreModel.getSuggestedPeople(userId, 15);
    return {
      profiles,
      total: profiles.length,
    };
  }

  /**
   * Advanced People Discovery with Filter Gating
   */
  public static async getFilteredPeople(
    userId: number,
    filters: PeopleFilterParams
  ): Promise<{ profiles: any[]; total: number; isEntitled: boolean }> {
    // Validate age bounds
    if (filters.minAge != null && filters.maxAge != null && filters.minAge > filters.maxAge) {
      throw AppError.badRequest('Minimum age cannot be greater than maximum age.');
    }
    if (filters.minAge != null && (filters.minAge < 18 || filters.minAge > 120)) {
      throw AppError.badRequest('Minimum age must be between 18 and 120.');
    }
    if (filters.maxAge != null && (filters.maxAge < 18 || filters.maxAge > 120)) {
      throw AppError.badRequest('Maximum age must be between 18 and 120.');
    }

    // Check if advanced filters are being requested:
    // Verified-only, Online-only, multiple interest filters, or compatibility sorting
    const requestedAdvanced = Boolean(
      filters.verifiedOnly ||
      filters.onlineOnly ||
      (filters.interests && filters.interests.length > 0) ||
      filters.sort === 'compatibility'
    );

    let isEntitled = true;
    if (requestedAdvanced) {
      isEntitled = await EntitlementService.hasFeature(userId, 'ADVANCED_FILTERS');
      if (!isEntitled) {
        throw AppError.forbidden(
          'Advanced Discovery filters (verified only, online now, interest filters, compatibility ranking) are locked for Free members. Upgrade to Connectly Premium to unlock!'
        );
      }
    }

    const result = await ExploreModel.getFilteredPeople(userId, filters);
    return {
      ...result,
      isEntitled,
    };
  }

  /**
   * Get Hashtag Details and Associated Posts
   */
  public static async getHashtagDetail(
    hashtagName: string,
    userId: number,
    sort: 'popular' | 'recent' = 'popular',
    page: number = 1,
    limit: number = 20
  ): Promise<HashtagDetailResponse> {
    const cleanTag = hashtagName.trim().replace(/^#/, '');
    if (!cleanTag) {
      throw AppError.badRequest('Valid hashtag name is required.');
    }

    const result = await ExploreModel.getHashtagDetail(cleanTag, userId, sort, page, limit);
    if (!result.hashtag) {
      throw AppError.notFound(`Hashtag #${cleanTag} not found.`);
    }

    const totalPages = Math.ceil(result.total / limit) || 1;

    return {
      hashtag: result.hashtag,
      posts: result.posts,
      total: result.total,
      page,
      totalPages,
      sort,
    };
  }

  /**
   * Get Admin Explore Analytics
   */
  public static async getAdminAnalytics(): Promise<any> {
    return ExploreModel.getAdminExploreAnalytics();
  }
}
