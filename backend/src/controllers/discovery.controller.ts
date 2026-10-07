import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { DiscoveryService } from '../services/discovery.service';
import { DiscoveryFilterOptions } from '../types/discovery.types';

export class DiscoveryController {
  /**
   * GET /api/discovery
   * Fetch candidate discovery feed
   */
  public static async getDiscovery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required to access discovery feed.');
      }

      const { limit, cursor, minAge, maxAge, gender, maxDistanceKm, interests, verifiedOnly } = req.query;

      const parsedInterests = interests
        ? (Array.isArray(interests) ? (interests as string[]) : (interests as string).split(',').map((s) => s.trim()))
        : undefined;

      const filters: DiscoveryFilterOptions = {
        limit: limit ? parseInt(limit as string, 10) : 20,
        cursor: cursor ? parseInt(cursor as string, 10) : null,
        minAge: minAge ? parseInt(minAge as string, 10) : undefined,
        maxAge: maxAge ? parseInt(maxAge as string, 10) : undefined,
        gender: gender ? (gender as any) : undefined,
        maxDistanceKm: maxDistanceKm ? parseInt(maxDistanceKm as string, 10) : undefined,
        interests: parsedInterests,
        verifiedOnly: verifiedOnly === 'true',
      };

      const result = await DiscoveryService.getDiscoveryProfiles(userId, filters);
      ApiResponse.success(res, 'Discovery candidates fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discovery/:userId/like
   * Record LIKE interaction
   */
  public static async likeProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fromUserId = req.user?.userId || req.user?.id;
      if (!fromUserId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const targetUserId = parseInt(req.params.userId, 10);
      if (isNaN(targetUserId) || targetUserId <= 0) {
        throw AppError.badRequest('Invalid target user ID.');
      }

      const result = await DiscoveryService.likeProfile(fromUserId, targetUserId);
      ApiResponse.success(res, 'Profile liked successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discovery/:userId/pass
   * Record PASS interaction
   */
  public static async passProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fromUserId = req.user?.userId || req.user?.id;
      if (!fromUserId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const targetUserId = parseInt(req.params.userId, 10);
      if (isNaN(targetUserId) || targetUserId <= 0) {
        throw AppError.badRequest('Invalid target user ID.');
      }

      const result = await DiscoveryService.passProfile(fromUserId, targetUserId);
      ApiResponse.success(res, 'Profile passed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discovery/:userId/super-like
   * Record SUPER LIKE interaction
   */
  public static async superLikeProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fromUserId = req.user?.userId || req.user?.id;
      if (!fromUserId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const targetUserId = parseInt(req.params.userId, 10);
      if (isNaN(targetUserId) || targetUserId <= 0) {
        throw AppError.badRequest('Invalid target user ID.');
      }

      const result = await DiscoveryService.superLikeProfile(fromUserId, targetUserId);
      ApiResponse.success(res, 'Profile super-liked successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default DiscoveryController;
