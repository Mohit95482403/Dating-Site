/**
 * Centralized frontend environment configuration.
 * Ensures consistent URLs across all API, WebSocket, and media requests,
 * preventing duplicate path segments and supporting both local and production environments.
 */

const sanitizeUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
};

// Production fallbacks
const PROD_BACKEND_URL = 'https://connectly-backend-j7wp.onrender.com';
const PROD_API_URL = 'https://connectly-backend-j7wp.onrender.com/api';

const isProductionDomain =
  (typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1') ||
  import.meta.env.PROD ||
  import.meta.env.MODE === 'production';

// Fallback defaults: production origin when deployed, localhost only during local development
const DEFAULT_API_URL = isProductionDomain ? PROD_API_URL : 'http://localhost:5000/api';
const DEFAULT_BACKEND_URL = isProductionDomain ? PROD_BACKEND_URL : 'http://localhost:5000';

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

// 1. Backend Origin (e.g. https://connectly-backend-j7wp.onrender.com)
export const BACKEND_URL: string =
  sanitizeUrl(rawBackendUrl) ||
  (rawApiUrl ? sanitizeUrl(rawApiUrl).replace(/\/api$/, '') : '') ||
  sanitizeUrl(rawSocketUrl) ||
  DEFAULT_BACKEND_URL;

// 2. API Base URL (e.g. https://connectly-backend-j7wp.onrender.com/api)
// Ensures no accidental double "/api/api" occurs
export const API_BASE_URL: string = (() => {
  if (rawApiUrl) {
    const clean = sanitizeUrl(rawApiUrl);
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (rawBackendUrl) {
    return `${sanitizeUrl(rawBackendUrl)}/api`;
  }
  return DEFAULT_API_URL;
})();

// 3. Socket.IO Connection URL (e.g. https://connectly-backend-j7wp.onrender.com)
export const SOCKET_URL: string =
  sanitizeUrl(rawSocketUrl) ||
  BACKEND_URL ||
  DEFAULT_BACKEND_URL;

export const isProduction: boolean = import.meta.env.PROD || import.meta.env.MODE === 'production';
