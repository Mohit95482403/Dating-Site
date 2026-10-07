import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ConversationModel } from '../models/conversation.model';
import { MatchModel } from '../models/match.model';
import { ConversationItem } from '../types/chat.types';
import { emitMessagesRead } from '../sockets/socket';

export class ConversationService {
  /**
   * Fetch all active conversations for the authenticated user
   */
  public static async getUserConversations(userId: number): Promise<ConversationItem[]> {
    logger.info(`[ConversationService] Fetching conversations for user ${userId}`);
    return ConversationModel.findUserConversations(userId);
  }

  /**
   * Fetch single conversation by ID with authorization verification
   */
  public static async getConversationById(
    userId: number,
    conversationId: number
  ): Promise<ConversationItem> {
    if (isNaN(conversationId) || conversationId <= 0) {
      throw AppError.badRequest('Invalid conversation ID.');
    }

    const access = await ConversationModel.verifyUserAccess(conversationId, userId);
    if (!access.allowed) {
      if (access.reason === 'unmatched') {
        throw AppError.forbidden('This conversation is no longer active because the connection was unmatched.');
      }
      throw AppError.forbidden('You do not have permission to access this conversation.');
    }

    const conversation = await ConversationModel.findConversationById(conversationId, userId);
    if (!conversation) {
      throw AppError.notFound('Conversation not found.');
    }

    return conversation;
  }

  /**
   * Get or create conversation for a given match ID
   */
  public static async getOrCreateForMatch(
    userId: number,
    matchId: number
  ): Promise<ConversationItem> {
    if (isNaN(matchId) || matchId <= 0) {
      throw AppError.badRequest('Invalid match ID.');
    }

    // Verify user belongs to the match and match is active
    const match = await MatchModel.findMatchById(matchId, userId);
    if (!match) {
      throw AppError.notFound('Match not found or connection is not active.');
    }

    // Ensure conversation exists
    const convRow = await ConversationModel.getOrCreateForMatch(
      matchId,
      userId,
      match.user.id
    );

    const fullConv = await ConversationModel.findConversationById(convRow.id, userId);
    if (!fullConv) {
      throw AppError.notFound('Failed to retrieve conversation.');
    }

    return fullConv;
  }

  /**
   * Mark all unread messages in conversation as read
   */
  public static async markConversationAsRead(
    userId: number,
    conversationId: number
  ): Promise<boolean> {
    if (isNaN(conversationId) || conversationId <= 0) {
      throw AppError.badRequest('Invalid conversation ID.');
    }

    const access = await ConversationModel.verifyUserAccess(conversationId, userId);
    if (!access.allowed) {
      throw AppError.forbidden('Access denied.');
    }

    const marked = await ConversationModel.markAsRead(conversationId, userId);

    if (access.partnerUserId) {
      emitMessagesRead(conversationId, userId, access.partnerUserId);
    }

    return marked;
  }

  /**
   * Get total unread count for navbar badge
   */
  public static async getTotalUnreadCount(userId: number): Promise<number> {
    return ConversationModel.getTotalUnreadCount(userId);
  }
}

export default ConversationService;
