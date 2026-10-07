// Connectly Frontend Authentication Types

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned' | 'deleted';
export type GenderType = 'male' | 'female' | 'non_binary' | 'other';
export type PreferredGenderType = 'all' | 'male' | 'female' | 'non_binary' | 'other';
export type RelationshipGoal = 'dating' | 'long_term' | 'friendship' | 'casual' | 'marriage' | 'not_sure';


export interface User {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isProfileComplete?: boolean;
  firstName?: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: GenderType | string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export type AuthUser = User;

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: GenderType;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthData {
  user: AuthUser;
  accessToken: string;
}

export interface RefreshData {
  accessToken: string;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface Session {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface SessionsData {
  sessions: Session[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: string[];
  fieldErrors?: Record<string, string>;
}
