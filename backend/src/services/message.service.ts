import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ConversationModel } from '../models/conversation.model';
import { MessageModel } from '../models/message.model';
import { MessageItem, MessagesPaginationResponse } from '../types/chat.types';
import { emitNewMessage, isUserInConversationRoom } from '../sockets/socket';
import { NotificationService } from './notification.service';
import { ProfileModel } from '../models/profile.model';

export class MessageService {
  /**
   * Fetch paginated messages for a conversation after verifying user access
   */
  public static async getMessages(
    userId: number,
    conversationId: number,
    options: { limit?: number; cursor?: number; before?: number }
  ): Promise<MessagesPaginationResponse> {
    if (isNaN(conversationId) || conversationId <= 0) {
      throw AppError.badRequest('Invalid conversation ID.');
    }

    const access = await ConversationModel.verifyUserAccess(conversationId, userId);
    if (!access.allowed) {
      if (access.reason === 'unmatched') {
        throw AppError.forbidden('This conversation belongs to an unmatched connection.');
      }
      throw AppError.forbidden('You are not authorized to view messages in this conversation.');
    }

    const result = await MessageModel.findByConversation(conversationId, userId, options);

    // Auto mark as read in the background
    ConversationModel.markAsRead(conversationId, userId).catch((err) => {
      logger.warn('[MessageService] Error marking conversation as read:', err);
    });

    return result;
  }

  /**
   * Validate, store in MySQL, and broadcast a new message via Socket.IO
   */
  public static async sendMessage(
    userId: number,
    conversationId: number,
    rawContent: string
  ): Promise<MessageItem> {
    if (isNaN(conversationId) || conversationId <= 0) {
      throw AppError.badRequest('Invalid conversation ID.');
    }

    // 1. Validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw AppError.badRequest('Message content must be a non-empty string.');
    }

    const content = rawContent.trim();
    if (content.length === 0) {
      throw AppError.badRequest('Message cannot be empty or contain only whitespace.');
    }

    if (content.length > 2000) {
      throw AppError.badRequest('Message content exceeds the maximum limit of 2,000 characters.');
    }

    // 2. Authorization & Match state check
    const access = await ConversationModel.verifyUserAccess(conversationId, userId);
    if (!access.allowed) {
      if (access.reason === 'unmatched') {
        throw AppError.forbidden('Cannot send messages because this connection has been unmatched.');
      }
      throw AppError.forbidden('You are not authorized to send messages in this conversation.');
    }

    // 2b. Block verification
    if (access.partnerUserId) {
      const { BlockModel } = await import('../models/block.model');
      const isBlocked = await BlockModel.isBlocked(userId, access.partnerUserId);
      if (isBlocked) {
        throw AppError.forbidden('Cannot send message: this conversation is blocked.');
      }
    }

    // 3. Persist to MySQL
    const messageId = await MessageModel.createMessage(
      conversationId,
      userId,
      content,
      'text'
    );

    // 4. Fetch the created message item
    const createdMessage = await MessageModel.findById(messageId, userId);
    if (!createdMessage) {
      throw AppError.internal('Failed to retrieve persisted message.');
    }

    logger.info(`[MessageService] Message ${messageId} saved in conversation ${conversationId} by user ${userId}`);

    // 5. Broadcast to Socket.IO room & notify partner
    if (access.partnerUserId) {
      emitNewMessage(conversationId, createdMessage, access.partnerUserId);

      // Intelligent notification: only create if recipient is not actively in the conversation room
      const isViewing = isUserInConversationRoom(access.partnerUserId, conversationId);
      if (!isViewing) {
        ProfileModel.findByUserId(userId)
          .then((senderProfile) => {
            const senderName = senderProfile?.first_name || 'Your match';
            const previewText = content.length > 60 ? content.slice(0, 57) + '...' : content;
            NotificationService.createNotification({
              userId: access.partnerUserId!,
              actorId: userId,
              type: 'NEW_MESSAGE',
              title: `New message from ${senderName}`,
              message: previewText,
              referenceType: 'conversation',
              referenceId: conversationId,
            }).catch((err) => {
              logger.warn('[MessageService] Failed to create message notification:', err);
            });
          })
          .catch(() => {});
      }
    }

    return createdMessage;
  }
}

export default MessageService;
