import { HttpStatus, HttpStatusCode } from './httpStatus';

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // Common Convenience Factory Methods
  public static badRequest(message: string = 'Bad request', details?: unknown): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST', details);
  }

  public static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  public static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  public static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  public static conflict(message: string = 'Resource already exists'): AppError {
    return new AppError(message, HttpStatus.CONFLICT, 'CONFLICT');
  }

  public static unprocessable(message: string = 'Validation failed', details?: unknown): AppError {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details);
  }

  public static tooManyRequests(message: string = 'Too many requests'): AppError {
    return new AppError(message, HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
  }

  public static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
  }
}

export default AppError;
