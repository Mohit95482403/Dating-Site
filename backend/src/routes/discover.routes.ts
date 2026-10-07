import { Router } from 'express';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Future discovery routes: GET /api/discover/feed
router.get('/', (_req, res) => {
  ApiResponse.success(res, 'Discovery routing architecture active. Full implementation in Day 6.');
});

export default router;
