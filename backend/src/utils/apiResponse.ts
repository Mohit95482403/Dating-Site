import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from './httpStatus';

export interface ApiResponseOptions<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiResponse {
  /**
   * Send a successful JSON response
   */
  public static success<T = unknown>(
    res: Response,
    message: string = 'Operation successful',
    data?: T,
    statusCode: HttpStatusCode = HttpStatus.OK,
    extra?: Record<string, unknown>
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined ? { data } : {}),
      ...(extra || {}),
    });
  }

  /**
   * Send a formatted error JSON response
   */
  public static error(
    res: Response,
    message: string = 'Something went wrong',
    errors: unknown[] = [],
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors.length > 0 ? { errors } : {}),
    });
  }
}

export default ApiResponse;
