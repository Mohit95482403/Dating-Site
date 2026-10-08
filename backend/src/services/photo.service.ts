import path from 'path';
import fs from 'fs';
import { pool } from '../config/database';
import { PhotoModel } from '../models/photo.model';
import { ProfileService } from './profile.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { FormattedPhoto } from './profile.service';
import { UPLOADS_DIR } from '../config/storage';

export const MAX_PHOTOS_PER_USER = 6;

// Helper to remove files from filesystem safely
const unlinkSafe = async (filePath: string): Promise<void> => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`[PhotoService] Deleted file from disk: ${filePath}`);
    }
  } catch (err) {
    logger.warn(`[PhotoService] Failed to unlink file ${filePath}:`, err);
  }
};

// Helper to convert DB rows to clean client response
export const formatPhotoList = (
  photos: Array<{
    id: number;
    file_url: string;
    file_name: string;
    is_primary: boolean | number;
    display_order: number;
  }>
): FormattedPhoto[] => {
  return photos.map((p) => ({
    id: Number(p.id),
    url: p.file_url,
    fileName: p.file_name,
    isPrimary: Boolean(p.is_primary),
    displayOrder: Number(p.display_order),
  }));
};

export class PhotoService {
  /**
   * Get all photos for a user formatted for client
   */
  public static async getUserPhotos(userId: number): Promise<FormattedPhoto[]> {
    const photos = await PhotoModel.findByUserId(userId);
    return formatPhotoList(photos);
  }

  /**
   * Upload multiple profile photos with count limit, secure storage, and cleanup on failure
   */
  public static async uploadPhotos(
    userId: number,
    files: Express.Multer.File[]
  ): Promise<{
    photos: FormattedPhoto[];
    uploadedCount: number;
    completionPercentage: number;
    isComplete: boolean;
  }> {
    if (!files || files.length === 0) {
      throw AppError.badRequest('No photos provided for upload.');
    }

    const currentCount = await PhotoModel.countByUserId(userId);
    const newCount = files.length;

    // Strict maximum photo count verification (6 photos)
    if (currentCount + newCount > MAX_PHOTOS_PER_USER) {
      // Clean up newly written files immediately
      for (const file of files) {
        await unlinkSafe(file.path);
      }
      throw AppError.badRequest(
        `Maximum ${MAX_PHOTOS_PER_USER} photos allowed. You currently have ${currentCount} photo(s) and cannot upload ${newCount} more.`
      );
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Relative URL served by express.static('/uploads', ...)
        const relativeUrl = `/uploads/profiles/user-${userId}/${file.filename}`;
        const isPrimary = currentCount === 0 && i === 0;
        const displayOrder = currentCount + i;

        await PhotoModel.insert(
          {
            userId,
            fileUrl: relativeUrl,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            displayOrder,
            isPrimary,
          },
          conn
        );
      }

      await conn.commit();
      logger.info(
        `[PhotoService] Successfully uploaded ${newCount} photo(s) for userId=${userId}`
      );
    } catch (err) {
      await conn.rollback();
      logger.error(`[PhotoService] DB transaction failed during upload for userId=${userId}:`, err);

      // Clean up any files that were stored to avoid orphaned files
      for (const file of files) {
        await unlinkSafe(file.path);
      }

      throw err;
    } finally {
      conn.release();
    }

    // Recalculate profile completion
    const { percentage, isComplete } = await ProfileService.calculateProfileCompletion(
      userId
    );
    const photos = await this.getUserPhotos(userId);

    return {
      photos,
      uploadedCount: newCount,
      completionPercentage: percentage,
      isComplete,
    };
  }

  /**
   * Delete a photo with strict ownership validation and physical file cleanup
   */
  public static async deletePhoto(
    userId: number,
    photoId: number
  ): Promise<{
    photoId: number;
    photos: FormattedPhoto[];
    completionPercentage: number;
    isComplete: boolean;
  }> {
    const photo = await PhotoModel.findUserPhoto(userId, photoId);
    if (!photo) {
      throw AppError.notFound('Photo not found or you do not have permission to delete it.');
    }

    const currentCount = await PhotoModel.countByUserId(userId);
    if (currentCount <= 1) {
      throw AppError.badRequest('You need at least one profile photo.');
    }

    const wasPrimary = Boolean(photo.is_primary);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await PhotoModel.delete(userId, photoId, conn);

      // If deleted photo was primary, promote next available photo automatically
      if (wasPrimary) {
        const nextPrimaryId = await PhotoModel.promoteNextPrimary(userId, conn);
        if (nextPrimaryId) {
          logger.info(
            `[PhotoService] Promoted photo ${nextPrimaryId} to primary for userId=${userId}`
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error(`[PhotoService] Failed to delete photo ${photoId} from DB:`, err);
      throw err;
    } finally {
      conn.release();
    }

    // Delete physical file from filesystem
    if (photo.file_url) {
      const cleanRelative = photo.file_url.replace(/^\/uploads\//, '');
      const physicalPath = path.resolve(UPLOADS_DIR, cleanRelative);
      await unlinkSafe(physicalPath);
    }

    const { percentage, isComplete } = await ProfileService.calculateProfileCompletion(
      userId
    );
    const photos = await this.getUserPhotos(userId);

    return {
      photoId,
      photos,
      completionPercentage: percentage,
      isComplete,
    };
  }

  /**
   * Set a photo as primary in transaction
   */
  public static async setPrimaryPhoto(
    userId: number,
    photoId: number
  ): Promise<{
    primaryPhotoId: number;
    photos: FormattedPhoto[];
  }> {
    const photo = await PhotoModel.findUserPhoto(userId, photoId);
    if (!photo) {
      throw AppError.notFound('Photo not found or you do not have permission to modify it.');
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      await PhotoModel.setPrimary(userId, photoId, conn);
      await conn.commit();
      logger.info(`[PhotoService] Set primary photo ${photoId} for userId=${userId}`);
    } catch (err) {
      await conn.rollback();
      logger.error(`[PhotoService] Failed to set primary photo:`, err);
      throw err;
    } finally {
      conn.release();
    }

    const photos = await this.getUserPhotos(userId);

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
  ): Promise<{ photos: FormattedPhoto[] }> {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw AppError.badRequest('photoIds must be a non-empty array of photo IDs.');
    }

    // Check for duplicate IDs
    const uniqueIds = Array.from(new Set(photoIds));
    if (uniqueIds.length !== photoIds.length) {
      throw AppError.badRequest('photoIds array must not contain duplicate IDs.');
    }

    // Fetch user's existing photos
    const existingPhotos = await PhotoModel.findByUserId(userId);
    const existingIdSet = new Set(existingPhotos.map((p) => Number(p.id)));

    // Verify all submitted IDs belong to the user
    for (const id of photoIds) {
      if (!existingIdSet.has(Number(id))) {
        throw AppError.badRequest(
          `Photo ID ${id} does not exist or does not belong to your account.`
        );
      }
    }

    // Verify the set of IDs completely matches user's photos
    if (photoIds.length !== existingPhotos.length) {
      throw AppError.badRequest(
        `Reorder list count (${photoIds.length}) does not match your total photos count (${existingPhotos.length}).`
      );
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      await PhotoModel.reorder(userId, photoIds, conn);
      await conn.commit();
      logger.info(`[PhotoService] Reordered photos for userId=${userId}: [${photoIds.join(', ')}]`);
    } catch (err) {
      await conn.rollback();
      logger.error(`[PhotoService] Failed to reorder photos for userId=${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }

    const photos = await this.getUserPhotos(userId);
    return { photos };
  }
}

export default PhotoService;
