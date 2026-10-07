import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

// GET /api/settings/public - Public settings, active features & maintenance status
router.get('/public', asyncHandler(SettingsController.getPublicSettings));

// User personal settings (Day 15)
router.get('/', requireAuth, asyncHandler(SettingsController.getSettings as any));
router.put('/', requireAuth, asyncHandler(SettingsController.updateSettings as any));

export default router;
