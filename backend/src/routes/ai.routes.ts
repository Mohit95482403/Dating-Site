// Connectly AI Routes
import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All AI endpoints require valid authentication
router.use(requireAuth);

// 1. Smart Compatibility
router.get('/compatibility/:targetUserId', AIController.getCompatibility);
router.get('/matches/:matchId/compatibility', AIController.getMatchCompatibilityByMatchId);

// 2. Profile Insights & Bio Enhancement
router.post('/profile/insights', AIController.getProfileInsights);
router.post('/profile/improve-bio', AIController.improveBio);

// 3. Conversation Assistant
router.post('/conversation/suggestions', AIController.getConversationSuggestions);
router.post('/conversation/starter', AIController.getConversationStarter);

// 4. Admin Telemetry
router.get('/admin/stats', AIController.getAdminStats);

export default router;
