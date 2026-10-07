import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

router.use(requireAuth);

// GET /api/account - Get account info
router.get('/', SettingsController.getAccount);

// PUT /api/account - Update account info (names, username, dob, email)
router.put('/', SettingsController.updateAccount);

// DELETE /api/account - Delete user account permanently
router.delete('/', SettingsController.deleteAccount);

export default router;
