// Connectly Day 26: AI Personalization & Recommendation Controller
// Exposes endpoints for personalized home, people/community discovery, feedback, settings, behavioral event ingestion, and admin telemetry

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { RecommendationService } from '../services/recommendation.service';
import { PersonalizationModel } from '../models/personalization.model';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import { ALLOWED_BEHAVIOR_EVENTS } from '../types/personalization.types';

// In-memory sliding-window rate limit tracker & deduplicator (100 events / minute)
interface UserEventBucket {
  count: number;
  resetAt: number;
  lastEventKey?: string;
  lastEventAt?: number;
}
const rateBuckets = new Map<number, UserEventBucket>();

export class PersonalizationController {
  /**
   * GET /api/home/personalized
   * Retrieve full personalized home experience
   */
  public static async getPersonalizedHome(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';

      const feed = await RecommendationService.getPersonalizedHome(userId, forceRefresh);
      return ApiResponse.success(res, 'Personalized home experience retrieved', feed, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/people
   * Standalone people recommendations
   */
  public static async getPeople(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const people = await RecommendationService.getPeopleRecommendations(userId, limit);
      return ApiResponse.success(res, 'Recommended people retrieved', people, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/communities
   * Standalone community recommendations
   */
  public static async getCommunities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));

      const communities = await RecommendationService.getCommunityRecommendations(userId, limit);
      return ApiResponse.success(res, 'Recommended communities retrieved', communities, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/events
   * Standalone event recommendations
   */
  public static async getEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));

      const events = await RecommendationService.getEventRecommendations(userId, limit);
      return ApiResponse.success(res, 'Recommended events retrieved', events, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/posts
   * Standalone post recommendations
   */
  public static async getPosts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const posts = await RecommendationService.getPostRecommendations(userId, limit);
      return ApiResponse.success(res, 'Recommended posts retrieved', posts, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/feed
   * Personalized feed with pagination
   */
  public static async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));

      const feed = await RecommendationService.getPersonalizedFeed(userId, page, limit);
      return ApiResponse.success(res, 'Personalized feed retrieved', feed, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/trending
   * Personalized trending topics
   */
  public static async getTrending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));

      const trending = await RecommendationService.getTrendingForUser(userId, limit);
      return ApiResponse.success(res, 'Personalized trending topics retrieved', trending, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/ai-suggestions
   * AI-assisted personalized discovery themes & activity suggestions
   */
  public static async getAiSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const suggestions = await RecommendationService.getAiDiscoverySuggestions(userId);
      return ApiResponse.success(res, 'AI-assisted personalized suggestions retrieved', suggestions, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/personalization/feedback
   * Submit negative or dismiss feedback on a recommendation
   */
  public static async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { recommendationType, entityId, feedbackType, reason } = req.body;

      if (!recommendationType || !entityId || !feedbackType) {
        throw new AppError('recommendationType, entityId, and feedbackType are required', HttpStatus.BAD_REQUEST);
      }

      const validFeedbackTypes = ['NOT_INTERESTED', 'SHOW_LESS', 'DISMISS', 'REPORT'];
      if (!validFeedbackTypes.includes(feedbackType)) {
        throw new AppError('Invalid feedbackType provided', HttpStatus.BAD_REQUEST);
      }

      await RecommendationService.submitFeedback(userId, recommendationType, String(entityId), feedbackType, reason);
      return ApiResponse.success(res, 'Feedback recorded successfully', { entityId, feedbackType }, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/personalization/exposure
   * Record recommendation action / exposure
   */
  public static async recordExposure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { recommendationType, entityId, action } = req.body;

      if (!recommendationType || !entityId) {
        throw new AppError('recommendationType and entityId are required', HttpStatus.BAD_REQUEST);
      }

      await RecommendationService.recordInteraction(
        userId,
        recommendationType,
        String(entityId),
        action || 'CLICKED'
      );
      return ApiResponse.success(res, 'Exposure interaction recorded', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/personalization/events
   * Ingest behavioral event or validated batch of events
   */
  public static async ingestEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = req.body;

      // Rate limiting: max 100 events / minute per user
      const now = Date.now();
      let bucket = rateBuckets.get(userId);
      if (!bucket || bucket.resetAt < now) {
        bucket = { count: 0, resetAt: now + 60 * 1000 };
        rateBuckets.set(userId, bucket);
      }
      const incomingCount = Array.isArray(body.events) ? body.events.length : 1;
      if (bucket.count + incomingCount > 100) {
        throw new AppError('Behavior event rate limit exceeded. Please wait a moment.', HttpStatus.TOO_MANY_REQUESTS);
      }
      bucket.count += incomingCount;

      if (Array.isArray(body.events)) {
        // Batch ingestion
        const result = await RecommendationService.ingestBatchBehaviorEvents(userId, body.events);
        return ApiResponse.success(res, 'Batch behavioral events processed', result, HttpStatus.OK);
      } else if (body.eventType && body.entityType && body.entityId) {
        // Single ingestion
        if (!ALLOWED_BEHAVIOR_EVENTS.includes(body.eventType)) {
          throw new AppError('Invalid or unauthorized behavior event type', HttpStatus.BAD_REQUEST);
        }

        // Deduplication check: ignore duplicate same event within 2s
        const eventKey = `${body.eventType}:${body.entityType}:${body.entityId}`;
        if (bucket.lastEventKey === eventKey && bucket.lastEventAt && now - bucket.lastEventAt < 2000) {
          return ApiResponse.success(res, 'Behavioral event recorded (deduplicated)', { recorded: true }, HttpStatus.OK);
        }
        bucket.lastEventKey = eventKey;
        bucket.lastEventAt = now;

        const success = await RecommendationService.ingestBehaviorEvent(
          userId,
          body.eventType,
          body.entityType,
          String(body.entityId),
          body.metadata
        );
        return ApiResponse.success(res, 'Behavioral event recorded', { recorded: success }, HttpStatus.OK);
      } else {
        throw new AppError('Missing eventType, entityType, and entityId', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/settings
   * Retrieve user personalization settings
   */
  public static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const settings = await PersonalizationModel.getPersonalizationSettings(userId);
      return ApiResponse.success(res, 'Personalization settings retrieved', settings, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/personalization/settings
   * Update user personalization settings
   */
  public static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const updated = await PersonalizationModel.updatePersonalizationSettings(userId, req.body);
      RecommendationService.invalidateCache(userId);
      return ApiResponse.success(res, 'Personalization settings updated', updated, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/personalization/reset
   * Reset personalization recommendations & inferred scores
   */
  public static async resetPersonalization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await RecommendationService.resetPersonalization(userId);
      return ApiResponse.success(res, 'Personalization recommendations reset successfully', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personalization/interests
   * Retrieve user explicit and inferred interests
   */
  public static async getInterests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const scores = await PersonalizationModel.getUserInterestScores(userId);

      const explicit = scores.filter((s) => s.source === 'EXPLICIT');
      const inferred = scores.filter((s) => s.source !== 'EXPLICIT');

      return ApiResponse.success(
        res,
        'User interests retrieved',
        { explicit, inferred },
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/recommendations
   * Admin dashboard analytics and A/B experiments telemetry
   */
  public static async getAdminAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        throw new AppError('Unauthorized: Admin access required', HttpStatus.FORBIDDEN);
      }

      const [analytics, experiments] = await Promise.all([
        RecommendationService.getAdminAnalytics(),
        RecommendationService.getExperiments(),
      ]);

      return ApiResponse.success(
        res,
        'Admin recommendation analytics retrieved',
        { analytics, experiments },
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  }
}
