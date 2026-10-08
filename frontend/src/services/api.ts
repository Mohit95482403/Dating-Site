import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';
import { API_BASE_URL } from '../config/env';

import type { AuthUser } from '../types/auth';

const TOKEN_STORAGE_KEY = 'connectly_access_token';
const USER_STORAGE_KEY = 'connectly_user';

// In-memory access token storage initialized from localStorage
let inMemoryAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

// In-memory user storage safely initialized from localStorage
let inMemoryUser: AuthUser | null = (() => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
})();

let onAuthFailureCallback: (() => void) | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or restricted environment errors
  }
};

export const getAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    inMemoryAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
  return inMemoryAccessToken;
};

export const setStoredUser = (user: AuthUser | null): void => {
  inMemoryUser = user;
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or access errors
  }
};

export const getStoredUser = (): AuthUser | null => {
  if (inMemoryUser) return inMemoryUser;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    inMemoryUser = raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    inMemoryUser = null;
  }
  return inMemoryUser;
};

export const setOnAuthFailure = (callback: () => void): void => {
  onAuthFailureCallback = callback;
};

// API Base URL from centralized environment config
const baseURL = API_BASE_URL;

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000, // 60s accommodates Render container cold starts safely
  withCredentials: true, // Required for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT bearer token if present, but NEVER on public auth endpoints
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    const isPublicAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (!isPublicAuthRoute) {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Lightweight background ping to wake up sleeping Render instance when user lands on auth pages
 */
let hasPrewarmed = false;
export const prewarmBackend = (): void => {
  if (hasPrewarmed) return;
  hasPrewarmed = true;
  api.get('/health', { timeout: 35000 }).catch(() => {
    // Non-blocking ping failure ignored
  });
};

// Variables for token refresh queuing & loop prevention
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: 401 token refresh queue with loop protection
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If no response (network down) or no original request, reject
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      (!getAccessToken() && url.includes('/auth/me'));

    // If 401 Unauthorized and not already retried, and not an auth mutation route
    if (error.response.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Queue this request while refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Direct call to refresh using separate instance to bypass interceptor loop
        const refreshResponse = await axios.post<{
          success: boolean;
          data: { accessToken: string };
        }>(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // Only clear token and notify session expiry if the refresh was rejected by server (401/403)
        const isAuthRejection =
          refreshError?.response?.status === 401 || refreshError?.response?.status === 403;
        if (isAuthRejection) {
          setAccessToken(null);
          if (onAuthFailureCallback) {
            onAuthFailureCallback();
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Health check service helpers
export const healthService = {
  getApiHealth: async (): Promise<ApiResponse> => {
    const response = await api.get<ApiResponse>('/health');
    return response.data;
  },
  getDatabaseHealth: async (): Promise<ApiResponse> => {
    const response = await api.get<ApiResponse>('/health/db');
    return response.data;
  },
};

export default api;
