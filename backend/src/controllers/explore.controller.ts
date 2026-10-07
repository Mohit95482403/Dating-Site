// Connectly Day 23: Explore, Global Search, Trending & Discovery Controller

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { ExploreService } from '../services/explore.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import type { SearchType, ExploreSortOption } from '../types/explore.types';

export class ExploreController {
  /**
   * GET /api/explore/search
   * Global search across people, posts, stories, hashtags, interests
   */
  public static async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const q = String(req.query.q || '');
      const type = (req.query.type as SearchType) || 'all';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const results = await ExploreService.search(userId, { q, type, page, limit });

      ApiResponse.success(res, 'Search completed successfully', results, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/search/history
   * Retrieve recent search queries
   */
  public static async getSearchHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const history = await ExploreService.getSearchHistory(userId);

      ApiResponse.success(res, 'Search history retrieved', history, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/explore/search/history/:id
   * Remove single search query from history
   */
  public static async removeSearchHistoryItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const historyId = Number(req.params.id);
      if (!historyId || isNaN(historyId)) {
        throw AppError.badRequest('Valid history ID is required.');
      }

      await ExploreService.removeSearchHistoryItem(userId, historyId);
      ApiResponse.success(res, 'Search history item removed', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/explore/search/history
   * Clear all search history
   */
  public static async clearSearchHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await ExploreService.clearSearchHistory(userId);
      ApiResponse.success(res, 'Search history cleared', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/trending
   * Retrieve trending hashtags, posts, and stories
   */
  public static async getTrending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const trending = await ExploreService.getTrending(userId);

      ApiResponse.success(res, 'Trending content retrieved', trending, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/suggested/people
   * Suggested profiles for user
   */
  public static async getSuggestedPeople(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const suggested = await ExploreService.getSuggestedPeople(userId);

      ApiResponse.success(res, 'Suggested profiles retrieved', suggested.profiles, HttpStatus.OK, {
        total: suggested.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/people
   * Filtered people discovery
   */
  public static async getFilteredPeople(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const minAge = req.query.minAge ? Number(req.query.minAge) : undefined;
      const maxAge = req.query.maxAge ? Number(req.query.maxAge) : undefined;
      const city = req.query.city ? String(req.query.city) : undefined;
      const gender = req.query.gender ? String(req.query.gender) : undefined;
      const verifiedOnly = req.query.verifiedOnly === 'true' || req.query.verifiedOnly === '1';
      const onlineOnly = req.query.onlineOnly === 'true' || req.query.onlineOnly === '1';
      const hasPhoto = req.query.hasPhoto === 'true' || req.query.hasPhoto === '1';
      const sort = req.query.sort as ExploreSortOption | undefined;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      let interests: string[] | undefined;
      if (req.query.interests) {
        if (Array.isArray(req.query.interests)) {
          interests = (req.query.interests as string[]).map(String);
        } else {
          interests = String(req.query.interests).split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      const result = await ExploreService.getFilteredPeople(userId, {
        minAge,
        maxAge,
        city,
        gender,
        interests,
        verifiedOnly,
        onlineOnly,
        hasPhoto,
        sort,
        page,
        limit,
      });

      ApiResponse.success(res, 'Filtered people retrieved', result.profiles, HttpStatus.OK, {
        total: result.total,
        page,
        limit,
        isEntitled: result.isEntitled,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/hashtags/:tag
   * Get hashtag details & posts
   */
  public static async getHashtagDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tag = req.params.tag;
      const sort = (req.query.sort as 'popular' | 'recent') || 'popular';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const detail = await ExploreService.getHashtagDetail(tag, userId, sort, page, limit);

      ApiResponse.success(res, `Hashtag #${tag} retrieved`, detail, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/explore/admin/analytics
   * Admin analytics for explore & search
   */
  public static async getAdminAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await ExploreService.getAdminAnalytics();
      ApiResponse.success(res, 'Explore analytics retrieved', analytics, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
