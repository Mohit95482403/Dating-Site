import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuditModel } from '../models/audit.model';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  name?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Sliding Window In-Memory Rate Limiter with Automatic Memory Cleanup
 */
export const createRateLimiter = (options: RateLimiterOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    name = 'rate_limiter',
    keyGenerator = (req: Request) => {
      // Prioritize authenticated user ID, fallback to client IP
      const authUser = (req as any).user;
      if (authUser?.id) return `user:${authUser.id}`;
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return `ip:${forwarded.split(',')[0].trim()}`;
      }
      return `ip:${req.socket.remoteAddress || 'unknown'}`;
    },
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodic garbage collection to prevent memory leaks every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetAt) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    // Standard RFC RateLimit headers
    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);

      logger.warn(`[RateLimit] Limit breached for ${key} on [${name}] ${req.method} ${req.originalUrl}`);

      // Log security event to database asynchronously
      const userId = (req as any).user?.id || null;
      AuditModel.log(
        userId,
        'RATE_LIMIT_TRIGGERED',
        'rate_limit',
        null,
        `Exceeded limit of ${maxRequests} requests per ${Math.round(windowMs / 1000)}s on ${req.originalUrl} (${name})`,
        req.ip || (req.headers ? (req.headers['x-forwarded-for'] as string) : null) || null,
        (req.headers ? req.headers['user-agent'] : null) || null
      ).catch(() => {});

      res.status(429).json({
        success: false,
        message,
        code: 'TOO_MANY_REQUESTS',
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
};

/**
 * Pre-configured rate limiters for critical application domains
 */

// 1. Strict Authentication Limiter: Brute force defense (20 attempts per 15 min per IP)
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    return `auth:${ip}`;
  },
});

// 2. Password Reset / Token Verification Limiter (5 requests per 15 min)
export const passwordResetLimiter = createRateLimiter({
  name: 'password_reset',
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many verification attempts. Please wait 15 minutes before requesting another code.',
});

// 3. AI Endpoints Limiter: Prevents API quota exhaustion & denial of service (25 requests per minute)
export const aiRateLimiter = createRateLimiter({
  name: 'ai_endpoints',
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'AI request limit reached. Please wait a moment before sending another prompt.',
});

// 4. File Upload Limiter: Storage abuse defense (20 uploads per minute)
export const uploadRateLimiter = createRateLimiter({
  name: 'file_uploads',
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Upload frequency limit reached. Please pause before uploading additional files.',
});

// 5. Messaging / Chat Limiter (100 messages per minute)
export const messagingRateLimiter = createRateLimiter({
  name: 'chat_messages',
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'You are sending messages too quickly. Please slow down.',
});

// 6. Global API Limiter: Broad DoS mitigation (400 requests per minute)
export const generalApiLimiter = createRateLimiter({
  name: 'general_api',
  windowMs: 60 * 1000,
  maxRequests: 400,
  message: 'High traffic detected. Please slow down your requests.',
});
