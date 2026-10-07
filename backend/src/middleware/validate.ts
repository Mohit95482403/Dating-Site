import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export type ValidatorFn = (data: any) => string[] | null;

/**
 * Express middleware for executing request body validator functions
 */
export const validate = (validator: ValidatorFn) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors = validator(req.body);
    if (errors && errors.length > 0) {
      return next(AppError.unprocessable('Validation failed', errors));
    }
    next();
  };
};

export default validate;
