import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { MatchController } from '../controllers/match.controller';

const router = Router();

// All match routes require authenticated session
router.use(requireAuth);

// GET /api/matches - Retrieve all mutual matches for current user
router.get('/', MatchController.getUserMatches);

// GET /api/matches/count - Quick match count for badges and navbar
router.get('/count', MatchController.getMatchCount);

// GET /api/matches/:matchId - View details of a single match
router.get('/:matchId', MatchController.getMatchById);

// DELETE /api/matches/:matchId - Securely unmatch with partner
router.delete('/:matchId', MatchController.unmatch);

export default router;
