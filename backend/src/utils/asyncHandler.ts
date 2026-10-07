import { Request, Response, NextFunction, RequestHandler } from 'express';

export type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Higher-order function wrapping async route handlers to automatically forward unhandled rejections to next()
 */
export const asyncHandler = (fn: AsyncController): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
