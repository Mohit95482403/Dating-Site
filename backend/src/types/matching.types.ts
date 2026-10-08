// Matching, Likes, Passes, SuperLikes, Blocks & Reports Domain Types

export interface LikeRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  created_at: string;
}

export interface PassRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  created_at: string;
}

export interface SuperLikeRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  created_at: string;
}

export type MatchStatus = 'active' | 'unmatched' | 'blocked';

export interface MatchRow {
  id: number;
  user_one_id: number;
  user_two_id: number;
  matched_at: string;
  status: MatchStatus;
  unmatched_by: number | null;
  unmatched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockRow {
  id: number;
  blocker_id: number;
  blocked_user_id: number;
  reason: string | null;
  created_at: string;
}

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface ReportRow {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: string;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchUserLocation {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface MatchUserPhoto {
  id: number;
  fileUrl: string;
  isPrimary?: boolean;
}

export interface MatchUser {
  id: number;
  firstName: string;
  lastName?: string | null;
  age: number | null;
  gender?: string | null;
  bio?: string | null;
  occupation?: string | null;
  education?: string | null;
  location?: MatchUserLocation;
  primaryPhoto?: MatchUserPhoto | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  photos?: MatchUserPhoto[];
  interests?: string[];
  isVerified: boolean;
}

export interface UserMatchItem {
  id: number;
  user: MatchUser;
  matchedAt: string;
  createdAt?: string;
}
