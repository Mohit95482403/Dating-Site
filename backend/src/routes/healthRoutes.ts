import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/health - General API health
router.get('/', asyncHandler(HealthController.getApiHealth));

// GET /api/health/live - Container liveness probe
router.get('/live', asyncHandler(HealthController.getLiveness));

// GET /api/health/ready - Container readiness probe
router.get('/ready', asyncHandler(HealthController.getReadiness));

// GET /api/health/db - Database health check
router.get('/db', asyncHandler(HealthController.getDatabaseHealth));

export default router;
