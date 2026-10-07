import { pool, query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface OnboardingStatus {
  currentStep: number;
  completedSteps: string[];
  completionPercentage: number;
  isComplete: boolean;
  profile: {
    firstName: string;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bio: string | null;
    occupation: string | null;
    education: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  preferences: {
    minAge: number;
    maxAge: number;
    preferredGender: string;
    maxDistanceKm: number;
    relationshipGoal: string;
  };
  interests: number[];
  photos: Array<{
    id: number;
    fileUrl: string;
    fileName: string;
    isPrimary: boolean;
    displayOrder: number;
  }>;
}

export class OnboardingService {
  /**
   * Calculate real onboarding status and profile completion
   */
  public static async getStatus(userId: number): Promise<OnboardingStatus> {
    // 1. Fetch Profile
    const profileRows = await query<RowDataPacket[]>(
      `SELECT first_name, last_name, date_of_birth, gender, bio, occupation, education,
              location_city, location_state, location_country, is_profile_complete
       FROM profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    const profile = profileRows[0] || null;

    // 2. Fetch Preferences
    const prefRows = await query<RowDataPacket[]>(
      `SELECT min_age, max_age, preferred_gender, max_distance_km, relationship_goal
       FROM preferences WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    const pref = prefRows[0] || null;

    // 3. Fetch User Interests
    const interestRows = await query<RowDataPacket[]>(
      `SELECT interest_id FROM user_interests WHERE user_id = ?`,
      [userId]
    );
    const selectedInterests = interestRows.map((r) => Number(r.interest_id));

    // 4. Fetch User Photos
    const photoRows = await query<RowDataPacket[]>(
      `SELECT id, file_url, file_name, is_primary, display_order
       FROM photos WHERE user_id = ? ORDER BY is_primary DESC, display_order ASC, id ASC`,
      [userId]
    );
    const photos = photoRows.map((r) => ({
      id: Number(r.id),
      fileUrl: r.file_url,
      fileName: r.file_name,
      isPrimary: Boolean(r.is_primary),
      displayOrder: Number(r.display_order),
    }));

    // Evaluate step completions (20% each)
    const completedSteps: string[] = [];

    // Step 1: Basic Info
    const hasBasic = Boolean(
      profile?.first_name &&
      profile.first_name.trim().length >= 2 &&
      profile?.date_of_birth &&
      profile?.gender
    );
    if (hasBasic) completedSteps.push('basic');

    // Step 2: About You
    const hasAbout = Boolean(
      profile?.bio &&
      profile.bio.trim().length >= 10 &&
      profile?.location_city &&
      profile?.location_country
    );
    if (hasAbout) completedSteps.push('about');

    // Step 3: Interests
    const hasInterests = selectedInterests.length >= 3;
    if (hasInterests) completedSteps.push('interests');

    // Step 4: Preferences
    const hasPreferences = Boolean(
      pref &&
      pref.min_age !== undefined &&
      pref.max_age !== undefined &&
      pref.preferred_gender &&
      pref.max_distance_km &&
      pref.relationship_goal
    );
    if (hasPreferences) completedSteps.push('preferences');

    // Step 5: Photos
    const hasPhotos = photos.length >= 1;
    if (hasPhotos) completedSteps.push('photos');

    // Calculate percentage (20% per completed section)
    const completionPercentage = completedSteps.length * 20;

    // Determine current recommended step
    let currentStep = 1;
    if (!hasBasic) {
      currentStep = 1;
    } else if (!hasAbout) {
      currentStep = 2;
    } else if (!hasInterests) {
      currentStep = 3;
    } else if (!hasPreferences) {
      currentStep = 4;
    } else if (!hasPhotos) {
      currentStep = 5;
    } else {
      currentStep = 5;
    }

    const isComplete = Boolean(profile?.is_profile_complete);

    return {
      currentStep,
      completedSteps,
      completionPercentage,
      isComplete,
      profile: {
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || null,
        dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : null,
        gender: profile?.gender || null,
        bio: profile?.bio || null,
        occupation: profile?.occupation || null,
        education: profile?.education || null,
        city: profile?.location_city || null,
        state: profile?.location_state || null,
        country: profile?.location_country || null,
      },
      preferences: {
        minAge: pref?.min_age !== undefined ? Number(pref.min_age) : 18,
        maxAge: pref?.max_age !== undefined ? Number(pref.max_age) : 100,
        preferredGender: pref?.preferred_gender || 'all',
        maxDistanceKm: pref?.max_distance_km !== undefined ? Number(pref.max_distance_km) : 50,
        relationshipGoal: pref?.relationship_goal || 'not_sure',
      },
      interests: selectedInterests,
      photos,
    };
  }

  /**
   * Save Step 1: Basic Information
   */
  public static async saveBasicInfo(
    userId: number,
    data: { firstName: string; lastName?: string; dateOfBirth: string; gender: string }
  ): Promise<OnboardingStatus> {
    const existing = await query<RowDataPacket[]>(
      'SELECT id FROM profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      await execute(
        `UPDATE profiles SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ? WHERE user_id = ?`,
        [
          data.firstName.trim(),
          data.lastName ? data.lastName.trim() : null,
          data.dateOfBirth,
          data.gender.toLowerCase(),
          userId,
        ]
      );
    } else {
      await execute(
        `INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender) VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          data.firstName.trim(),
          data.lastName ? data.lastName.trim() : null,
          data.dateOfBirth,
          data.gender.toLowerCase(),
        ]
      );
    }

    return this.getStatus(userId);
  }

  /**
   * Save Step 2: About You
   */
  public static async saveAbout(
    userId: number,
    data: {
      bio: string;
      occupation?: string;
      education?: string;
      city: string;
      state?: string;
      country: string;
    }
  ): Promise<OnboardingStatus> {
    await execute(
      `UPDATE profiles
       SET bio = ?, occupation = ?, education = ?, location_city = ?, location_state = ?, location_country = ?
       WHERE user_id = ?`,
      [
        data.bio.trim(),
        data.occupation ? data.occupation.trim() : null,
        data.education ? data.education.trim() : null,
        data.city.trim(),
        data.state ? data.state.trim() : null,
        data.country.trim(),
        userId,
      ]
    );

    return this.getStatus(userId);
  }

  /**
   * Save Step 3: Interests (Verified against database interests table inside transaction)
   */
  public static async saveInterests(
    userId: number,
    interestIds: number[]
  ): Promise<OnboardingStatus> {
    // 1. Deduplicate
    const uniqueIds = Array.from(new Set(interestIds));

    // 2. Verify all IDs exist in database
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const verifiedRows = await query<RowDataPacket[]>(
      `SELECT id FROM interests WHERE id IN (${placeholders})`,
      uniqueIds
    );

    if (verifiedRows.length !== uniqueIds.length) {
      throw AppError.badRequest('One or more selected interests are invalid.');
    }

    // 3. Replace interests atomically
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('DELETE FROM user_interests WHERE user_id = ?', [userId]);

      for (const id of uniqueIds) {
        await conn.execute(
          'INSERT INTO user_interests (user_id, interest_id) VALUES (?, ?)',
          [userId, id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error('[OnboardingService] Failed to save interests transaction:', err);
      throw err;
    } finally {
      conn.release();
    }

    return this.getStatus(userId);
  }

  /**
   * Save Step 4: Dating Preferences
   */
  public static async savePreferences(
    userId: number,
    data: {
      minAge: number;
      maxAge: number;
      preferredGender: string;
      maxDistanceKm: number;
      relationshipGoal: string;
    }
  ): Promise<OnboardingStatus> {
    await execute(
      `INSERT INTO preferences (user_id, min_age, max_age, preferred_gender, max_distance_km, relationship_goal)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         min_age = VALUES(min_age),
         max_age = VALUES(max_age),
         preferred_gender = VALUES(preferred_gender),
         max_distance_km = VALUES(max_distance_km),
         relationship_goal = VALUES(relationship_goal)`,
      [
        userId,
        data.minAge,
        data.maxAge,
        data.preferredGender.toLowerCase(),
        data.maxDistanceKm,
        data.relationshipGoal.toLowerCase(),
      ]
    );

    return this.getStatus(userId);
  }

  /**
   * Save Step 5: Save or Add Onboarding Photo
   */
  public static async addPhoto(
    userId: number,
    photoData: {
      fileUrl: string;
      fileName: string;
      mimeType?: string;
      fileSize?: number;
      isPrimary?: boolean;
    }
  ): Promise<OnboardingStatus> {
    // Check if user already has photos
    const existing = await query<RowDataPacket[]>(
      'SELECT id, is_primary FROM photos WHERE user_id = ?',
      [userId]
    );

    // If first photo, force is_primary = true
    const isPrimary = existing.length === 0 ? true : Boolean(photoData.isPrimary);

    if (isPrimary && existing.length > 0) {
      // Unset primary on others
      await execute('UPDATE photos SET is_primary = FALSE WHERE user_id = ?', [userId]);
    }

    await execute(
      `INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, is_primary, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        photoData.fileUrl,
        photoData.fileName || 'photo.jpg',
        photoData.mimeType || 'image/jpeg',
        photoData.fileSize || 1024,
        isPrimary,
        existing.length,
      ]
    );

    return this.getStatus(userId);
  }

  /**
   * Remove a photo
   */
  public static async removePhoto(userId: number, photoId: number): Promise<OnboardingStatus> {
    const existing = await query<RowDataPacket[]>(
      'SELECT id, is_primary FROM photos WHERE id = ? AND user_id = ?',
      [photoId, userId]
    );

    if (existing.length === 0) {
      throw AppError.notFound('Photo not found.');
    }

    const wasPrimary = Boolean(existing[0].is_primary);

    await execute('DELETE FROM photos WHERE id = ? AND user_id = ?', [photoId, userId]);

    // If was primary, promote next photo to primary
    if (wasPrimary) {
      const remaining = await query<RowDataPacket[]>(
        'SELECT id FROM photos WHERE user_id = ? ORDER BY id ASC LIMIT 1',
        [userId]
      );
      if (remaining.length > 0) {
        await execute('UPDATE photos SET is_primary = TRUE WHERE id = ?', [remaining[0].id]);
      }
    }

    return this.getStatus(userId);
  }

  /**
   * Finalize Onboarding & Complete Profile
   */
  public static async completeOnboarding(
    userId: number
  ): Promise<{ isComplete: boolean; completionPercentage: number }> {
    const status = await this.getStatus(userId);

    const missing: string[] = [];
    if (!status.completedSteps.includes('basic')) missing.push('Basic Information');
    if (!status.completedSteps.includes('about')) missing.push('About You');
    if (!status.completedSteps.includes('interests')) missing.push('Interests (select at least 3)');
    if (!status.completedSteps.includes('preferences')) missing.push('Dating Preferences');
    if (!status.completedSteps.includes('photos')) missing.push('Photos (at least 1 photo)');

    if (missing.length > 0) {
      throw AppError.badRequest(
        `Please complete the following required sections before finishing: ${missing.join(', ')}.`
      );
    }

    // Set is_profile_complete = true
    await execute('UPDATE profiles SET is_profile_complete = TRUE WHERE user_id = ?', [userId]);

    logger.info(`[OnboardingService] User profile completed: userId=${userId}`);

    return {
      isComplete: true,
      completionPercentage: 100,
    };
  }
}

export default OnboardingService;
