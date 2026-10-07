import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import { MessageService } from '../services/message.service';
import { AbuseRiskService } from '../services/abuseRisk.service';

export class MessageController {
  /**
   * GET /api/conversations/:conversationId/messages
   * Fetch paginated messages for a conversation
   */
  public static async getMessages(
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

      const { limit, cursor, before } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string, 10) : 30,
        cursor: cursor ? parseInt(cursor as string, 10) : undefined,
        before: before ? parseInt(before as string, 10) : undefined,
      };

      const result = await MessageService.getMessages(userId, conversationId, options);
      ApiResponse.success(res, 'Messages retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/conversations/:conversationId/messages
   * Send a new text message in a conversation
   */
  public static async sendMessage(
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

      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        throw AppError.badRequest('Message content must be provided.');
      }

      await AbuseRiskService.assertCanSendMessage(userId);

      const createdMessage = await MessageService.sendMessage(
        userId,
        conversationId,
        content
      );

      ApiResponse.success(
        res,
        'Message sent successfully',
        createdMessage,
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }
}

export default MessageController;
