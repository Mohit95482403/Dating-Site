// Profile, Preference & Photo Domain Types

export type GenderType = 'male' | 'female' | 'non_binary' | 'other';
export type PreferredGenderType = 'all' | 'male' | 'female' | 'non_binary' | 'other';
export type ProfileVisibility = 'public' | 'hidden' | 'matches_only';
export type RelationshipGoal = 'dating' | 'long_term' | 'friendship' | 'casual' | 'marriage' | 'not_sure';

export interface ProfileRow {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  gender: GenderType | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_visibility: ProfileVisibility;
  is_profile_complete: boolean | number;
  is_verified?: boolean | number;
  created_at: string;
  updated_at: string;
}

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'rejected';

export interface PreferenceRow {
  id: number;
  user_id: number;
  min_age: number;
  max_age: number;
  preferred_gender: PreferredGenderType;
  max_distance_km: number;
  relationship_goal: RelationshipGoal;
  created_at: string;
  updated_at: string;
}

export interface InterestRow {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface UserInterestRow {
  user_id: number;
  interest_id: number;
  created_at: string;
}

export interface PhotoRow {
  id: number;
  user_id: number;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  display_order: number;
  is_primary: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface ProfilePrompt {
  id: number;
  promptText: string;
  category: string;
  displayOrder: number;
}

export interface UserProfilePrompt {
  id: number;
  userId: number;
  promptId: number;
  promptText: string;
  category: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  completed: string[];
  missing: string[];
}

export interface PublicUserProfile {
  userId: number;
  firstName: string;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  photos: Array<{
    id: number;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
  }>;
  interests: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  prompts: UserProfilePrompt[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  isOnline: boolean | null;
  lastSeenAt: string | null;
  matchStatus: 'none' | 'matched' | 'unmatched';
  conversationId: number | null;
  canMessage: boolean;
}

export interface ReportProfileInput {
  targetUserId: number;
  reason: string;
  description?: string;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  isVerified: boolean;
  documentUrl: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
}
