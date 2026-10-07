import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

// All notification endpoints strictly require authentication
router.use(requireAuth);

// GET /api/notifications - Paginated notifications (?page=1&limit=20&filter=all|unread)
router.get('/', NotificationController.getNotifications);

// GET /api/notifications/unread-count - Fast unread badge counter
router.get('/unread-count', NotificationController.getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read (defined before /:id/read to prevent route shadowing)
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', NotificationController.deleteNotification);

export default router;
