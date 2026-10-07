import { query } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import {
  DiscoveryFilterOptions,
  CandidateProfile,
  CandidateProfilePhoto,
  CandidateInterest,
} from '../types/discovery.types';

export class DiscoveryModel {
  /**
   * Get user preferences
   */
  public static async getUserPreferences(userId: number): Promise<{
    minAge: number;
    maxAge: number;
    preferredGender: string;
    maxDistanceKm: number;
    relationshipGoal: string;
    userGender?: string | null;
    userDob?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT pref.min_age, pref.max_age, pref.preferred_gender, pref.max_distance_km, pref.relationship_goal,
              p.gender as user_gender, p.date_of_birth as user_dob, p.latitude, p.longitude
       FROM preferences pref
       LEFT JOIN profiles p ON pref.user_id = p.user_id
       WHERE pref.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      // Check if user at least has a profile
      const profRows = await query<RowDataPacket[]>(
        'SELECT gender, date_of_birth, latitude, longitude FROM profiles WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (profRows.length > 0) {
        const p = profRows[0];
        return {
          minAge: 18,
          maxAge: 100,
          preferredGender: 'all',
          maxDistanceKm: 50,
          relationshipGoal: 'not_sure',
          userGender: p.gender || null,
          userDob: p.date_of_birth || null,
          latitude: p.latitude != null ? Number(p.latitude) : null,
          longitude: p.longitude != null ? Number(p.longitude) : null,
        };
      }
      return null;
    }

    const row = rows[0];
    return {
      minAge: row.min_age || 18,
      maxAge: row.max_age || 100,
      preferredGender: row.preferred_gender || 'all',
      maxDistanceKm: row.max_distance_km || 50,
      relationshipGoal: row.relationship_goal || 'not_sure',
      userGender: row.user_gender || null,
      userDob: row.user_dob || null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    };
  }

  /**
   * Get user's interest slugs
   */
  public static async getUserInterests(userId: number): Promise<string[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT i.name, i.slug
       FROM user_interests ui
       INNER JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = ?`,
      [userId]
    );
    return rows.map((r) => String(r.name));
  }

  /**
   * Query candidates from database with real SQL filtering
   */
  public static async findCandidateProfiles(
    currentUserId: number,
    options: DiscoveryFilterOptions
  ): Promise<{ profiles: CandidateProfile[]; nextCursor: number | null }> {
    const userPrefs = await this.getUserPreferences(currentUserId);
    const userInterests = await this.getUserInterests(currentUserId);

    const minAge = options.minAge ?? userPrefs?.minAge ?? 18;
    const maxAge = options.maxAge ?? userPrefs?.maxAge ?? 100;
    const gender = options.gender ?? userPrefs?.preferredGender ?? 'all';
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

    const queryParams: any[] = [
      currentUserId, // u.id != ?
      currentUserId, // likes from_user_id = ?
      currentUserId, // super_likes from_user_id = ?
      currentUserId, // passes from_user_id = ?
      currentUserId, // matches user_one_id = ?
      currentUserId, // matches user_two_id = ?
      currentUserId, // blocks blocker_id = ?
      currentUserId, // blocks blocked_user_id = ?
    ];

    let whereClause = `
      WHERE u.id != ?
        AND u.status = 'active'
        AND (p.profile_visibility != 'hidden' OR p.profile_visibility IS NULL)
        AND (us.show_in_discovery IS NULL OR us.show_in_discovery = 1)
        AND (us.profile_visibility IS NULL OR us.profile_visibility != 'none')
        AND NOT EXISTS (SELECT 1 FROM likes WHERE from_user_id = ? AND to_user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM super_likes WHERE from_user_id = ? AND to_user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM passes WHERE from_user_id = ? AND to_user_id = u.id)
        AND NOT EXISTS (
          SELECT 1 FROM matches 
          WHERE status = 'active' AND (
            (user_one_id = ? AND user_two_id = u.id) OR 
            (user_two_id = ? AND user_one_id = u.id)
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks 
          WHERE (blocker_id = ? AND blocked_user_id = u.id) OR 
                (blocker_id = u.id AND blocked_user_id = ?)
        )
    `;

    // Gender filtering
    if (gender && gender !== 'all') {
      whereClause += ` AND p.gender = ?`;
      queryParams.push(gender);
    }

    // Age filtering: compute age from date_of_birth
    whereClause += `
      AND (
        p.date_of_birth IS NULL 
        OR (TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) >= ? 
            AND TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) <= ?)
      )
    `;
    queryParams.push(minAge, maxAge);

    // Reciprocal preference filtering: if candidate has preferences, ensure candidate's preferred gender accepts current user's gender
    if (userPrefs?.userGender) {
      whereClause += `
        AND (
          c_pref.preferred_gender IS NULL 
          OR c_pref.preferred_gender = 'all' 
          OR c_pref.preferred_gender = ?
        )
      `;
      queryParams.push(userPrefs.userGender);
    }

    // Cursor pagination (ID based)
    if (options.cursor) {
      whereClause += ` AND u.id < ?`;
      queryParams.push(options.cursor);
    }

    // Query candidates
    const sql = `
      SELECT 
        u.id as user_id,
        u.email,
        u.is_email_verified as is_verified,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.bio,
        p.occupation,
        p.education,
        p.location_city,
        p.location_state,
        p.location_country,
        p.latitude,
        p.longitude,
        p.is_profile_complete,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as calculated_age,
        COALESCE(us.use_location_for_discovery, 1) as use_location_for_discovery,
        EXISTS (SELECT 1 FROM super_likes WHERE from_user_id = u.id AND to_user_id = ?) as has_super_liked_you,
        EXISTS (SELECT 1 FROM profile_boosts pb WHERE pb.user_id = u.id AND pb.status = 'active' AND pb.expires_at > NOW()) as is_boosted
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN preferences c_pref ON u.id = c_pref.user_id
      LEFT JOIN user_settings us ON u.id = us.user_id
      ${whereClause}
      ORDER BY has_super_liked_you DESC, is_boosted DESC, u.id DESC
      LIMIT ?
    `;

    // The has_super_liked_you subquery takes currentUserId
    const finalParams = [currentUserId, ...queryParams, limit + 1];
    const candidateRows = await query<RowDataPacket[]>(sql, finalParams);

    const hasMore = candidateRows.length > limit;
    const pagedCandidates = hasMore ? candidateRows.slice(0, limit) : candidateRows;

    if (pagedCandidates.length === 0) {
      return { profiles: [], nextCursor: null };
    }

    const candidateUserIds = pagedCandidates.map((c) => Number(c.user_id));

    // Batch fetch photos for all candidates
    const photoSql = `
      SELECT id, user_id, file_url, display_order, is_primary
      FROM photos
      WHERE user_id IN (?)
      ORDER BY user_id, display_order ASC, created_at ASC
    `;
    const photoRows = await query<RowDataPacket[]>(photoSql, [candidateUserIds]);
    const photoMap: Record<number, CandidateProfilePhoto[]> = {};
    for (const ph of photoRows) {
      const uid = Number(ph.user_id);
      if (!photoMap[uid]) photoMap[uid] = [];
      photoMap[uid].push({
        id: Number(ph.id),
        fileUrl: ph.file_url,
        displayOrder: Number(ph.display_order),
        isPrimary: Boolean(ph.is_primary),
      });
    }

    // Batch fetch interests for all candidates
    const interestSql = `
      SELECT ui.user_id, i.id, i.name, i.slug
      FROM user_interests ui
      INNER JOIN interests i ON ui.interest_id = i.id
      WHERE ui.user_id IN (?)
    `;
    const interestRows = await query<RowDataPacket[]>(interestSql, [candidateUserIds]);
    const interestMap: Record<number, CandidateInterest[]> = {};
    for (const row of interestRows) {
      const uid = Number(row.user_id);
      if (!interestMap[uid]) interestMap[uid] = [];
      interestMap[uid].push({
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        icon: null,
      });
    }

    // Build rich profile objects with explainable ranking
    const profiles: CandidateProfile[] = pagedCandidates.map((c) => {
      const uid = Number(c.user_id);
      const candPhotos = photoMap[uid] || [];
      const candInterests = interestMap[uid] || [];

      // Calculate shared interests
      const sharedInterests = candInterests
        .map((i) => i.name)
        .filter((name) => userInterests.includes(name));

      const sharedInterestsCount = sharedInterests.length;
      const hasSuperLikedYou = Boolean(c.has_super_liked_you);

      // Explainable ranking calculation
      let score = 65; // Base compatibility baseline
      if (hasSuperLikedYou) score += 20; // Candidate super-liked you
      score += Math.min(sharedInterestsCount * 8, 24); // Up to +24 for shared interests
      if (c.is_profile_complete) score += 5;
      if (candPhotos.length >= 2) score += 5;

      // Age closeness
      const age = c.calculated_age != null ? Number(c.calculated_age) : 25;
      const preferredMidpoint = (minAge + maxAge) / 2;
      const ageDiff = Math.abs(age - preferredMidpoint);
      if (ageDiff <= 3) score += 5;

      const compatibilityScore = Math.min(Math.max(score, 60), 99);

      return {
        id: uid,
        userId: uid,
        firstName: c.first_name || 'Member',
        lastName: c.last_name || null,
        age: age,
        gender: c.gender || null,
        bio: c.bio || null,
        occupation: c.occupation || null,
        education: c.education || null,
        location: {
          city: Number(c.use_location_for_discovery) !== 0 ? (c.location_city || 'Nashik') : 'Hidden',
          state: Number(c.use_location_for_discovery) !== 0 ? (c.location_state || null) : null,
          country: Number(c.use_location_for_discovery) !== 0 ? (c.location_country || 'India') : 'India',
        },
        photos: candPhotos,
        interests: candInterests,
        sharedInterests,
        sharedInterestsCount,
        isVerified: Boolean(c.is_verified),
        isProfileComplete: Boolean(c.is_profile_complete),
        compatibilityScore,
        hasSuperLikedYou,
        isBoosted: Boolean(c.is_boosted),
      };
    });

    // Sort by explainable ranking: Super Likes first, then Active Boosts, then Compatibility Score
    profiles.sort((a, b) => {
      if (a.hasSuperLikedYou && !b.hasSuperLikedYou) return -1;
      if (!a.hasSuperLikedYou && b.hasSuperLikedYou) return 1;
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    const nextCursor = hasMore ? pagedCandidates[pagedCandidates.length - 1].user_id : null;

    return {
      profiles,
      nextCursor,
    };
  }
}

export default DiscoveryModel;
