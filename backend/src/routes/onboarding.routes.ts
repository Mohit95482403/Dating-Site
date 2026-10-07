import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  validateBasicInfoInput,
  validateAboutInput,
  validateInterestsInput,
  validatePreferencesInput,
} from '../validators/onboarding.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All onboarding endpoints require active authentication
router.use(authMiddleware as any);

/**
 * GET /api/onboarding/status
 * Get current onboarding progress and prefilled form data
 */
router.get('/status', asyncHandler(OnboardingController.getStatus as any));

/**
 * PUT /api/onboarding/basic-info
 * Save Step 1: Basic Information
 */
router.put(
  '/basic-info',
  validate(validateBasicInfoInput),
  asyncHandler(OnboardingController.saveBasicInfo as any)
);

/**
 * PUT /api/onboarding/about
 * Save Step 2: About You
 */
router.put(
  '/about',
  validate(validateAboutInput),
  asyncHandler(OnboardingController.saveAbout as any)
);

/**
 * PUT /api/onboarding/interests
 * Save Step 3: Interests
 */
router.put(
  '/interests',
  validate(validateInterestsInput),
  asyncHandler(OnboardingController.saveInterests as any)
);

/**
 * PUT /api/onboarding/preferences
 * Save Step 4: Dating Preferences
 */
router.put(
  '/preferences',
  validate(validatePreferencesInput),
  asyncHandler(OnboardingController.savePreferences as any)
);

/**
 * POST /api/onboarding/photos
 * Save Step 5: Add a Photo
 */
router.post('/photos', asyncHandler(OnboardingController.addPhoto as any));

/**
 * DELETE /api/onboarding/photos/:photoId
 * Remove a photo
 */
router.delete('/photos/:photoId', asyncHandler(OnboardingController.removePhoto as any));

/**
 * POST /api/onboarding/complete
 * Finalize profile and mark onboarding complete
 */
router.post('/complete', asyncHandler(OnboardingController.complete as any));

export default router;
