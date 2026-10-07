import { Router } from 'express';
import { TestController } from '../controllers/testController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/test
router.get('/', asyncHandler(TestController.getTestStatus));

// GET /api/test/interests - Demonstrates Controller -> Service -> Model -> Database pattern
router.get('/interests', asyncHandler(TestController.getInterestsDemonstration));

export default router;
