import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { InterestService } from '../services/interest.service';
import { HttpStatus } from '../utils/httpStatus';

export class TestController {
  /**
   * GET /api/test - Development test endpoint
   */
  public static getTestStatus = async (_req: Request, res: Response): Promise<void> => {
    ApiResponse.success(
      res,
      'Connectly backend is working',
      {
        status: 'operational',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.OK
    );
  };

  /**
   * GET /api/test/interests - Demonstrates Controller -> Service -> Model -> Database pattern
   */
  public static getInterestsDemonstration = async (_req: Request, res: Response): Promise<void> => {
    const interests = await InterestService.getAllInterests();
    ApiResponse.success(
      res,
      'Interests retrieved successfully via Service -> Model layer',
      interests,
      HttpStatus.OK
    );
  };
}

export default TestController;
