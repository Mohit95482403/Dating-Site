import { Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { ProfileService } from '../services/profile.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class ProfileController {
  /**
   * GET /api/profile
   * Retrieve full assembled profile for the currently authenticated user
   */
  public static getProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const profile = await ProfileService.getProfile(userId);

    ApiResponse.success(res, 'Profile retrieved successfully', { profile }, HttpStatus.OK);
  };

  /**
   * PUT /api/profile
   * Partially update profile, preferences, and interests for authenticated user
   */
  public static updateProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const profile = await ProfileService.updateProfile(userId, req.body);

    ApiResponse.success(res, 'Profile updated successfully', { profile }, HttpStatus.OK);
  };

  /**
   * POST /api/profile/photos
   * Add a profile photo (supports both JSON fileUrl and multipart file uploads)
   */
  public static addPhoto = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;
    let isPrimary: boolean | undefined;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
      fileSize = req.file.size;
      isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;
    } else if (req.body && req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
      fileName = req.body.fileName;
      mimeType = req.body.mimeType;
      fileSize = req.body.fileSize;
      isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;
    }

    if (!fileUrl) {
      throw AppError.badRequest('Photo file or valid file URL is required.');
    }

    const result = await ProfileService.addProfilePhoto(userId, {
      fileUrl,
      fileName,
      mimeType,
      fileSize,
      isPrimary,
    });

    ApiResponse.success(res, 'Photo added successfully', result, HttpStatus.CREATED);
  };

  /**
   * DELETE /api/profile/photos/:id
   * Delete a photo with ownership check
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

    const result = await ProfileService.deleteProfilePhoto(userId, photoId);

    ApiResponse.success(res, 'Photo deleted successfully', result, HttpStatus.OK);
  };

  /**
   * PUT /api/profile/photos/:id/primary
   * Set a photo as primary with ownership check
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

    const result = await ProfileService.setPrimaryPhoto(userId, photoId);

    ApiResponse.success(res, 'Primary photo updated successfully', result, HttpStatus.OK);
  };

  /**
   * GET /api/profile/photos
   * Retrieve all photos for authenticated user
   */
  public static getPhotos = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const photos = await ProfileService.getProfilePhotos(userId);

    ApiResponse.success(res, 'Photos retrieved successfully', { photos }, HttpStatus.OK);
  };

  /**
   * PUT /api/profile/photos/reorder
   * Reorder photos display_order
   */
  public static reorderPhotos = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw AppError.badRequest('photoIds array is required.');
    }

    const photos = await ProfileService.reorderPhotos(userId, photoIds);

    ApiResponse.success(res, 'Photos reordered successfully', { photos }, HttpStatus.OK);
  };

  /**
   * GET /api/profile/completion
   * Retrieve completion breakdown and suggestions
   */
  public static getCompletion = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const completion = await ProfileService.calculateProfileCompletion(userId);

    ApiResponse.success(res, 'Profile completion retrieved successfully', completion, HttpStatus.OK);
  };

  /**
   * GET /api/profile/:userId
   * Public profile viewing with privacy and block enforcement
   */
  public static getPublicProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const viewerId = req.user!.id;
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId) || targetUserId <= 0) {
      throw AppError.badRequest('Invalid user ID parameter.');
    }

    // If viewing self, return standard profile
    if (viewerId === targetUserId) {
      const ownProfile = await ProfileService.getProfile(viewerId);
      ApiResponse.success(res, 'Profile retrieved successfully', { profile: ownProfile }, HttpStatus.OK);
      return;
    }

    const publicProfile = await ProfileService.getPublicProfile(targetUserId, viewerId);
    if (!publicProfile) {
      throw AppError.notFound('Profile not found, is private, or is unavailable.');
    }

    ApiResponse.success(res, 'Profile retrieved successfully', { profile: publicProfile }, HttpStatus.OK);
  };

  /**
   * GET /api/profile/prompts
   * List all predefined prompts available to pick
   */
  public static getPrompts = async (
    _req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const prompts = await ProfileService.getAllPrompts();
    ApiResponse.success(res, 'Prompts retrieved successfully', { prompts }, HttpStatus.OK);
  };

  /**
   * GET /api/profile/user-prompts
   * List answered prompts for authenticated user
   */
  public static getUserPrompts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const prompts = await ProfileService.getUserPrompts(userId);
    ApiResponse.success(res, 'User prompts retrieved successfully', { prompts }, HttpStatus.OK);
  };

  /**
   * POST /api/profile/user-prompts
   * Save (add/update) a prompt answer
   */
  public static saveUserPrompt = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const promptId = parseInt(req.body.promptId || req.params.promptId, 10);
    const { answer } = req.body;

    if (isNaN(promptId) || promptId <= 0) {
      throw AppError.badRequest('Valid promptId is required.');
    }
    if (!answer || typeof answer !== 'string') {
      throw AppError.badRequest('Prompt answer is required.');
    }

    const prompts = await ProfileService.saveUserPrompt(userId, promptId, answer);
    ApiResponse.success(res, 'Profile prompt saved successfully', { prompts }, HttpStatus.OK);
  };

  /**
   * DELETE /api/profile/user-prompts/:promptId
   * Delete an answered prompt
   */
  public static deleteUserPrompt = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const promptId = parseInt(req.params.promptId, 10);

    if (isNaN(promptId) || promptId <= 0) {
      throw AppError.badRequest('Valid promptId parameter is required.');
    }

    const prompts = await ProfileService.deleteUserPrompt(userId, promptId);
    ApiResponse.success(res, 'Profile prompt removed successfully', { prompts }, HttpStatus.OK);
  };

  /**
   * GET /api/profile/verification
   * Get current verification status
   */
  public static getVerification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const verification = await ProfileService.getVerificationStatus(userId);
    ApiResponse.success(res, 'Verification status retrieved', verification, HttpStatus.OK);
  };

  /**
   * POST /api/profile/verification
   * Submit document for profile verification
   */
  public static submitVerification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    let fileUrl = req.body.fileUrl;

    if (req.file) {
      // Uploaded securely via multer uploadVerificationDoc
      fileUrl = `/uploads/verifications/user-${userId}/${req.file.filename}`;
    }

    if (!fileUrl) {
      throw AppError.badRequest('Verification document is required.');
    }

    const verification = await ProfileService.submitVerification(userId, fileUrl);
    ApiResponse.success(
      res,
      'Verification request submitted successfully',
      verification,
      HttpStatus.CREATED
    );
  };
}

export default ProfileController;
