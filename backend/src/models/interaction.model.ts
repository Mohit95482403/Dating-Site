import { query, execute, pool } from '../config/database';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { PersonalizationModel } from './personalization.model';

export class InteractionModel {
  /**
   * Verify if candidate user exists and is active
   */
  public static async isCandidateValid(targetUserId: number): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      `SELECT u.id, u.status, p.profile_visibility
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ? AND u.status = 'active' AND (p.profile_visibility != 'hidden' OR p.profile_visibility IS NULL)
       LIMIT 1`,
      [targetUserId]
    );
    return rows.length > 0;
  }

  /**
   * Check if fromUserId has already interacted with toUserId (Like, Pass, or SuperLike)
   */
  public static async hasInteracted(fromUserId: number, toUserId: number): Promise<boolean> {
    const [likeRows, passRows, superRows] = await Promise.all([
      query<RowDataPacket[]>(
        'SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ? LIMIT 1',
        [fromUserId, toUserId]
      ),
      query<RowDataPacket[]>(
        'SELECT id FROM passes WHERE from_user_id = ? AND to_user_id = ? LIMIT 1',
        [fromUserId, toUserId]
      ),
      query<RowDataPacket[]>(
        'SELECT id FROM super_likes WHERE from_user_id = ? AND to_user_id = ? LIMIT 1',
        [fromUserId, toUserId]
      ),
    ]);

    return likeRows.length > 0 || passRows.length > 0 || superRows.length > 0;
  }

  /**
   * Check if there is a block relationship between the two users
   */
  public static async isBlocked(userA: number, userB: number): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id FROM blocks 
       WHERE (blocker_id = ? AND blocked_user_id = ?) 
          OR (blocker_id = ? AND blocked_user_id = ?) 
       LIMIT 1`,
      [userA, userB, userB, userA]
    );
    return rows.length > 0;
  }

  /**
   * Record a LIKE interaction.
   * If user previously passed, delete the pass so LIKE supersedes it.
   */
  public static async recordLike(
    fromUserId: number,
    toUserId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = `
      INSERT INTO likes (from_user_id, to_user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `;
    if (conn) {
      // Clean up any old pass
      await conn.query('DELETE FROM passes WHERE from_user_id = ? AND to_user_id = ?', [fromUserId, toUserId]);
      await conn.query<ResultSetHeader>(sql, [fromUserId, toUserId]);
    } else {
      await execute('DELETE FROM passes WHERE from_user_id = ? AND to_user_id = ?', [fromUserId, toUserId]);
      await execute(sql, [fromUserId, toUserId]);
    }

    // Day 26: Trigger behavioral learning
    PersonalizationModel.recordBehaviorEvent(fromUserId, 'PROFILE_LIKE', 'PROFILE', String(toUserId)).catch(() => {});

    return true;
  }

  /**
   * Record a PASS interaction.
   */
  public static async recordPass(
    fromUserId: number,
    toUserId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = `
      INSERT INTO passes (from_user_id, to_user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `;
    if (conn) {
      await conn.query<ResultSetHeader>(sql, [fromUserId, toUserId]);
    } else {
      await execute(sql, [fromUserId, toUserId]);
    }

    // Day 26: Trigger behavioral learning
    PersonalizationModel.recordBehaviorEvent(fromUserId, 'PROFILE_SKIP', 'PROFILE', String(toUserId)).catch(() => {});

    return true;
  }

  /**
   * Record a SUPER LIKE interaction.
   * Also records in likes for compatibility.
   */
  public static async recordSuperLike(
    fromUserId: number,
    toUserId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const superSql = `
      INSERT INTO super_likes (from_user_id, to_user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `;
    const likeSql = `
      INSERT INTO likes (from_user_id, to_user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `;
    if (conn) {
      await conn.query('DELETE FROM passes WHERE from_user_id = ? AND to_user_id = ?', [fromUserId, toUserId]);
      await conn.query<ResultSetHeader>(superSql, [fromUserId, toUserId]);
      await conn.query<ResultSetHeader>(likeSql, [fromUserId, toUserId]);
    } else {
      await execute('DELETE FROM passes WHERE from_user_id = ? AND to_user_id = ?', [fromUserId, toUserId]);
      await execute(superSql, [fromUserId, toUserId]);
      await execute(likeSql, [fromUserId, toUserId]);
    }
    return true;
  }

  /**
   * Check if toUserId has liked or super-liked fromUserId (reciprocal like)
   */
  public static async checkReciprocalLike(
    fromUserId: number,
    toUserId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = `
      SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?
      UNION
      SELECT id FROM super_likes WHERE from_user_id = ? AND to_user_id = ?
      LIMIT 1
    `;
    const params = [toUserId, fromUserId, toUserId, fromUserId];

    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, params))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, params);

    return rows.length > 0;
  }

  /**
   * Create match between two users if not already matched
   */
  public static async createMatch(
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<number | null> {
    if (!Number.isInteger(userA) || !Number.isInteger(userB) || userA <= 0 || userB <= 0) {
      return null;
    }

    const userOne = Math.min(userA, userB);
    const userTwo = Math.max(userA, userB);

    const checkSql = `
      SELECT id FROM matches 
      WHERE user_one_id = ? AND user_two_id = ? AND status = 'active'
      LIMIT 1
    `;
    const existing = conn
      ? ((await conn.query<RowDataPacket[]>(checkSql, [userOne, userTwo]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(checkSql, [userOne, userTwo]);

    if (existing.length > 0) {
      return (existing[0] as { id: number }).id;
    }

    const insertSql = `
      INSERT INTO matches (user_one_id, user_two_id, status)
      VALUES (?, ?, 'active')
      ON DUPLICATE KEY UPDATE status = 'active', matched_at = CURRENT_TIMESTAMP
    `;

    if (conn) {
      const [res] = await conn.query<ResultSetHeader>(insertSql, [userOne, userTwo]);
      return res.insertId || null;
    } else {
      const res = await execute(insertSql, [userOne, userTwo]);
      return res.insertId || null;
    }
  }
}

export default InteractionModel;
