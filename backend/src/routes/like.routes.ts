import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/apiResponse';
import LikeService from '../services/like.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/likes/received
 * Returns list of members who liked the authenticated user (Premium 'SEE_WHO_LIKED' protected)
 */
router.get(
  '/received',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = (req as any).user.id;
    const data = await LikeService.getReceivedLikes(userId);
    ApiResponse.success(res, 'Received likes retrieved successfully.', data);
  })
);

router.get('/', (_req, res) => {
  ApiResponse.success(res, 'Likes & interaction routing architecture active.');
});

export default router;
