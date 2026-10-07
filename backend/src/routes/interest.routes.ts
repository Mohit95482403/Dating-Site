import { Router, Request, Response } from 'express';
import { InterestModel } from '../models/interest.model';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/interests
 * Retrieve all predefined interests for selection
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const interests = await InterestModel.findAll();
    ApiResponse.success(
      res,
      'Interests retrieved successfully',
      { interests },
      HttpStatus.OK
    );
  })
);

export default router;
