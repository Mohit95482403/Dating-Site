import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

router.use(requireAuth);

// GET /api/sessions - List active sessions
router.get('/', SettingsController.getSessions);

// POST /api/sessions/logout-others - Log out other active sessions
router.post('/logout-others', SettingsController.logoutOtherSessions);

// DELETE /api/sessions/:sessionId - Revoke a specific session
router.delete('/:sessionId', SettingsController.revokeSession);

export default router;
