import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '../utils/httpStatus';
import { logger } from '../utils/logger';
import config from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';
  let errors = err.details ? (Array.isArray(err.details) ? err.details : [err.details]) : [];

  // Handle MySQL Duplicate Entry (ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = HttpStatus.CONFLICT;
    message = 'A resource with this identifier already exists.';
    errors = ['Duplicate entry violation'];
  }
  // Handle other MySQL database errors (prevent leaking table structure or queries)
  else if (err.code && typeof err.code === 'string' && err.code.startsWith('ER_')) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Database operation could not be completed with the provided data.';
    errors = [];
  }

  // Handle Multer File Upload Errors
  if (err.name === 'MulterError' || (err.code && typeof err.code === 'string' && err.code.startsWith('LIMIT_'))) {
    statusCode = HttpStatus.BAD_REQUEST;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum permitted size limit.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded in a single request.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected upload field provided.';
    } else {
      message = `Upload error: ${err.message}`;
    }
    errors = [message];
  }

  // Handle Syntax Error in JSON Body Parsing
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Malformed JSON payload provided.';
  }

  // Log detailed error on server with request correlation ID
  const reqId = (req as any).id || 'unknown';
  logger.error(`[Error][${reqId}] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
    requestId: reqId,
    stack: err.stack,
    details: err.details,
    code: err.code,
  });

  // Safe client response (strip stack traces and internal specifics in production)
  const isProduction = config.env.isProduction;

  if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR && isProduction) {
    message = 'An unexpected internal error occurred. Please try again later.';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 ? { errors } : {}),
    requestId: reqId,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
