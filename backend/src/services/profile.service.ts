import { pool, query } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { ProfileModel } from '../models/profile.model';
import { PromptModel } from '../models/prompt.model';
import { VerificationModel } from '../models/verification.model';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import {
  ProfileRow,
  PreferenceRow,
  PhotoRow,
  UserProfilePrompt,
  ProfilePrompt,
  VerificationStatus,
  ProfileCompletionResult,
  PublicUserProfile,
  VerificationStatusResponse,
} from '../types/profile.types';

export interface FormattedLocation {
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface FormattedInterest {
  id: number;
  name: string;
  slug: string;
}

export interface FormattedPreferences {
  minAge: number;
  maxAge: number;
  preferredGender: string;
  maxDistanceKm: number;
  relationshipGoal: string;
}

export interface FormattedPhoto {
  id: number;
  url: string;
  fileName: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface FullProfileResponse {
  userId: number;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  location: FormattedLocation;
  interests: FormattedInterest[];
  preferences: FormattedPreferences;
  photos: FormattedPhoto[];
  prompts: UserProfilePrompt[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  completionPercentage: number;
  isComplete: boolean;
  completion: ProfileCompletionResult;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string | null;
  dateOfBirth?: string;
  gender?: string;
  bio?: string | null;
  occupation?: string | null;
  education?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  interests?: number[];
  preferences?: {
    minAge?: number;
    maxAge?: number;
    preferredGender?: string;
    maxDistanceKm?: number;
    relationshipGoal?: string;
  };
}

/**
 * Accurately calculate age from date of birth accounting for month & day in current year
 */
export const calculateAge = (dob: string | Date | null | undefined): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
};

/**
 * Format a Date or date string to YYYY-MM-DD
 */
export const formatDateOnly = (d: string | Date | null | undefined): string | null => {
  if (!d) return null;
  if (typeof d === 'string') {
    return d.split('T')[0];
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class ProfileService {
  /**
   * Calculate profile completion from actual database state
   * Sections:
   * 1. Basic Info (20%)
   * 2. Photos (20%)
   * 3. Bio (15%)
   * 4. Interests (15%)
   * 5. Preferences (15%)
   * 6. Profile Prompts (15%)
   */
  public static async calculateProfileCompletion(
    userId: number
  ): Promise<ProfileCompletionResult> {
    const profile = await ProfileModel.findByUserId(userId);
    const pref = await ProfileModel.getPreferences(userId);
    const interests = await ProfileModel.getUserInterests(userId);
    const photos = await ProfileModel.getPhotos(userId);
    const prompts = await PromptModel.getUserPrompts(userId);
    const verification = await VerificationModel.getVerificationStatus(userId);

    const completed: string[] = [];
    const missing: string[] = [];
    let percentage = 0;

    // 1. Basic Info (20%)
    const hasBasic = Boolean(
      profile?.first_name &&
      profile.first_name.trim().length >= 2 &&
      profile?.date_of_birth &&
      profile?.gender
    );
    if (hasBasic) {
      percentage += 20;
      completed.push('Add basic information');
    } else {
      missing.push('Add basic information');
    }

    // 2. Photos (20%) - At least 1 photo
    const hasPhotos = photos.length >= 1;
    if (hasPhotos) {
      percentage += 20;
      completed.push('Add profile photo');
    } else {
      missing.push('Add profile photo');
    }

    // 3. Bio (15%) - Bio >= 10 characters
    const hasBio = Boolean(profile?.bio && profile.bio.trim().length >= 10);
    if (hasBio) {
      percentage += 15;
      completed.push('Add bio');
    } else {
      missing.push('Add bio');
    }

    // 4. Interests (15%) - At least 3 interests
    const hasInterests = interests.length >= 3;
    if (hasInterests) {
      percentage += 15;
      completed.push('Add interests');
    } else {
      missing.push('Add interests');
    }

    // 5. Preferences (15%)
    const hasPreferences = Boolean(
      pref &&
      pref.min_age !== undefined &&
      pref.max_age !== undefined &&
      pref.preferred_gender &&
      pref.max_distance_km &&
      pref.relationship_goal
    );
    if (hasPreferences) {
      percentage += 15;
      completed.push('Set match preferences');
    } else {
      missing.push('Set match preferences');
    }

    // 6. Prompts (15%) - At least 1 answered prompt
    const hasPrompts = prompts.length >= 1;
    if (hasPrompts) {
      percentage += 15;
      completed.push('Add a profile prompt');
    } else {
      missing.push('Add a profile prompt');
    }

    // Verification check as a suggestion/badge
    if (verification.isVerified) {
      completed.push('Verify your profile');
    } else {
      missing.push('Verify your profile');
    }

    if (percentage > 100) percentage = 100;
    const isComplete = percentage === 100;

    // Sync database completion status
    await ProfileModel.updateCompletionStatus(userId, isComplete);

    return {
      percentage,
      isComplete,
      completed,
      missing,
    };
  }

  /**
   * GET /api/profile
   * Assembles full profile with age calculation, location, detailed interests, preferences, photos, prompts, verification, and completion
   */
  public static async getProfile(userId: number): Promise<FullProfileResponse> {
    let profile = await ProfileModel.findByUserId(userId);

    // If profile does not exist yet (e.g. edge case), create basic shell
    if (!profile) {
      await ProfileModel.create(userId, 'Connectly User');
      profile = await ProfileModel.findByUserId(userId);
      if (!profile) {
        throw AppError.notFound('Profile record not found for authenticated user.');
      }
    }

    const pref = await ProfileModel.getPreferences(userId);
    const interests = await ProfileModel.getUserInterests(userId);
    const photos = await ProfileModel.getPhotos(userId);
    const prompts = await PromptModel.getUserPrompts(userId);
    const verification = await VerificationModel.getVerificationStatus(userId);
    const completion = await this.calculateProfileCompletion(userId);

    const formattedPhotos: FormattedPhoto[] = photos.map((p) => ({
      id: Number(p.id),
      url: p.file_url,
      fileName: p.file_name,
      isPrimary: Boolean(p.is_primary),
      displayOrder: Number(p.display_order),
    }));

    return {
      userId,
      firstName: profile.first_name,
      lastName: profile.last_name || null,
      dateOfBirth: formatDateOnly(profile.date_of_birth),
      age: calculateAge(profile.date_of_birth),
      gender: profile.gender || null,
      bio: profile.bio || null,
      occupation: profile.occupation || null,
      education: profile.education || null,
      location: {
        city: profile.location_city || null,
        state: profile.location_state || null,
        country: profile.location_country || null,
      },
      interests,
      preferences: {
        minAge: pref?.min_age !== undefined ? Number(pref.min_age) : 18,
        maxAge: pref?.max_age !== undefined ? Number(pref.max_age) : 100,
        preferredGender: pref?.preferred_gender || 'all',
        maxDistanceKm: pref?.max_distance_km !== undefined ? Number(pref.max_distance_km) : 50,
        relationshipGoal: pref?.relationship_goal || 'not_sure',
      },
      photos: formattedPhotos,
      prompts,
      isVerified: Boolean(profile.is_verified) || verification.isVerified,
      verificationStatus: verification.status,
      completionPercentage: completion.percentage,
      isComplete: completion.isComplete,
      completion,
    };
  }

  /**
   * PUT /api/profile
   * Safe partial multi-table update inside a single MySQL transaction
   */
  public static async updateProfile(
    userId: number,
    data: UpdateProfileInput
  ): Promise<FullProfileResponse> {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Partial update for profiles table
      const profileUpdates: Partial<ProfileRow> = {};
      if (data.firstName !== undefined) profileUpdates.first_name = data.firstName.trim();
      if (data.lastName !== undefined)
        profileUpdates.last_name = data.lastName ? data.lastName.trim() : null;
      if (data.dateOfBirth !== undefined)
        profileUpdates.date_of_birth = data.dateOfBirth ? data.dateOfBirth : null;
      if (data.gender !== undefined)
        profileUpdates.gender = data.gender ? (data.gender.toLowerCase() as any) : null;
      if (data.bio !== undefined) profileUpdates.bio = data.bio ? data.bio.trim() : null;
      if (data.occupation !== undefined)
        profileUpdates.occupation = data.occupation ? data.occupation.trim() : null;
      if (data.education !== undefined)
        profileUpdates.education = data.education ? data.education.trim() : null;
      if (data.city !== undefined)
        profileUpdates.location_city = data.city ? data.city.trim() : null;
      if (data.state !== undefined)
        profileUpdates.location_state = data.state ? data.state.trim() : null;
      if (data.country !== undefined)
        profileUpdates.location_country = data.country ? data.country.trim() : null;

      if (Object.keys(profileUpdates).length > 0) {
        await ProfileModel.update(userId, profileUpdates, conn);
      }

      // 2. Partial update for preferences table
      if (data.preferences) {
        const prefUpdates: Partial<PreferenceRow> = {};
        if (data.preferences.minAge !== undefined) prefUpdates.min_age = data.preferences.minAge;
        if (data.preferences.maxAge !== undefined) prefUpdates.max_age = data.preferences.maxAge;
        if (data.preferences.preferredGender !== undefined)
          prefUpdates.preferred_gender = data.preferences.preferredGender.toLowerCase() as any;
        if (data.preferences.maxDistanceKm !== undefined)
          prefUpdates.max_distance_km = data.preferences.maxDistanceKm;
        if (data.preferences.relationshipGoal !== undefined)
          prefUpdates.relationship_goal = data.preferences.relationshipGoal.toLowerCase() as any;

        await ProfileModel.upsertPreferences(userId, prefUpdates, conn);
      }

      // 3. Update interests if provided
      if (data.interests !== undefined) {
        const uniqueIds = Array.from(new Set(data.interests));

        if (uniqueIds.length > 0) {
          const placeholders = uniqueIds.map(() => '?').join(', ');
          const [verifiedRows] = await conn.query<RowDataPacket[]>(
            `SELECT id FROM interests WHERE id IN (${placeholders})`,
            uniqueIds
          );

          if (verifiedRows.length !== uniqueIds.length) {
            throw AppError.badRequest('One or more selected interest IDs do not exist.');
          }
        }

        await ProfileModel.replaceUserInterests(userId, uniqueIds, conn);
      }

      await conn.commit();
      logger.info(`[ProfileService] Profile updated successfully for userId=${userId}`);
    } catch (error) {
      await conn.rollback();
      logger.error(`[ProfileService] Profile update transaction failed for userId=${userId}:`, error);
      throw error;
    } finally {
      conn.release();
    }

    // Recalculate completion and return complete updated profile
    return this.getProfile(userId);
  }

  /**
   * Fetch public profile for another user
   */
  public static async getPublicProfile(
    targetUserId: number,
    viewerUserId: number
  ): Promise<PublicUserProfile | null> {
    return ProfileModel.getPublicProfile(targetUserId, viewerUserId);
  }

  /**
   * Fetch interests for profile
   */
  public static async getProfileInterests(userId: number): Promise<FormattedInterest[]> {
    return ProfileModel.getUserInterests(userId);
  }

  /**
   * Update profile interests in a transaction
   */
  public static async updateProfileInterests(
    userId: number,
    interestIds: number[]
  ): Promise<FormattedInterest[]> {
    const uniqueIds = Array.from(new Set(interestIds));

    if (uniqueIds.length > 0) {
      const placeholders = uniqueIds.map(() => '?').join(', ');
      const rows = await query<RowDataPacket[]>(
        `SELECT id FROM interests WHERE id IN (${placeholders})`,
        uniqueIds
      );
      if (rows.length !== uniqueIds.length) {
        throw AppError.badRequest('One or more selected interest IDs do not exist.');
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await ProfileModel.replaceUserInterests(userId, uniqueIds, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await this.calculateProfileCompletion(userId);
    return ProfileModel.getUserInterests(userId);
  }

  /**
   * Fetch preferences for profile
   */
  public static async getProfilePreferences(userId: number): Promise<FormattedPreferences> {
    const pref = await ProfileModel.getPreferences(userId);
    return {
      minAge: pref?.min_age !== undefined ? Number(pref.min_age) : 18,
      maxAge: pref?.max_age !== undefined ? Number(pref.max_age) : 100,
      preferredGender: pref?.preferred_gender || 'all',
      maxDistanceKm: pref?.max_distance_km !== undefined ? Number(pref.max_distance_km) : 50,
      relationshipGoal: pref?.relationship_goal || 'not_sure',
    };
  }

  /**
   * Update preferences for profile
   */
  public static async updateProfilePreferences(
    userId: number,
    prefData: Partial<PreferenceRow>
  ): Promise<FormattedPreferences> {
    await ProfileModel.upsertPreferences(userId, prefData);
    await this.calculateProfileCompletion(userId);
    return this.getProfilePreferences(userId);
  }

  /**
   * Fetch photos for profile
   */
  public static async getProfilePhotos(userId: number): Promise<FormattedPhoto[]> {
    const photos = await ProfileModel.getPhotos(userId);
    return photos.map((p) => ({
      id: Number(p.id),
      url: p.file_url,
      fileName: p.file_name,
      isPrimary: Boolean(p.is_primary),
      displayOrder: Number(p.display_order),
    }));
  }

  /**
   * Add a profile photo with 6 photo maximum limit
   */
  public static async addProfilePhoto(
    userId: number,
    photoData: {
      fileUrl: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      isPrimary?: boolean;
    }
  ): Promise<{
    photo: FormattedPhoto;
    photos: FormattedPhoto[];
    completionPercentage: number;
    isComplete: boolean;
  }> {
    const existing = await ProfileModel.getPhotos(userId);

    // Enforce 6 photos max limit
    if (existing.length >= 6) {
      throw AppError.badRequest('You can upload a maximum of 6 profile photos.');
    }

    const isFirstPhoto = existing.length === 0;
    const shouldBePrimary = isFirstPhoto ? true : Boolean(photoData.isPrimary);

    const conn = await pool.getConnection();
    let newPhotoId: number;

    try {
      await conn.beginTransaction();

      if (shouldBePrimary && existing.length > 0) {
        await conn.execute('UPDATE photos SET is_primary = FALSE WHERE user_id = ?', [userId]);
      }

      newPhotoId = await ProfileModel.addPhoto(
        userId,
        {
          fileUrl: photoData.fileUrl,
          fileName: photoData.fileName || 'photo.jpg',
          mimeType: photoData.mimeType || 'image/jpeg',
          fileSize: photoData.fileSize || 1024,
          displayOrder: existing.length,
          isPrimary: shouldBePrimary,
        },
        conn
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error(`[ProfileService] Failed to add photo for userId=${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }

    const completion = await this.calculateProfileCompletion(userId);
    const photos = await this.getProfilePhotos(userId);
    const createdPhoto = photos.find((p) => p.id === newPhotoId) || {
      id: newPhotoId,
      url: photoData.fileUrl,
      fileName: photoData.fileName || 'photo.jpg',
      isPrimary: shouldBePrimary,
      displayOrder: existing.length,
    };

    return {
      photo: createdPhoto,
      photos,
      completionPercentage: completion.percentage,
      isComplete: completion.isComplete,
    };
  }

  /**
   * Delete a profile photo with strict user ownership validation and minimum 1 photo protection
   */
  public static async deleteProfilePhoto(
    userId: number,
    photoId: number
  ): Promise<{
    photoId: number;
    photos: FormattedPhoto[];
    completionPercentage: number;
    isComplete: boolean;
  }> {
    // 1. Strict ownership validation
    const photo = await ProfileModel.findPhotoById(photoId);
    if (!photo || Number(photo.user_id) !== userId) {
      throw AppError.notFound('Photo not found or you do not have permission to delete it.');
    }

    // 2. Minimum photo check
    const existing = await ProfileModel.getPhotos(userId);
    if (existing.length <= 1) {
      throw AppError.badRequest('You need at least one profile photo.');
    }

    const wasPrimary = Boolean(photo.is_primary);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await ProfileModel.deletePhoto(userId, photoId, conn);

      // If deleted photo was primary, promote the next available photo
      if (wasPrimary) {
        const [remaining] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM photos WHERE user_id = ? ORDER BY display_order ASC, created_at ASC LIMIT 1',
          [userId]
        );
        if (remaining.length > 0) {
          await conn.execute('UPDATE photos SET is_primary = TRUE WHERE id = ?', [remaining[0].id]);
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error(`[ProfileService] Failed to delete photo ${photoId} for userId=${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }

    const completion = await this.calculateProfileCompletion(userId);
    const photos = await this.getProfilePhotos(userId);

    return {
      photoId,
      photos,
      completionPercentage: completion.percentage,
      isComplete: completion.isComplete,
    };
  }

  /**
   * Set primary photo with strict user ownership validation
   */
  public static async setPrimaryPhoto(
    userId: number,
    photoId: number
  ): Promise<{
    primaryPhotoId: number;
    photos: FormattedPhoto[];
  }> {
    // 1. Strict ownership validation
    const photo = await ProfileModel.findPhotoById(photoId);
    if (!photo || Number(photo.user_id) !== userId) {
      throw AppError.notFound('Photo not found or you do not have permission to modify it.');
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      await ProfileModel.setPrimaryPhoto(userId, photoId, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error(`[ProfileService] Failed to set primary photo ${photoId} for userId=${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }

    const photos = await this.getProfilePhotos(userId);

    return {
      primaryPhotoId: photoId,
      photos,
    };
  }

  /**
   * Reorder photos atomically in a transaction
   */
  public static async reorderPhotos(
    userId: number,
    photoIds: number[]
  ): Promise<FormattedPhoto[]> {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw AppError.badRequest('photoIds array is required.');
    }

    const existingPhotos = await ProfileModel.getPhotos(userId);
    const existingIds = new Set(existingPhotos.map((p) => Number(p.id)));

    // Verify all IDs belong to this user
    for (const id of photoIds) {
      if (!existingIds.has(Number(id))) {
        throw AppError.forbidden('One or more photos do not belong to your profile.');
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await ProfileModel.reorderPhotos(userId, photoIds.map(Number), conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error(`[ProfileService] Failed to reorder photos for userId=${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }

    return this.getProfilePhotos(userId);
  }

  /**
   * Prompts: Get all predefined profile prompts
   */
  public static async getAllPrompts(): Promise<ProfilePrompt[]> {
    return PromptModel.getAllPrompts();
  }

  /**
   * Prompts: Get user's answered prompts
   */
  public static async getUserPrompts(userId: number): Promise<UserProfilePrompt[]> {
    return PromptModel.getUserPrompts(userId);
  }

  /**
   * Prompts: Save (add or update) an answered prompt
   */
  public static async saveUserPrompt(
    userId: number,
    promptId: number,
    answer: string
  ): Promise<UserProfilePrompt[]> {
    const trimmed = (answer || '').trim();
    if (!trimmed) {
      throw AppError.badRequest('Answer cannot be empty.');
    }
    if (trimmed.length > 300) {
      throw AppError.badRequest('Answer cannot exceed 300 characters.');
    }

    const promptExists = await PromptModel.findPromptById(promptId);
    if (!promptExists) {
      throw AppError.notFound('Profile prompt not found.');
    }

    await PromptModel.saveUserPrompt(userId, promptId, trimmed);
    await this.calculateProfileCompletion(userId);

    return PromptModel.getUserPrompts(userId);
  }

  /**
   * Prompts: Delete an answered prompt
   */
  public static async deleteUserPrompt(
    userId: number,
    promptId: number
  ): Promise<UserProfilePrompt[]> {
    await PromptModel.deleteUserPrompt(userId, promptId);
    await this.calculateProfileCompletion(userId);

    return PromptModel.getUserPrompts(userId);
  }

  /**
   * Verification: Get verification status
   */
  public static async getVerificationStatus(
    userId: number
  ): Promise<VerificationStatusResponse> {
    return VerificationModel.getVerificationStatus(userId);
  }

  /**
   * Verification: Submit verification document
   */
  public static async submitVerification(
    userId: number,
    fileUrl: string
  ): Promise<VerificationStatusResponse> {
    if (!fileUrl) {
      throw AppError.badRequest('Verification file is required.');
    }

    await VerificationModel.submitVerificationRequest(userId, fileUrl);

    try {
      const { emitToAdmins } = await import('../sockets/socket');
      emitToAdmins('verification:new', {
        userId,
        fileUrl,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // non-fatal
    }

    return VerificationModel.getVerificationStatus(userId);
  }
}

export default ProfileService;
