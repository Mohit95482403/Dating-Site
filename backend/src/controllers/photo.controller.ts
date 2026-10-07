import { Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { PhotoService } from '../services/photo.service';
import { ProfileService } from '../services/profile.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class PhotoController {
  /**
   * POST /api/profile/photos
   * Upload multiple profile photos or single photo
   */
  public static uploadPhotos = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    // 1. Check for files uploaded via Multer
    let files: Express.Multer.File[] = [];

    if (req.files && Array.isArray(req.files)) {
      files = req.files as Express.Multer.File[];
    } else if (req.file) {
      files = [req.file as Express.Multer.File];
    }

    // If files are provided via Multer
    if (files.length > 0) {
      const result = await PhotoService.uploadPhotos(userId, files);
      ApiResponse.success(res, 'Photos uploaded successfully', result, HttpStatus.CREATED);
      return;
    }

    // 2. Fallback for JSON body (backwards compatibility with Day 6/7 tests)
    if (req.body && req.body.fileUrl) {
      const result = await ProfileService.addProfilePhoto(userId, {
        fileUrl: req.body.fileUrl,
        fileName: req.body.fileName,
        mimeType: req.body.mimeType,
        fileSize: req.body.fileSize,
        isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true,
      });
      ApiResponse.success(res, 'Photo added successfully', result, HttpStatus.CREATED);
      return;
    }

    throw AppError.badRequest('No image files or valid photo payload provided.');
  };

  /**
   * DELETE /api/profile/photos/:id
   * Delete a photo with ownership check and automatic primary promotion
   */
  public static deletePhoto = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const photoId = parseInt(req.params.id, 10);

    if (isNaN(photoId) || photoId <= 0) {
      throw AppError.badRequest('Invalid photo ID parameter.');
    }

    const result = await PhotoService.deletePhoto(userId, photoId);
    ApiResponse.success(res, 'Photo deleted successfully', result, HttpStatus.OK);
  };

  /**
   * PUT /api/profile/photos/:id/primary
   * Set photo as primary in transaction
   */
  public static setPrimaryPhoto = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const photoId = parseInt(req.params.id, 10);

    if (isNaN(photoId) || photoId <= 0) {
      throw AppError.badRequest('Invalid photo ID parameter.');
    }

    const result = await PhotoService.setPrimaryPhoto(userId, photoId);
    ApiResponse.success(res, 'Primary photo updated successfully', result, HttpStatus.OK);
  };

  /**
   * PUT /api/profile/photos/reorder
   * Reorder photos display order
   */
  public static reorderPhotos = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw AppError.badRequest('photoIds array is required for reordering.');
    }

    const result = await PhotoService.reorderPhotos(userId, photoIds);
    ApiResponse.success(res, 'Photos reordered successfully', result, HttpStatus.OK);
  };
}

export default PhotoController;
