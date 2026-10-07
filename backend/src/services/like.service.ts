import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import EntitlementService from './entitlement.service';

export interface ReceivedLikeItem {
  id: number;
  userId: number;
  firstName: string;
  lastName: string | null;
  age: number | null;
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  primaryPhotoUrl: string | null;
  isSuperLike: boolean;
  likedAt: string;
}

export class LikeService {
  /**
   * Get incoming unreciprocated likes for the authenticated user
   * Strictly protected by the 'SEE_WHO_LIKED' premium feature entitlement
   */
  public static async getReceivedLikes(userId: number): Promise<{
    count: number;
    isPremium: boolean;
    likes: ReceivedLikeItem[];
  }> {
    // 1. Check feature entitlement
    const isEntitled = await EntitlementService.hasFeature(userId, 'SEE_WHO_LIKED');

    if (!isEntitled) {
      // Query incoming like count for teaser display
      const [countRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total 
         FROM likes l
         WHERE l.to_user_id = ?
           AND NOT EXISTS (SELECT 1 FROM likes r WHERE r.from_user_id = ? AND r.to_user_id = l.from_user_id)
           AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.from_user_id = ? AND p.to_user_id = l.from_user_id)`,
        [userId, userId, userId]
      );
      const total = Number(countRows[0]?.total || 0);

      throw new AppError(
        `Seeing who liked you is a Premium feature. You have ${total} people waiting to connect! Upgrade to reveal.`,
        HttpStatus.FORBIDDEN
      );
    }

    // 2. Fetch full profiles of users who liked this user (including super likes)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         l.id as like_id,
         l.from_user_id as user_id,
         l.created_at as liked_at,
         p.first_name,
         p.last_name,
         p.bio,
         p.location_city,
         p.location_country,
         TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
         (SELECT ph.file_url FROM photos ph WHERE ph.user_id = l.from_user_id AND ph.is_primary = TRUE LIMIT 1) as primary_photo_url,
         EXISTS (SELECT 1 FROM super_likes sl WHERE sl.from_user_id = l.from_user_id AND sl.to_user_id = l.to_user_id) as is_super_like
       FROM likes l
       JOIN users u ON l.from_user_id = u.id AND u.status = 'active'
       JOIN profiles p ON l.from_user_id = p.user_id
       WHERE l.to_user_id = ?
         AND NOT EXISTS (SELECT 1 FROM likes r WHERE r.from_user_id = ? AND r.to_user_id = l.from_user_id)
         AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.from_user_id = ? AND p.to_user_id = l.from_user_id)
       ORDER BY is_super_like DESC, l.created_at DESC`,
      [userId, userId, userId]
    );

    const likes: ReceivedLikeItem[] = rows.map((r) => ({
      id: Number(r.like_id),
      userId: Number(r.user_id),
      firstName: r.first_name || 'Member',
      lastName: r.last_name || null,
      age: r.age != null ? Number(r.age) : null,
      bio: r.bio || null,
      locationCity: r.location_city || null,
      locationCountry: r.location_country || null,
      primaryPhotoUrl: r.primary_photo_url || null,
      isSuperLike: Boolean(r.is_super_like),
      likedAt: new Date(r.liked_at).toISOString(),
    }));

    return {
      count: likes.length,
      isPremium: true,
      likes,
    };
  }
}

export default LikeService;
