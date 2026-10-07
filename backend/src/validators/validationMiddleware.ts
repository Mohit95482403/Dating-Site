import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export type ValidatorFn = (data: any) => string[] | null;

export interface ValidationSchema {
  body?: ValidatorFn;
  query?: ValidatorFn;
  params?: ValidatorFn;
}

/**
 * Reusable middleware runner for validating request body, query, or params
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schema.body) {
      const bodyErrors = schema.body(req.body);
      if (bodyErrors) errors.push(...bodyErrors);
    }

    if (schema.query) {
      const queryErrors = schema.query(req.query);
      if (queryErrors) errors.push(...queryErrors);
    }

    if (schema.params) {
      const paramsErrors = schema.params(req.params);
      if (paramsErrors) errors.push(...paramsErrors);
    }

    if (errors.length > 0) {
      return next(AppError.unprocessable('Validation error', errors));
    }

    next();
  };
};

export default validate;
