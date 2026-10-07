import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

router.use(requireAuth);

// GET /api/blocks - List all blocked users
router.get('/', SettingsController.getBlockedUsers);

// POST /api/blocks - Block a user
router.post('/', SettingsController.blockUser);
router.post('/:userId', SettingsController.blockUser);

// DELETE /api/blocks/:userId or POST /api/blocks/:userId/unblock
router.delete('/:userId', SettingsController.unblockUser);
router.post('/:userId/unblock', SettingsController.unblockUser);

export default router;
