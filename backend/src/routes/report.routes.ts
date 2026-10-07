import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All report endpoints require authentication
router.use(authMiddleware as any);

/**
 * POST /api/reports/profile
 * Report a profile
 */
router.post('/profile', asyncHandler(ReportController.reportProfile as any));

/**
 * POST /api/reports
 * General profile reporting endpoint
 */
router.post('/', asyncHandler(ReportController.reportProfile as any));

export default router;
