import { api, setAccessToken } from './api';
import type {
  RegisterPayload,
  LoginPayload,
  AuthUser,
  Session,
  AuthResponse,
  AuthData,
  RefreshData,
  SessionsData,
} from '../types/auth';

export const authService = {
  /**
   * Register a new user account with full profile & preferences
   * POST /api/auth/register
   */
  async register(payload: RegisterPayload): Promise<{ user: AuthUser; accessToken: string }> {
    const response = await api.post<AuthResponse<AuthData>>('/auth/register', payload);
    const data = response.data.data;
    if (!data?.accessToken || !data?.user) {
      throw new Error(response.data.message || 'Registration failed');
    }
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Authenticate user credentials and retrieve access token
   * POST /api/auth/login
   */
  async login(payload: LoginPayload): Promise<{ user: AuthUser; accessToken: string }> {
    // Clear any stale access token before initiating login
    setAccessToken(null);
    const response = await api.post<AuthResponse<AuthData>>('/auth/login', payload);
    const data = response.data.data;
    if (!data?.accessToken || !data?.user) {
      throw new Error(response.data.message || 'Login failed');
    }
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Refresh the access token using HTTP-only cookie
   * POST /api/auth/refresh
   */
  async refresh(): Promise<string> {
    const response = await api.post<AuthResponse<RefreshData>>('/auth/refresh');
    const token = response.data.data?.accessToken;
    if (!token) {
      throw new Error('Failed to refresh access token');
    }
    setAccessToken(token);
    return token;
  },

  /**
   * Terminate current session and clear refresh cookie
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    try {
      await api.post<AuthResponse<null>>('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * Terminate all active sessions across all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post<AuthResponse<null>>('/auth/logout-all');
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * Retrieve current authenticated user profile
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<AuthResponse<{ user: AuthUser }>>('/auth/me');
    const user = response.data.data?.user;
    if (!user) {
      throw new Error('User profile not found');
    }
    return user;
  },

  /**
   * Retrieve list of active sessions for Day 24 preparation
   * GET /api/auth/sessions
   */
  async getSessions(): Promise<Session[]> {
    const response = await api.get<AuthResponse<SessionsData>>('/auth/sessions');
    return response.data.data?.sessions || [];
  },

  /**
   * Revoke a specific active session
   * DELETE /api/auth/sessions/:sessionId
   */
  async revokeSession(sessionId: number): Promise<void> {
    await api.delete<AuthResponse<null>>(`/auth/sessions/${sessionId}`);
  },
};

export default authService;
