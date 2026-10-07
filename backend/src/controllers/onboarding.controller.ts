import { Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AuthenticatedRequest } from '../types/request.types';
import { AppError } from '../utils/AppError';

export class OnboardingController {
  /**
   * GET /api/onboarding/status
   * Retrieve current onboarding progress, step data, and completion percentage
   */
  public static getStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const status = await OnboardingService.getStatus(userId);

    ApiResponse.success(res, 'Onboarding status retrieved successfully', status, HttpStatus.OK);
  };

  /**
   * PUT /api/onboarding/basic-info
   * Save Step 1: Basic Information
   */
  public static saveBasicInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const updatedStatus = await OnboardingService.saveBasicInfo(userId, req.body);

    ApiResponse.success(res, 'Basic information saved successfully', updatedStatus, HttpStatus.OK);
  };

  /**
   * PUT /api/onboarding/about
   * Save Step 2: About You
   */
  public static saveAbout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const updatedStatus = await OnboardingService.saveAbout(userId, req.body);

    ApiResponse.success(res, 'About information saved successfully', updatedStatus, HttpStatus.OK);
  };

  /**
   * PUT /api/onboarding/interests
   * Save Step 3: Selected Interests
   */
  public static saveInterests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { interestIds } = req.body;
    const updatedStatus = await OnboardingService.saveInterests(userId, interestIds);

    ApiResponse.success(res, 'Interests saved successfully', updatedStatus, HttpStatus.OK);
  };

  /**
   * PUT /api/onboarding/preferences
   * Save Step 4: Dating Preferences
   */
  public static savePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const updatedStatus = await OnboardingService.savePreferences(userId, req.body);

    ApiResponse.success(res, 'Preferences saved successfully', updatedStatus, HttpStatus.OK);
  };

  /**
   * POST /api/onboarding/photos
   * Save Step 5: Add a photo
   */
  public static addPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fileUrl, fileName, mimeType, fileSize, isPrimary } = req.body;
    if (!fileUrl) {
      throw AppError.badRequest('Photo file URL is required.');
    }

    const updatedStatus = await OnboardingService.addPhoto(userId, {
      fileUrl,
      fileName,
      mimeType,
      fileSize,
      isPrimary,
    });

    ApiResponse.success(res, 'Photo added successfully', updatedStatus, HttpStatus.CREATED);
  };

  /**
   * DELETE /api/onboarding/photos/:photoId
   * Remove a photo
   */
  public static removePhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const photoId = parseInt(req.params.photoId, 10);
    if (isNaN(photoId)) {
      throw AppError.badRequest('Invalid photo ID.');
    }

    const updatedStatus = await OnboardingService.removePhoto(userId, photoId);

    ApiResponse.success(res, 'Photo removed successfully', updatedStatus, HttpStatus.OK);
  };

  /**
   * POST /api/onboarding/complete
   * Validate all steps and complete profile onboarding
   */
  public static complete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const result = await OnboardingService.completeOnboarding(userId);

    ApiResponse.success(res, 'Profile onboarding completed successfully', result, HttpStatus.OK);
  };
}

export default OnboardingController;
