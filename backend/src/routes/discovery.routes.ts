import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { DiscoveryController } from '../controllers/discovery.controller';

const router = Router();

// Protect all discovery endpoints with authentication
router.use(authMiddleware);

// Discovery candidates feed
router.get('/', DiscoveryController.getDiscovery);
router.get('/candidates', DiscoveryController.getDiscovery);

// Interactions
router.post('/:userId/like', DiscoveryController.likeProfile);
router.post('/:userId/pass', DiscoveryController.passProfile);
router.post('/:userId/super-like', DiscoveryController.superLikeProfile);

export default router;
