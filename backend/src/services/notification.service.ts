import { NotificationModel } from '../models/notification.model';
import { SettingsModel } from '../models/settings.model';
import { BlockModel } from '../models/block.model';
import {
  CreateNotificationInput,
  NotificationItem,
  NotificationListResult,
} from '../types/notification.types';
import {
  emitNotification,
  emitNotificationRead,
  emitNotificationReadAll,
} from '../sockets/socket';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class NotificationService {
  /**
   * Centralized notification creator: persists to MySQL and delivers via Socket.IO
   * Respects user notification settings and block rules
   */
  public static async createNotification(input: CreateNotificationInput): Promise<NotificationItem | null> {
    try {
      // 1. Check if recipient has blocked actor or actor has blocked recipient
      if (input.actorId) {
        const isBlocked = await BlockModel.isBlocked(input.userId, input.actorId);
        if (isBlocked) {
          logger.info(`[NotificationService] Suppressing notification for user ${input.userId} from blocked user ${input.actorId}`);
          return null;
        }
      }

      // 2. Check recipient notification preferences
      const settings = await SettingsModel.findByUserId(input.userId);
      if (settings) {
        const t = (input.type || '').toUpperCase();
        if ((t === 'MATCH_CREATED' || t === 'NEW_MATCH') && !settings.notifyMatches) {
          return null;
        }
        if ((t === 'NEW_MESSAGE') && !settings.notifyMessages) {
          return null;
        }
        if ((t === 'LIKE_RECEIVED') && !settings.notifyLikes) {
          return null;
        }
        if ((t === 'SUPERLIKE_RECEIVED' || t === 'SUPER_LIKE_RECEIVED') && !settings.notifySuperLikes) {
          return null;
        }
        if ((t === 'REACTION_RECEIVED') && !settings.notifyReactions) {
          return null;
        }
        if ((t === 'SYSTEM') && !settings.notifySystem) {
          return null;
        }
      }

      const notificationId = await NotificationModel.createNotification(input);
      const notification = await NotificationModel.findById(notificationId);

      if (!notification) {
        throw new Error('Failed to retrieve created notification');
      }

      const unreadCount = await NotificationModel.countUnread(input.userId);

      // Deliver via real-time WebSocket to intended recipient
      emitNotification(input.userId, notification, unreadCount);

      return notification;
    } catch (error) {
      logger.error(`[NotificationService] Error creating notification for user ${input.userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve paginated notifications with filters (all / unread)
   */
  public static async getUserNotifications(
    userId: number,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<NotificationListResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const unreadOnly = !!options.unreadOnly;

    const [listData, unreadCount] = await Promise.all([
      NotificationModel.findByUserId(userId, { page, limit, unreadOnly }),
      NotificationModel.countUnread(userId),
    ]);

    const totalPages = Math.ceil(listData.total / limit) || 1;

    return {
      notifications: listData.notifications,
      pagination: {
        page,
        limit,
        total: listData.total,
        totalPages,
      },
      unreadCount,
    };
  }

  /**
   * Fetch active unread notification count
   */
  public static async getUnreadCount(userId: number): Promise<number> {
    return await NotificationModel.countUnread(userId);
  }

  /**
   * Mark a single notification as read with ownership validation
   */
  public static async markAsRead(
    notificationId: number,
    userId: number
  ): Promise<{ success: boolean; unreadCount: number }> {
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      throw AppError.notFound('Notification not found.');
    }

    if (notification.userId !== userId) {
      throw AppError.forbidden('You are not authorized to access this notification.');
    }

    await NotificationModel.markAsRead(notificationId, userId);
    const unreadCount = await NotificationModel.countUnread(userId);

    // Synchronize across multiple active tabs
    emitNotificationRead(userId, notificationId, unreadCount);

    return { success: true, unreadCount };
  }

  /**
   * Mark all notifications as read for authenticated user
   */
  public static async markAllAsRead(userId: number): Promise<{ markedCount: number; unreadCount: number }> {
    const markedCount = await NotificationModel.markAllAsRead(userId);

    // Synchronize across multiple active tabs
    emitNotificationReadAll(userId);

    return { markedCount, unreadCount: 0 };
  }

  /**
   * Delete a notification owned by the user
   */
  public static async deleteNotification(
    notificationId: number,
    userId: number
  ): Promise<{ success: boolean; unreadCount: number }> {
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      throw AppError.notFound('Notification not found.');
    }

    if (notification.userId !== userId) {
      throw AppError.forbidden('You are not authorized to delete this notification.');
    }

    await NotificationModel.deleteNotification(notificationId, userId);
    const unreadCount = await NotificationModel.countUnread(userId);

    return { success: true, unreadCount };
  }
}

export default NotificationService;
