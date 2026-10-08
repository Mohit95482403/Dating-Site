import { query, execute } from '../config/database';
import { BlockedUserItem } from '../types/settings.types';
import { RowDataPacket } from 'mysql2/promise';

export class BlockModel {
  /**
   * Retrieve all users blocked by the specified blocker
   */
  public static async getBlockedUsers(blockerId: number): Promise<BlockedUserItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        b.id,
        b.blocked_user_id as user_id,
        b.reason,
        b.created_at as blocked_at,
        u.username,
        p.first_name,
        p.last_name,
        ph.file_url as avatar_url
       FROM blocks b
       INNER JOIN users u ON b.blocked_user_id = u.id
       LEFT JOIN profiles p ON b.blocked_user_id = p.user_id
       LEFT JOIN photos ph ON b.blocked_user_id = ph.user_id AND ph.is_primary = 1
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
      [blockerId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      firstName: r.first_name || 'Member',
      lastName: r.last_name || null,
      username: r.username || null,
      avatarUrl: r.avatar_url || null,
      blockedAt: new Date(r.blocked_at).toISOString(),
      reason: r.reason || null,
    }));
  }

  /**
   * Block a user with duplicate and self-block protection
   */
  public static async blockUser(
    blockerId: number,
    blockedUserId: number,
    reason?: string
  ): Promise<boolean> {
    if (blockerId === blockedUserId) {
      throw new Error('You cannot block your own account.');
    }

    const res = await execute(
      `INSERT INTO blocks (blocker_id, blocked_user_id, reason)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [blockerId, blockedUserId, reason || null]
    );

    return res.affectedRows > 0;
  }

  /**
   * Unblock a user
   */
  public static async unblockUser(
    blockerId: number,
    blockedUserId: number
  ): Promise<boolean> {
    const res = await execute(
      `DELETE FROM blocks WHERE blocker_id = ? AND blocked_user_id = ?`,
      [blockerId, blockedUserId]
    );
    return res.affectedRows > 0;
  }

  /**
   * Check if a mutual or unilateral block exists between two users
   */
  public static async isBlocked(userA: number, userB: number): Promise<boolean> {
    if (!Number.isInteger(userA) || !Number.isInteger(userB) || userA <= 0 || userB <= 0) {
      return false;
    }
    const rows = await query<RowDataPacket[]>(
      `SELECT id FROM blocks 
       WHERE (blocker_id = ? AND blocked_user_id = ?) 
          OR (blocker_id = ? AND blocked_user_id = ?) 
       LIMIT 1`,
      [userA, userB, userB, userA]
    );
    return rows.length > 0;
  }
}

export default BlockModel;
