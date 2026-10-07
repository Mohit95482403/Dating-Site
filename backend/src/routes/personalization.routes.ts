// Connectly Day 26: AI Personalization & Recommendation Intelligence Routes

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { PersonalizationController } from '../controllers/personalization.controller';

const router = Router();

// All personalization endpoints require active authentication
router.use(authMiddleware);

// ────────────────── Personalized Feed & Discovery ──────────────────
router.get('/home', PersonalizationController.getPersonalizedHome);
router.get('/personalized', PersonalizationController.getPersonalizedHome);
router.get('/people', PersonalizationController.getPeople);
router.get('/communities', PersonalizationController.getCommunities);
router.get('/events', PersonalizationController.getEvents);
router.get('/posts', PersonalizationController.getPosts);
router.get('/feed', PersonalizationController.getFeed);
router.get('/trending', PersonalizationController.getTrending);
router.get('/ai-suggestions', PersonalizationController.getAiSuggestions);
router.get('/interests', PersonalizationController.getInterests);

// ────────────────── Interaction & Feedback ──────────────────
router.post('/feedback', PersonalizationController.submitFeedback);
router.post('/exposure', PersonalizationController.recordExposure);
router.post('/events', PersonalizationController.ingestEvents);

// ────────────────── User Controls & Settings ──────────────────
router.get('/settings', PersonalizationController.getSettings);
router.put('/settings', PersonalizationController.updateSettings);
router.post('/reset', PersonalizationController.resetPersonalization);

// ────────────────── Admin Telemetry ──────────────────
router.get('/admin/analytics', PersonalizationController.getAdminAnalytics);

export default router;
