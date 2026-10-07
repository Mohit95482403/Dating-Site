import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { ReactionService } from '../services/reaction.service';

export class ReactionController {
  /**
   * POST /api/messages/:messageId/reaction
   * Add or toggle reaction on a message
   */
  public static async toggleReaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const messageId = parseInt(req.params.messageId, 10);
      if (isNaN(messageId) || messageId <= 0) {
        throw AppError.badRequest('Invalid message ID.');
      }

      const { reaction } = req.body;
      if (!reaction || typeof reaction !== 'string') {
        throw AppError.badRequest('Reaction emoji is required.');
      }

      const result = await ReactionService.toggleReaction(userId, messageId, reaction);
      ApiResponse.success(res, 'Reaction updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/messages/:messageId/reaction
   * Remove reaction from a message
   */
  public static async removeReaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const messageId = parseInt(req.params.messageId, 10);
      if (isNaN(messageId) || messageId <= 0) {
        throw AppError.badRequest('Invalid message ID.');
      }

      const result = await ReactionService.removeReaction(userId, messageId);
      ApiResponse.success(res, 'Reaction removed successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default ReactionController;
