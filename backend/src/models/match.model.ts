import { query, execute } from '../config/database';
import { MatchRow, UserMatchItem, MatchUser } from '../types/matching.types';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { PhotoModel } from './photo.model';
import { ProfileModel } from './profile.model';
import { ConversationModel } from './conversation.model';

export class MatchModel {
  /**
   * Find an active match between two users, normalizing pair order
   */
  public static async findMatchBetween(
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<MatchRow | null> {
    const userOne = Math.min(userA, userB);
    const userTwo = Math.max(userA, userB);

    const sql = `
      SELECT id, user_one_id, user_two_id, matched_at, status, unmatched_by, unmatched_at, created_at, updated_at 
      FROM matches 
      WHERE user_one_id = ? AND user_two_id = ? AND status = 'active' 
      LIMIT 1
    `;
    const params = [userOne, userTwo];

    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, params))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, params);

    return (rows[0] as MatchRow) || null;
  }

  /**
   * Alias for findMatchBetween
   */
  public static async findMatch(
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<MatchRow | null> {
    return this.findMatchBetween(userA, userB, conn);
  }

  /**
   * Create or reactivate a match between two users with strict pair normalization
   */
  public static async createMatch(
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<number> {
    const userOne = Math.min(userA, userB);
    const userTwo = Math.max(userA, userB);

    // 1. Check if match already exists (active or unmatched)
    const checkSql = `
      SELECT id, status 
      FROM matches 
      WHERE user_one_id = ? AND user_two_id = ? 
      LIMIT 1
    `;
    const params = [userOne, userTwo];

    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(checkSql, params))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(checkSql, params);

    if (rows.length > 0) {
      const existing = rows[0] as { id: number; status: string };
      if (existing.status === 'active') {
        return existing.id;
      }

      // Reactivate previously unmatched connection
      const updateSql = `
        UPDATE matches 
        SET status = 'active', matched_at = CURRENT_TIMESTAMP, unmatched_by = NULL, unmatched_at = NULL 
        WHERE id = ?
      `;
      if (conn) {
        await conn.query<ResultSetHeader>(updateSql, [existing.id]);
      } else {
        await execute(updateSql, [existing.id]);
      }
      try {
        await ConversationModel.getOrCreateForMatch(existing.id, userOne, userTwo, conn);
      } catch {
        // Conversation already existing or created
      }
      return existing.id;
    }

    // 2. Insert new match
    const insertSql = `
      INSERT INTO matches (user_one_id, user_two_id, status, matched_at) 
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
    `;

    let matchId: number;
    if (conn) {
      const [result] = await conn.query<ResultSetHeader>(insertSql, [userOne, userTwo]);
      matchId = result.insertId;
    } else {
      const result = await execute(insertSql, [userOne, userTwo]);
      matchId = result.insertId;
    }

    if (matchId) {
      try {
        await ConversationModel.getOrCreateForMatch(matchId, userOne, userTwo, conn);
      } catch {
        // Handled idempotent conversation setup
      }
    }
    return matchId;
  }

  /**
   * Find all active matches for a user with the other user's profile and primary photo
   */
  public static async findUserMatches(userId: number): Promise<UserMatchItem[]> {
    const sql = `
      SELECT 
        m.id AS match_id,
        m.matched_at,
        m.created_at AS match_created_at,
        m.user_one_id,
        m.user_two_id,
        u.id AS partner_user_id,
        u.is_email_verified,
        p.first_name,
        p.last_name,
        p.gender,
        p.bio,
        p.occupation,
        p.education,
        p.location_city,
        p.location_state,
        p.location_country,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS partner_age,
        ph.id AS primary_photo_id,
        ph.file_url AS primary_photo_url
      FROM matches m
      INNER JOIN users u 
        ON u.id = IF(m.user_one_id = ?, m.user_two_id, m.user_one_id)
      LEFT JOIN profiles p 
        ON p.user_id = u.id
      LEFT JOIN photos ph 
        ON ph.id = (
          SELECT id FROM photos 
          WHERE user_id = u.id 
          ORDER BY is_primary DESC, display_order ASC, id ASC 
          LIMIT 1
        )
      WHERE (m.user_one_id = ? OR m.user_two_id = ?)
        AND m.status = 'active'
        AND u.status = 'active'
      ORDER BY m.matched_at DESC, m.id DESC
    `;

    const rows = await query<RowDataPacket[]>(sql, [userId, userId, userId]);

    return rows.map((row) => ({
      id: Number(row.match_id),
      matchedAt: row.matched_at ? new Date(row.matched_at).toISOString() : new Date().toISOString(),
      createdAt: row.match_created_at ? new Date(row.match_created_at).toISOString() : undefined,
      user: {
        id: Number(row.partner_user_id),
        firstName: String(row.first_name || 'Member'),
        lastName: row.last_name ? String(row.last_name) : null,
        age: row.partner_age !== null && row.partner_age !== undefined ? Number(row.partner_age) : null,
        gender: row.gender ? String(row.gender) : null,
        bio: row.bio ? String(row.bio) : null,
        occupation: row.occupation ? String(row.occupation) : null,
        education: row.education ? String(row.education) : null,
        location: {
          city: row.location_city ? String(row.location_city) : null,
          state: row.location_state ? String(row.location_state) : null,
          country: row.location_country ? String(row.location_country) : null,
        },
        primaryPhoto: row.primary_photo_id
          ? {
              id: Number(row.primary_photo_id),
              fileUrl: String(row.primary_photo_url),
              isPrimary: true,
            }
          : null,
        avatarUrl: row.primary_photo_url ? String(row.primary_photo_url) : null,
        photoUrl: row.primary_photo_url ? String(row.primary_photo_url) : null,
        isVerified: Boolean(row.is_email_verified),
      },
    }));
  }

  /**
   * Find a specific match by ID, ensuring the requesting user belongs to it
   */
  public static async findMatchById(
    matchId: number,
    userId?: number
  ): Promise<UserMatchItem | null> {
    let sql = `
      SELECT 
        m.id AS match_id,
        m.matched_at,
        m.created_at AS match_created_at,
        m.user_one_id,
        m.user_two_id,
        u.id AS partner_user_id,
        u.is_email_verified,
        p.first_name,
        p.last_name,
        p.gender,
        p.bio,
        p.occupation,
        p.education,
        p.location_city,
        p.location_state,
        p.location_country,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS partner_age,
        ph.id AS primary_photo_id,
        ph.file_url AS primary_photo_url
      FROM matches m
      INNER JOIN users u 
        ON u.id = IF(m.user_one_id = ?, m.user_two_id, m.user_one_id)
      LEFT JOIN profiles p 
        ON p.user_id = u.id
      LEFT JOIN photos ph 
        ON ph.id = (
          SELECT id FROM photos 
          WHERE user_id = u.id 
          ORDER BY is_primary DESC, display_order ASC, id ASC 
          LIMIT 1
        )
      WHERE m.id = ?
        AND m.status = 'active'
        AND u.status = 'active'
    `;
    const params: any[] = [userId || 0, matchId];

    if (userId) {
      sql += ' AND (m.user_one_id = ? OR m.user_two_id = ?)';
      params.push(userId, userId);
    }

    sql += ' LIMIT 1';

    const rows = await query<RowDataPacket[]>(sql, params);
    if (!rows[0]) return null;

    const row = rows[0];
    const partnerId = Number(row.partner_user_id);

    // Fetch full photos list and interests for detailed profile view
    const [allPhotos, interests] = await Promise.all([
      PhotoModel.findByUserId(partnerId),
      ProfileModel.getUserInterests(partnerId),
    ]);

    const partnerUser: MatchUser = {
      id: partnerId,
      firstName: String(row.first_name || 'Member'),
      lastName: row.last_name ? String(row.last_name) : null,
      age: row.partner_age !== null && row.partner_age !== undefined ? Number(row.partner_age) : null,
      gender: row.gender ? String(row.gender) : null,
      bio: row.bio ? String(row.bio) : null,
      occupation: row.occupation ? String(row.occupation) : null,
      education: row.education ? String(row.education) : null,
      location: {
        city: row.location_city ? String(row.location_city) : null,
        state: row.location_state ? String(row.location_state) : null,
        country: row.location_country ? String(row.location_country) : null,
      },
      primaryPhoto: row.primary_photo_id
        ? {
            id: Number(row.primary_photo_id),
            fileUrl: String(row.primary_photo_url),
            isPrimary: true,
          }
        : null,
      avatarUrl: row.primary_photo_url ? String(row.primary_photo_url) : null,
      photoUrl: row.primary_photo_url ? String(row.primary_photo_url) : null,
      photos: allPhotos.map((p) => ({
        id: p.id,
        fileUrl: p.file_url,
        isPrimary: Boolean(p.is_primary),
      })),
      interests: interests.map((i) => i.name),
      isVerified: Boolean(row.is_email_verified),
    };

    return {
      id: Number(row.match_id),
      matchedAt: row.matched_at ? new Date(row.matched_at).toISOString() : new Date().toISOString(),
      createdAt: row.match_created_at ? new Date(row.match_created_at).toISOString() : undefined,
      user: partnerUser,
    };
  }

  /**
   * Unmatch / remove match securely. Authenticated user must belong to the match.
   */
  public static async deleteMatch(
    matchId: number,
    userId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = `
      UPDATE matches 
      SET status = 'unmatched', unmatched_by = ?, unmatched_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND (user_one_id = ? OR user_two_id = ?) AND status = 'active'
    `;
    const params = [userId, matchId, userId, userId];

    if (conn) {
      const [res] = await conn.query<ResultSetHeader>(sql, params);
      return res.affectedRows > 0;
    } else {
      const res = await execute(sql, params);
      return res.affectedRows > 0;
    }
  }

  /**
   * Count total active matches for a user
   */
  public static async countUserMatches(userId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total 
      FROM matches 
      WHERE (user_one_id = ? OR user_two_id = ?) AND status = 'active'
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, userId]);
    return Number(rows[0]?.total || 0);
  }

  /**
   * Get all active matched partner user IDs for a user (for presence broadcasts)
   */
  public static async getActivePartnerIds(userId: number): Promise<number[]> {
    const sql = `
      SELECT IF(user_one_id = ?, user_two_id, user_one_id) AS partner_id
      FROM matches 
      WHERE (user_one_id = ? OR user_two_id = ?) AND status = 'active'
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, userId, userId]);
    return rows.map((r) => Number(r.partner_id));
  }
}

export default MatchModel;
