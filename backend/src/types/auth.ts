// Connectly Complete Authentication Domain Types

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'non_binary' | 'other';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  userId?: number;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  isEmailVerified: boolean;
  isProfileComplete?: boolean;
  firstName?: string;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}

export interface SessionInfo {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export type AuditAuthAction =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGOUT_ALL'
  | 'SESSION_REVOKED'
  | 'REFRESH_TOKEN_USED'
  | 'FAILED_LOGIN'
  | 'ACCOUNT_SUSPENDED';
