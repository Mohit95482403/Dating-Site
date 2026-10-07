// User & Session Domain Types

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export interface UserRow {
  id: number;
  email: string;
  username?: string | null;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  is_email_verified: boolean | number;
  last_login_at: string | null;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<UserRow, 'password_hash'>;

export interface SessionRow {
  id: number;
  user_id: number;
  refresh_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

export interface VerificationRequestRow {
  id: number;
  user_id: number;
  document_url: string | null;
  selfie_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}
