import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { ConversationService } from '../services/conversation.service';

export class ConversationController {
  /**
   * GET /api/conversations
   * Fetch all active conversations for the authenticated user
   */
  public static async getConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const conversations = await ConversationService.getUserConversations(userId);
      ApiResponse.success(res, 'Conversations retrieved successfully', {
        conversations,
        count: conversations.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations/unread-count
   * Fetch total unread messages count for navbar badge
   */
  public static async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const count = await ConversationService.getTotalUnreadCount(userId);
      ApiResponse.success(res, 'Unread count retrieved successfully', { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations/match/:matchId
   * Get or initialize conversation for a match
   */
  public static async getOrCreateForMatch(
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

      const conversation = await ConversationService.getOrCreateForMatch(userId, matchId);
      ApiResponse.success(res, 'Conversation retrieved successfully', { conversation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations/:conversationId
   * Fetch a single conversation by ID
   */
  public static async getConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const conversationId = parseInt(req.params.conversationId, 10);
      if (isNaN(conversationId) || conversationId <= 0) {
        throw AppError.badRequest('Invalid conversation ID.');
      }

      const conversation = await ConversationService.getConversationById(userId, conversationId);
      ApiResponse.success(res, 'Conversation details retrieved successfully', { conversation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/conversations/:conversationId/read
   * Mark messages in conversation as read
   */
  public static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const conversationId = parseInt(req.params.conversationId, 10);
      if (isNaN(conversationId) || conversationId <= 0) {
        throw AppError.badRequest('Invalid conversation ID.');
      }

      await ConversationService.markConversationAsRead(userId, conversationId);
      ApiResponse.success(res, 'Messages marked as read');
    } catch (error) {
      next(error);
    }
  }
}

export default ConversationController;
