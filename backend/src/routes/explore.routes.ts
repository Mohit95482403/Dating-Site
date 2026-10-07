// Connectly Day 23: Explore, Global Search, Trending & Discovery Routes

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { ExploreController } from '../controllers/explore.controller';

const router = Router();

// All explore routes require authentication
router.use(authMiddleware);

// ────────────────── Global Search ──────────────────
router.get('/search', ExploreController.search);

// ────────────────── Search History ──────────────────
router.get('/search/history', ExploreController.getSearchHistory);
router.delete('/search/history/:id', ExploreController.removeSearchHistoryItem);
router.delete('/search/history', ExploreController.clearSearchHistory);

// ────────────────── Trending Content ──────────────────
router.get('/trending', ExploreController.getTrending);

// ────────────────── Suggested / Recommendations ──────────────────
router.get('/suggested/people', ExploreController.getSuggestedPeople);

// ────────────────── Filtered People Discovery ──────────────────
router.get('/people', ExploreController.getFilteredPeople);

// ────────────────── Hashtag Detail & Posts ──────────────────
router.get('/hashtags/:tag', ExploreController.getHashtagDetail);

// ────────────────── Admin Explore Analytics ──────────────────
router.get('/admin/analytics', requireRole('admin'), ExploreController.getAdminAnalytics);

export default router;
