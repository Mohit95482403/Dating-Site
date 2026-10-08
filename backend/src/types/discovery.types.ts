export interface DiscoveryFilterOptions {
  limit?: number;
  cursor?: number | null;
  offset?: number;
  minAge?: number;
  maxAge?: number;
  gender?: 'all' | 'male' | 'female' | 'non_binary' | 'other';
  maxDistanceKm?: number;
  interests?: string[];
  verifiedOnly?: boolean;
}

export interface CandidateProfilePhoto {
  id: number;
  fileUrl: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface CandidateInterest {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface CandidateProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName?: string | null;
  age: number;
  gender: string | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  photos: CandidateProfilePhoto[];
  primaryPhoto?: CandidateProfilePhoto | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  interests: CandidateInterest[];
  sharedInterests: string[];
  sharedInterestsCount: number;
  isVerified: boolean;
  isProfileComplete: boolean;
  compatibilityScore: number;
  hasSuperLikedYou?: boolean;
  isBoosted?: boolean;
}

export interface DiscoveryResponseData {
  profiles: CandidateProfile[];
  nextCursor: number | null;
  hasMore: boolean;
  totalFiltered: number;
}

export interface InteractionResult {
  liked?: boolean;
  passed?: boolean;
  superLiked?: boolean;
  matched: boolean;
  matchId?: number | null;
  match?: { id: number } | null;
  targetUserId: number;
}

