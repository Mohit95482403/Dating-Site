import { Router, Request, Response, NextFunction } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { PhotoController } from '../controllers/photo.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { validateProfileUpdateInput } from '../validators/profile.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadProfilePhotos, uploadVerificationDoc } from '../config/multer';

const router = Router();

// All profile endpoints require active user authentication
router.use(authMiddleware as any);

/**
 * GET /api/profile
 * Retrieve complete profile for the currently authenticated user
 */
router.get('/', asyncHandler(ProfileController.getProfile as any));

/**
 * PUT /api/profile
 * Safely update profile, preferences, and interests
 */
router.put(
  '/',
  validate(validateProfileUpdateInput),
  asyncHandler(ProfileController.updateProfile as any)
);

/**
 * GET /api/profile/completion
 * Retrieve profile completion breakdown and suggestions
 */
router.get('/completion', asyncHandler(ProfileController.getCompletion as any));

/**
 * GET /api/profile/photos
 * Retrieve all photos of authenticated user
 */
router.get('/photos', asyncHandler(ProfileController.getPhotos as any));

/**
 * Upload middleware handling multiple or single files under 'photos' or 'photo'
 */
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    uploadProfilePhotos.fields([
      { name: 'photos', maxCount: 6 },
      { name: 'photo', maxCount: 6 },
    ])(req, res, (err) => {
      if (err) return next(err);
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const allFiles = filesObj
        ? [...(filesObj['photos'] || []), ...(filesObj['photo'] || [])]
        : [];
      (req as any).files = allFiles;
      next();
    });
  } else {
    next();
  }
};

/**
 * POST /api/profile/photos
 * Upload multiple or single profile photos (Multer disk storage)
 */
router.post(
  '/photos',
  handleUpload,
  asyncHandler(PhotoController.uploadPhotos as any)
);

/**
 * PUT /api/profile/photos/reorder
 * Reorder photos display order (must be defined BEFORE :id parameter route)
 */
router.put('/photos/reorder', asyncHandler(PhotoController.reorderPhotos as any));

/**
 * DELETE /api/profile/photos/:id
 * Delete a photo by ID with strict ownership validation and file unlinking
 */
router.delete('/photos/:id', asyncHandler(PhotoController.deletePhoto as any));

/**
 * PUT /api/profile/photos/:id/primary
 * Set a photo as primary with strict ownership validation
 */
router.put('/photos/:id/primary', asyncHandler(PhotoController.setPrimaryPhoto as any));

/**
 * GET /api/profile/prompts
 * List all predefined profile prompts
 */
router.get('/prompts', asyncHandler(ProfileController.getPrompts as any));

/**
 * GET /api/profile/user-prompts
 * Get user's answered prompts
 */
router.get('/user-prompts', asyncHandler(ProfileController.getUserPrompts as any));

/**
 * POST /api/profile/user-prompts
 * Save an answered prompt
 */
router.post('/user-prompts', asyncHandler(ProfileController.saveUserPrompt as any));

/**
 * PUT /api/profile/user-prompts/:promptId
 * Update an answered prompt
 */
router.put('/user-prompts/:promptId', asyncHandler(ProfileController.saveUserPrompt as any));

/**
 * DELETE /api/profile/user-prompts/:promptId
 * Delete an answered prompt
 */
router.delete('/user-prompts/:promptId', asyncHandler(ProfileController.deleteUserPrompt as any));

/**
 * GET /api/profile/verification
 * Get profile verification status
 */
router.get('/verification', asyncHandler(ProfileController.getVerification as any));

/**
 * POST /api/profile/verification
 * Upload and submit verification document (accepts 'verificationDoc', 'document', or 'file')
 */
const handleVerificationDocUpload = (req: any, res: any, next: any) => {
  uploadVerificationDoc.fields([
    { name: 'verificationDoc', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err) return next(err);
    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (filesObj) {
      req.file = filesObj['verificationDoc']?.[0] || filesObj['document']?.[0] || filesObj['file']?.[0];
    }
    next();
  });
};

router.post(
  '/verification',
  handleVerificationDocUpload,
  asyncHandler(ProfileController.submitVerification as any)
);

/**
 * GET /api/profile/:userId
 * Public profile viewing with privacy and block enforcement
 */
router.get('/:userId', asyncHandler(ProfileController.getPublicProfile as any));

export default router;
