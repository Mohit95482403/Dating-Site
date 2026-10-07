// Connectly AI Controller
// Exposes endpoints for Compatibility, Profile Insights, Bio Improvement, and Chat Assistant

import { Response } from 'express';
import { AIService } from '../services/ai.service';
import { MatchModel } from '../models/match.model';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AuthenticatedRequest } from '../types';

export class AIController {
  /**
   * GET /api/ai/compatibility/:targetUserId
   * Compute smart match compatibility score & explanation
   */
  public static getCompatibility = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const targetUserId = Number(req.params.targetUserId);
      const matchId = req.query.matchId ? Number(req.query.matchId) : undefined;

      const result = await AIService.getMatchCompatibility(currentUserId, targetUserId, matchId);
      ApiResponse.success(res, 'Match compatibility calculated successfully', result, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to calculate compatibility', [], status);
    }
  };

  /**
   * GET /api/ai/matches/:matchId/compatibility
   * Compute compatibility specifically for a match ID
   */
  public static getMatchCompatibilityByMatchId = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const matchId = Number(req.params.matchId);

      const match = await MatchModel.findMatchById(matchId, currentUserId);
      if (!match) {
        ApiResponse.error(res, 'Match not found or access denied', [], HttpStatus.FORBIDDEN);
        return;
      }

      const result = await AIService.getMatchCompatibility(currentUserId, match.user.id, matchId);
      ApiResponse.success(res, 'Match compatibility retrieved', result, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve match compatibility', [], status);
    }
  };

  /**
   * POST /api/ai/profile/insights
   * Analyze own profile and provide strengths & optimization suggestions
   */
  public static getProfileInsights = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const insights = await AIService.getProfileInsights(currentUserId);
      ApiResponse.success(res, 'Profile insights generated successfully', insights, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to generate profile insights', [], status);
    }
  };

  /**
   * POST /api/ai/profile/improve-bio
   * Suggest an improved bio preview in a selected style
   */
  public static improveBio = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const { bio, style } = req.body;

      const result = await AIService.improveBio(currentUserId, bio, style);
      ApiResponse.success(res, 'Bio suggestion created', result, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to generate bio suggestion', [], status);
    }
  };

  /**
   * POST /api/ai/conversation/suggestions
   * Contextual smart reply choices for an active conversation
   */
  public static getConversationSuggestions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const { conversationId } = req.body;

      if (!conversationId) {
        ApiResponse.error(res, 'conversationId is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const suggestions = await AIService.getConversationSuggestions(currentUserId, Number(conversationId));
      ApiResponse.success(res, 'Reply suggestions generated', suggestions, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to generate reply suggestions', [], status);
    }
  };

  /**
   * POST /api/ai/conversation/starter
   * Icebreaker openers for newly matched connections
   */
  public static getConversationStarter = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = Number(req.user?.userId || req.user?.id);
      const { conversationId, matchId } = req.body;

      if (!conversationId && !matchId) {
        ApiResponse.error(res, 'conversationId or matchId is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const starters = await AIService.getConversationStarter(currentUserId, {
        conversationId: conversationId ? Number(conversationId) : undefined,
        matchId: matchId ? Number(matchId) : undefined,
      });

      ApiResponse.success(res, 'Conversation starters generated', starters, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to generate conversation starters', [], status);
    }
  };

  /**
   * GET /api/ai/admin/stats
   * Aggregated AI telemetry for administration & platform analytics
   */
  public static getAdminStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        ApiResponse.error(res, 'Admin privileges required', [], HttpStatus.FORBIDDEN);
        return;
      }

      const stats = await AIService.getAIAnalyticsSummary();
      ApiResponse.success(res, 'AI analytics retrieved', stats, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve AI analytics', [], status);
    }
  };
}

export default AIController;
