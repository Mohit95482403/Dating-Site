import { Request, Response } from 'express';
import { HttpStatus } from '../utils/httpStatus';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: 'API route not found',
  });
};

export default notFoundHandler;
