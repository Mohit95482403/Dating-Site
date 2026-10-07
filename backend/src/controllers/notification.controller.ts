import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

export class NotificationController {
  /**
   * GET /api/notifications - List user notifications with pagination & filter
   */
  public static async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const filter = (req.query.filter as string) || 'all';
      const unreadOnly = filter.toLowerCase() === 'unread';

      const result = await NotificationService.getUserNotifications(userId, {
        page,
        limit,
        unreadOnly,
      });

      ApiResponse.success(res, 'Notifications retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notifications/unread-count - Fetch unread notification count
   */
  public static async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const unreadCount = await NotificationService.getUnreadCount(userId);
      ApiResponse.success(res, 'Unread notification count retrieved', { unreadCount });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/:id/read - Mark single notification as read
   */
  public static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const notificationId = parseInt(req.params.id, 10);
      if (!notificationId || isNaN(notificationId)) {
        throw AppError.badRequest('Invalid notification ID.');
      }

      const result = await NotificationService.markAsRead(notificationId, userId);
      ApiResponse.success(res, 'Notification marked as read', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/read-all - Mark all user notifications as read
   */
  public static async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await NotificationService.markAllAsRead(userId);
      ApiResponse.success(res, 'All notifications marked as read', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/:id - Delete a notification
   */
  public static async deleteNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw AppError.unauthorized('Authentication required.');
      }

      const notificationId = parseInt(req.params.id, 10);
      if (!notificationId || isNaN(notificationId)) {
        throw AppError.badRequest('Invalid notification ID.');
      }

      const result = await NotificationService.deleteNotification(notificationId, userId);
      ApiResponse.success(res, 'Notification deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default NotificationController;
