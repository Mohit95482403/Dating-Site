import { pool, query, execute } from '../config/database';
import { ProfileRow, PreferenceRow, PhotoRow, PublicUserProfile } from '../types/profile.types';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { PromptModel } from './prompt.model';
import { VerificationModel } from './verification.model';
import { SocketUserRegistry } from '../sockets/socketEvents';

export class ProfileModel {
  /**
   * Find profile by user ID
   */
  public static async findByUserId(
    userId: number,
    conn?: PoolConnection
  ): Promise<ProfileRow | null> {
    const sql = `
      SELECT id, user_id, first_name, last_name, date_of_birth, gender, bio,
             occupation, education, location_city, location_state, location_country,
             latitude, longitude, profile_visibility, is_profile_complete, is_verified,
             created_at, updated_at
      FROM profiles
      WHERE user_id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return (rows[0] as unknown as ProfileRow) || null;
  }

  /**
   * Create new empty or minimal profile
   */
  public static async create(
    userId: number,
    firstName: string,
    lastName?: string,
    conn?: PoolConnection
  ): Promise<number> {
    const sql = 'INSERT INTO profiles (user_id, first_name, last_name) VALUES (?, ?, ?)';
    const params = [userId, firstName, lastName || null];

    if (conn) {
      const [result] = await conn.execute<any>(sql, params);
      return result.insertId;
    }
    const result = await execute(sql, params);
    return result.insertId;
  }

  /**
   * Update profile fields partially and safely using parameterized queries
   */
  public static async update(
    userId: number,
    fields: Partial<ProfileRow>,
    conn?: PoolConnection
  ): Promise<void> {
    const allowedCols: Array<keyof ProfileRow> = [
      'first_name',
      'last_name',
      'date_of_birth',
      'gender',
      'bio',
      'occupation',
      'education',
      'location_city',
      'location_state',
      'location_country',
      'latitude',
      'longitude',
      'profile_visibility',
      'is_profile_complete',
      'is_verified',
    ];

    const keys = Object.keys(fields).filter((k) =>
      allowedCols.includes(k as keyof ProfileRow)
    ) as Array<keyof ProfileRow>;

    if (keys.length === 0) return;

    const setClause = keys.map((k) => `${String(k)} = ?`).join(', ');
    const values = keys.map((k) => (fields as any)[k]);
    values.push(userId);

    const sql = `UPDATE profiles SET ${setClause} WHERE user_id = ?`;

    if (conn) {
      await conn.execute(sql, values);
    } else {
      await execute(sql, values);
    }
  }

  /**
   * Fetch dating preferences for a user
   */
  public static async getPreferences(
    userId: number,
    conn?: PoolConnection
  ): Promise<PreferenceRow | null> {
    const sql = `
      SELECT id, user_id, min_age, max_age, preferred_gender, max_distance_km,
             relationship_goal, created_at, updated_at
      FROM preferences
      WHERE user_id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return (rows[0] as unknown as PreferenceRow) || null;
  }

  /**
   * Upsert preferences for a user
   */
  public static async upsertPreferences(
    userId: number,
    fields: Partial<PreferenceRow>,
    conn?: PoolConnection
  ): Promise<void> {
    const sql = `
      INSERT INTO preferences (user_id, min_age, max_age, preferred_gender, max_distance_km, relationship_goal)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        min_age = COALESCE(VALUES(min_age), min_age),
        max_age = COALESCE(VALUES(max_age), max_age),
        preferred_gender = COALESCE(VALUES(preferred_gender), preferred_gender),
        max_distance_km = COALESCE(VALUES(max_distance_km), max_distance_km),
        relationship_goal = COALESCE(VALUES(relationship_goal), relationship_goal)
    `;

    const existing = await this.getPreferences(userId, conn);
    const minAge = fields.min_age !== undefined ? fields.min_age : existing?.min_age ?? 18;
    const maxAge = fields.max_age !== undefined ? fields.max_age : existing?.max_age ?? 100;
    const preferredGender =
      fields.preferred_gender !== undefined
        ? fields.preferred_gender
        : existing?.preferred_gender ?? 'all';
    const maxDistanceKm =
      fields.max_distance_km !== undefined
        ? fields.max_distance_km
        : existing?.max_distance_km ?? 50;
    const relationshipGoal =
      fields.relationship_goal !== undefined
        ? fields.relationship_goal
        : existing?.relationship_goal ?? 'not_sure';

    const params = [userId, minAge, maxAge, preferredGender, maxDistanceKm, relationshipGoal];

    if (conn) {
      await conn.execute(sql, params);
    } else {
      await execute(sql, params);
    }
  }

  /**
   * Get user's detailed interests (joined with interests table)
   */
  public static async getUserInterests(
    userId: number,
    conn?: PoolConnection
  ): Promise<Array<{ id: number; name: string; slug: string }>> {
    const sql = `
      SELECT i.id, i.name, i.slug
      FROM interests i
      INNER JOIN user_interests ui ON i.id = ui.interest_id
      WHERE ui.user_id = ?
      ORDER BY i.name ASC
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
    }));
  }

  /**
   * Replace user interests atomically within an active transaction connection
   */
  public static async replaceUserInterests(
    userId: number,
    interestIds: number[],
    conn: PoolConnection
  ): Promise<void> {
    // 1. Delete all existing user interests
    await conn.execute('DELETE FROM user_interests WHERE user_id = ?', [userId]);

    // 2. Insert new interests if any provided
    if (interestIds.length > 0) {
      for (const interestId of interestIds) {
        await conn.execute(
          'INSERT INTO user_interests (user_id, interest_id) VALUES (?, ?)',
          [userId, interestId]
        );
      }
    }
  }

  /**
   * Get all photos for a user ordered by primary first, then display_order and created_at
   */
  public static async getPhotos(
    userId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow[]> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE user_id = ?
      ORDER BY is_primary DESC, display_order ASC, created_at ASC
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return rows as unknown as PhotoRow[];
  }

  /**
   * Find a specific photo by photo ID
   */
  public static async findPhotoById(
    photoId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow | null> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [photoId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [photoId]);

    return (rows[0] as unknown as PhotoRow) || null;
  }

  /**
   * Find a photo owned by a specific user (Ownership Verification)
   */
  public static async findUserPhoto(
    userId: number,
    photoId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow | null> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [photoId, userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [photoId, userId]);

    return (rows[0] as unknown as PhotoRow) || null;
  }

  /**
   * Add a new photo record
   */
  public static async addPhoto(
    userId: number,
    photo: {
      fileUrl: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      displayOrder: number;
      isPrimary: boolean;
    },
    conn?: PoolConnection
  ): Promise<number> {
    const sql = `
      INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      photo.fileUrl,
      photo.fileName,
      photo.mimeType,
      photo.fileSize,
      photo.displayOrder,
      photo.isPrimary ? 1 : 0,
    ];

    if (conn) {
      const [result] = await conn.execute<any>(sql, params);
      return result.insertId;
    }
    const result = await execute(sql, params);
    return result.insertId;
  }

  /**
   * Delete a photo with ownership check
   */
  public static async deletePhoto(
    userId: number,
    photoId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = 'DELETE FROM photos WHERE id = ? AND user_id = ?';
    const params = [photoId, userId];

    if (conn) {
      const [result] = await conn.execute<any>(sql, params);
      return result.affectedRows > 0;
    }
    const result = await execute(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * Set primary photo inside a transaction
   */
  public static async setPrimaryPhoto(
    userId: number,
    photoId: number,
    conn: PoolConnection
  ): Promise<void> {
    // 1. Reset all photos of user to is_primary = FALSE
    await conn.execute('UPDATE photos SET is_primary = FALSE WHERE user_id = ?', [userId]);

    // 2. Set the target photo to is_primary = TRUE
    await conn.execute('UPDATE photos SET is_primary = TRUE WHERE id = ? AND user_id = ?', [
      photoId,
      userId,
    ]);
  }

  /**
   * Reorder photos for a user and optionally set the first photo as primary
   */
  public static async reorderPhotos(
    userId: number,
    photoIds: number[],
    conn: PoolConnection
  ): Promise<void> {
    for (let index = 0; index < photoIds.length; index++) {
      const pId = photoIds[index];
      const isPrimary = index === 0 ? 1 : 0;
      await conn.execute(
        'UPDATE photos SET display_order = ?, is_primary = ? WHERE id = ? AND user_id = ?',
        [index, isPrimary, pId, userId]
      );
    }
  }

  /**
   * Update profile completion flag
   */
  public static async updateCompletionStatus(
    userId: number,
    isComplete: boolean,
    conn?: PoolConnection
  ): Promise<void> {
    const sql = 'UPDATE profiles SET is_profile_complete = ? WHERE user_id = ?';
    const params = [isComplete ? 1 : 0, userId];

    if (conn) {
      await conn.execute(sql, params);
    } else {
      await execute(sql, params);
    }
  }

  /**
   * Fetch public sanitized profile of another user respecting Day 15 privacy and blocking rules
   */
  public static async getPublicProfile(
    targetUserId: number,
    viewerUserId: number
  ): Promise<PublicUserProfile | null> {
    // 1. Bilateral block check
    const blockRows = await query<RowDataPacket[]>(
      `SELECT id FROM blocks 
       WHERE (blocker_id = ? AND blocked_user_id = ?) 
          OR (blocker_id = ? AND blocked_user_id = ?)
       LIMIT 1`,
      [viewerUserId, targetUserId, targetUserId, viewerUserId]
    );
    if (blockRows.length > 0) {
      return null;
    }

    // 2. Fetch target user profile and privacy settings
    const sql = `
      SELECT p.id, p.user_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.bio,
             p.occupation, p.education, p.location_city, p.location_state, p.location_country,
             p.is_verified, p.profile_visibility as profile_vis,
             us.profile_visibility as settings_vis, us.show_online_status, us.show_last_seen,
             u.status as user_status, u.last_seen_at
      FROM profiles p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN user_settings us ON p.user_id = us.user_id
      WHERE p.user_id = ? AND u.status = 'active'
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [targetUserId]);
    if (rows.length === 0) return null;

    const row = rows[0];

    // 3. Match status with viewer
    const matchRows = await query<RowDataPacket[]>(
      `SELECT m.id, m.status, c.id as conversation_id
       FROM matches m
       LEFT JOIN conversations c ON m.id = c.match_id
       WHERE (
         (m.user_one_id = ? AND m.user_two_id = ?) OR 
         (m.user_two_id = ? AND m.user_one_id = ?)
       )
       LIMIT 1`,
      [viewerUserId, targetUserId, viewerUserId, targetUserId]
    );

    const matchRecord = matchRows[0] || null;
    const isMatched = matchRecord?.status === 'active';
    const isUnmatched = matchRecord?.status === 'unmatched';
    const matchStatus: 'none' | 'matched' | 'unmatched' = isMatched
      ? 'matched'
      : isUnmatched
      ? 'unmatched'
      : 'none';
    const conversationId = matchRecord?.conversation_id ? Number(matchRecord.conversation_id) : null;
    const canMessage = isMatched && conversationId !== null;

    // 4. Privacy Visibility check
    const effectiveVisibility = row.settings_vis || row.profile_vis || 'public';
    if (effectiveVisibility === 'hidden') {
      return null;
    }
    if (effectiveVisibility === 'matches_only' && !isMatched) {
      return null;
    }

    // 5. Photos, Interests, Prompts, and Verification
    const [photos, interests, prompts, verification] = await Promise.all([
      this.getPhotos(targetUserId),
      this.getUserInterests(targetUserId),
      PromptModel.getUserPrompts(targetUserId),
      VerificationModel.getVerificationStatus(targetUserId),
    ]);

    // 6. Online Presence & Last Seen
    const canShowOnline = row.show_online_status === null || Boolean(row.show_online_status);
    const canShowLastSeen = row.show_last_seen === null || Boolean(row.show_last_seen);

    const isOnline = canShowOnline ? SocketUserRegistry.isUserOnline(targetUserId) : null;
    const lastSeenAt = canShowLastSeen && row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null;

    // Calculate age
    let age: number | null = null;
    if (row.date_of_birth) {
      const birthDate = new Date(row.date_of_birth);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    }

      const primaryPhoto = photos.find((p) => p.is_primary) || photos[0] || null;

      return {
        userId: Number(row.user_id),
        firstName: String(row.first_name),
        lastName: row.last_name ? String(row.last_name) : null,
        age,
        gender: row.gender ? String(row.gender) : null,
        bio: row.bio ? String(row.bio) : null,
        occupation: row.occupation ? String(row.occupation) : null,
        education: row.education ? String(row.education) : null,
        location: {
          city: row.location_city ? String(row.location_city) : null,
          state: row.location_state ? String(row.location_state) : null,
          country: row.location_country ? String(row.location_country) : null,
        },
        photos: photos.map((p) => ({
          id: Number(p.id),
          url: p.file_url,
          fileUrl: p.file_url,
          fileName: p.file_name,
          isPrimary: Boolean(p.is_primary),
          displayOrder: Number(p.display_order),
        })),
        avatarUrl: primaryPhoto ? primaryPhoto.file_url : null,
        photoUrl: primaryPhoto ? primaryPhoto.file_url : null,
        primaryPhoto: primaryPhoto
          ? {
              id: Number(primaryPhoto.id),
              fileUrl: primaryPhoto.file_url,
              url: primaryPhoto.file_url,
            }
          : null,
        interests: interests.map((i) => ({
          id: Number(i.id),
          name: String(i.name),
          slug: String(i.slug),
        })),
        prompts,
        isVerified: Boolean(row.is_verified) || verification.isVerified,
        verificationStatus: verification.status,
        isOnline,
        lastSeenAt,
        matchStatus,
        conversationId,
        canMessage,
      };
    }
}

export default ProfileModel;
