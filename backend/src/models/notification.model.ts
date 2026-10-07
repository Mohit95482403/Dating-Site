import { query, execute } from '../config/database';
import {
  CreateNotificationInput,
  NotificationItem,
  NotificationRow,
} from '../types/notification.types';
import { RowDataPacket } from 'mysql2/promise';

export class NotificationModel {
  /**
   * Insert a new notification with automatic deduplication protection
   */
  public static async createNotification(input: CreateNotificationInput): Promise<number> {
    const { userId, actorId = null, type, title, message, referenceType = null, referenceId = null } = input;

    // Deduplication guard: if an unread notification with identical parameters was created in the last 15s, return existing ID
    if (actorId && referenceType && referenceId) {
      const recent = await query<RowDataPacket[]>(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND actor_id = ? AND type = ? AND reference_type = ? AND reference_id = ? AND is_read = FALSE 
           AND created_at >= NOW() - INTERVAL 15 SECOND 
         LIMIT 1`,
        [userId, actorId, type, referenceType, referenceId]
      );
      if (recent.length > 0) {
        return recent[0].id;
      }
    }

    const result = await execute(
      `INSERT INTO notifications (user_id, actor_id, type, title, message, reference_type, reference_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, actorId || null, type, title, message, referenceType || null, referenceId || null]
    );

    return result.insertId;
  }

  /**
   * Find a single notification by ID with actor details
   */
  public static async findById(id: number): Promise<NotificationItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        n.id, n.user_id, n.actor_id, n.type, n.title, n.message,
        n.reference_type, n.reference_id, n.is_read, n.read_at, n.created_at,
        p.first_name AS actor_first_name,
        ph.file_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN profiles p ON n.actor_id = p.user_id
       LEFT JOIN photos ph ON n.actor_id = ph.user_id AND ph.is_primary = 1
       WHERE n.id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToItem(rows[0] as unknown as NotificationRow);
  }

  /**
   * Retrieve paginated notifications for a user with actor profile join (eliminates N+1)
   */
  public static async findByUserId(
    userId: number,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: NotificationItem[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const unreadOnly = !!options.unreadOnly;

    const whereClause = unreadOnly 
      ? 'WHERE n.user_id = ? AND n.is_read = FALSE' 
      : 'WHERE n.user_id = ?';

    // Count query
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM notifications n ${whereClause}`,
      [userId]
    );
    const total = Number(countRows[0]?.total || 0);

    // List query
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        n.id, n.user_id, n.actor_id, n.type, n.title, n.message,
        n.reference_type, n.reference_id, n.is_read, n.read_at, n.created_at,
        p.first_name AS actor_first_name,
        ph.file_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN profiles p ON n.actor_id = p.user_id
       LEFT JOIN photos ph ON n.actor_id = ph.user_id AND ph.is_primary = 1
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const notifications = (rows as unknown as NotificationRow[]).map(row => this.mapRowToItem(row));
    return { notifications, total };
  }

  /**
   * Fast indexed unread notification count
   */
  public static async countUnread(userId: number): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    return Number(rows[0]?.cnt || 0);
  }

  /**
   * Mark a single notification as read if owned by the user
   */
  public static async markAsRead(id: number, userId: number): Promise<boolean> {
    const result = await execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ? AND is_read = FALSE`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Mark all unread notifications as read for a user
   */
  public static async markAllAsRead(userId: number): Promise<number> {
    const result = await execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    return result.affectedRows;
  }

  /**
   * Delete a notification if owned by the user
   */
  public static async deleteNotification(id: number, userId: number): Promise<boolean> {
    const result = await execute(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Map raw database row to clean NotificationItem domain object
   */
  private static mapRowToItem(row: NotificationRow): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      type: row.type,
      title: row.title,
      message: row.message,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      isRead: Boolean(row.is_read),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      actor: row.actor_id
        ? {
            id: row.actor_id,
            firstName: row.actor_first_name || 'Member',
            avatarUrl: row.actor_avatar_url || null,
          }
        : null,
    };
  }
}

export default NotificationModel;
