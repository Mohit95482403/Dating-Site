import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from './config/env';
import routes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authMiddleware } from './middleware/authMiddleware';
import { securityHeaders } from './middleware/securityHeaders';
import { requestId } from './middleware/requestId';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware';
import {
  generalApiLimiter,
  authRateLimiter,
  aiRateLimiter,
  uploadRateLimiter,
} from './middleware/rateLimiter';

const createApp = (): Application => {
  const app = express();

  // 1. Trust proxy for reverse proxy environments (IP detection behind Nginx / Cloudflare / Heroku)
  app.set('trust proxy', 1);

  // 2. Correlation ID for end-to-end distributed request tracing
  app.use(requestId);

  // 3. Security HTTP Headers (HSTS, CSP, Frameguard, MIME Sniffing defense)
  app.use(securityHeaders);

  // 4. Request Logging with request ID correlation
  app.use(requestLogger);

  // 5. Hardened CORS Configuration & Universal Preflight Handling
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const allowed = config.env.cors.allowedOrigins;

      if (
        allowed.includes(normalizedOrigin) ||
        (!config.env.isProduction &&
          (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)))
      ) {
        return callback(null, true);
      }

      logger.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-Id',
      'Accept',
      'Origin',
    ],
    exposedHeaders: [
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
      'X-Request-Id',
    ],
    optionsSuccessStatus: 200,
    maxAge: 86400, // 24 hours pre-flight cache
  };

  app.use(cors(corsOptions));
  // Explicit preflight handler across all route trees
  app.options('*', cors(corsOptions));

  // 6. Request Body Parsers with Strict Size Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 7. Tiered Rate Limiting Protection
  // Targeted protection on high-risk vectors
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/register', authRateLimiter);
  app.use('/api/auth/forgot-password', authRateLimiter);
  app.use('/api/auth/reset-password', authRateLimiter);
  app.use('/api/ai', aiRateLimiter);
  app.use('/api/upload', uploadRateLimiter);
  // General baseline rate limiting across all API routes
  app.use('/api', generalApiLimiter);

  // 8. Protected verification documents - never publicly served without authorization
  app.use('/uploads/verifications', (authMiddleware as any), (req, res, next) => {
    const authUser = (req as any).user;
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for verification document access.',
      });
    }

    // Administrators have full permission to inspect verification documents
    if (authUser.role === 'admin') {
      return next();
    }

    // Regular users can only view their own verification documents
    const match = req.path.match(/user-(\d+)/);
    if (match) {
      const targetUserId = parseInt(match[1], 10);
      if (authUser.id === targetUserId) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: Verification documents are strictly protected.',
    });
  });

  // 9. Static media uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // 10. Operational maintenance mode interceptor
  app.use(maintenanceMiddleware);

  // 11. Mount API routes with /api prefix
  app.use('/api', routes);

  // 11. Catch-all 404 handler for unmatched API routes
  app.use(notFoundHandler);

  // 12. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
