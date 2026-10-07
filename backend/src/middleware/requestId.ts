import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Attaches or propagates a unique correlation ID for every inbound request.
 * Useful for debugging distributed logs, tracing errors, and auditing requests.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Use client-provided request ID if available (sanitized), otherwise generate UUID
  const clientReqId = req.headers['x-request-id'] as string;
  const correlationId = clientReqId && /^[a-zA-Z0-9_-]{8,64}$/.test(clientReqId)
    ? clientReqId
    : crypto.randomUUID();

  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  next();
};

export default requestId;
