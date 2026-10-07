import { Request, Response, NextFunction } from 'express';
import config from '../config/env';

/**
 * Connectly Production Security Headers Middleware
 * Protects against XSS, clickjacking, MIME sniffing, and insecure framing
 * without breaking WebRTC peer connections, Socket.IO, or static media loading.
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 2. Prevent clickjacking / unsafe iframe embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 3. XSS Filter defense for legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 4. Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Cross-Origin Resource Policy (Permits avatar/image asset loading across origin in dev/prod)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // 6. Cross-Origin Opener Policy (Isolates browsing contexts)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // 7. Permissions-Policy: Restrict browser hardware APIs except those needed for calls
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()'
  );

  // 8. Strict Transport Security (HSTS) in production
  if (config.env.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 9. Remove fingerprinting Express headers
  res.removeHeader('X-Powered-By');

  next();
};

export default securityHeaders;
