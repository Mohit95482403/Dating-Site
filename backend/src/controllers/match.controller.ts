import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { MatchService } from '../services/match.service';

export class MatchController {
  /**
   * GET /api/matches
   * Fetch all active mutual matches for the authenticated user
   */
  public static async getUserMatches(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required to access matches.');
      }

      const result = await MatchService.getUserMatches(userId);
      ApiResponse.success(res, 'Matches retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/matches/count
   * Fetch active match count for badges and headers
   */
  public static async getMatchCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const count = await MatchService.getUserMatchCount(userId);
      ApiResponse.success(res, 'Match count retrieved successfully', { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/matches/:matchId
   * Fetch detailed view for a single match
   */
  public static async getMatchById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const matchId = parseInt(req.params.matchId, 10);
      if (isNaN(matchId) || matchId <= 0) {
        throw AppError.badRequest('Invalid match ID.');
      }

      const match = await MatchService.getMatchById(userId, matchId);
      ApiResponse.success(res, 'Match details retrieved successfully', { match });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/matches/:matchId
   * Unmatch a connection
   */
  public static async unmatch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const matchId = parseInt(req.params.matchId, 10);
      if (isNaN(matchId) || matchId <= 0) {
        throw AppError.badRequest('Invalid match ID.');
      }

      await MatchService.removeMatch(userId, matchId);
      ApiResponse.success(res, 'Match removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default MatchController;
