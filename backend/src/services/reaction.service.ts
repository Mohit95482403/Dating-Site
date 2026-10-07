import { AppError } from '../utils/AppError';
import { MessageModel } from '../models/message.model';
import { ConversationModel } from '../models/conversation.model';
import { ReactionModel, ALLOWED_REACTIONS } from '../models/reaction.model';
import { emitMessageReaction } from '../sockets/socket';
import { ReactionGroup } from '../types/chat.types';
import { NotificationService } from './notification.service';
import { ProfileModel } from '../models/profile.model';
import { logger } from '../utils/logger';

export class ReactionService {
  /**
   * Toggle reaction on a message (add, update, or remove if same)
   */
  public static async toggleReaction(
    userId: number,
    messageId: number,
    reaction: string
  ): Promise<{ messageId: number; conversationId: number; reactions: ReactionGroup[]; action: string }> {
    // 1. Validate reaction emoji
    if (!reaction || !ReactionModel.isValidReaction(reaction)) {
      throw AppError.badRequest(
        `Invalid reaction. Allowed reactions are: ${ALLOWED_REACTIONS.join(' ')}`
      );
    }

    // 2. Find message
    const message = await MessageModel.findRawById(messageId);
    if (!message) {
      throw AppError.notFound('Message not found.');
    }

    // 3. Verify user has active access to conversation
    const access = await ConversationModel.verifyUserAccess(message.conversationId, userId);
    if (!access.allowed) {
      if (access.reason === 'unmatched') {
        throw AppError.forbidden('Cannot react to messages because this connection has been unmatched.');
      }
      throw AppError.forbidden('You are not authorized to react to this message.');
    }

    // 4. Toggle reaction in database
    const { action } = await ReactionModel.toggleReaction(messageId, userId, reaction);

    // 5. Fetch updated reaction list for this message
    const updatedReactions = await ReactionModel.getMessageReactions(messageId, userId);

    // 6. Broadcast real-time reaction update to conversation room
    emitMessageReaction(message.conversationId, messageId, updatedReactions, userId, action, reaction);

    // 7. Notify message author if reaction was added or changed (and not self-reaction)
    if (action !== 'removed' && message.senderId !== userId) {
      ProfileModel.findByUserId(userId)
        .then((reactorProfile) => {
          const reactorName = reactorProfile?.first_name || 'Your match';
          NotificationService.createNotification({
            userId: message.senderId,
            actorId: userId,
            type: 'REACTION_RECEIVED',
            title: 'Message Reaction',
            message: `${reactorName} reacted ${reaction} to your message.`,
            referenceType: 'conversation',
            referenceId: message.conversationId,
          }).catch((err) => {
            logger.warn('[ReactionService] Failed to create reaction notification:', err);
          });
        })
        .catch(() => {});
    }

    return {
      messageId,
      conversationId: message.conversationId,
      reactions: updatedReactions,
      action,
    };
  }

  /**
   * Remove a reaction from a message
   */
  public static async removeReaction(
    userId: number,
    messageId: number
  ): Promise<{ messageId: number; conversationId: number; reactions: ReactionGroup[] }> {
    const message = await MessageModel.findRawById(messageId);
    if (!message) {
      throw AppError.notFound('Message not found.');
    }

    const access = await ConversationModel.verifyUserAccess(message.conversationId, userId);
    if (!access.allowed) {
      throw AppError.forbidden('You are not authorized to remove reactions on this message.');
    }

    await ReactionModel.removeReaction(messageId, userId);
    const updatedReactions = await ReactionModel.getMessageReactions(messageId, userId);

    emitMessageReaction(message.conversationId, messageId, updatedReactions, userId, 'removed', '');

    return {
      messageId,
      conversationId: message.conversationId,
      reactions: updatedReactions,
    };
  }
}

export default ReactionService;
