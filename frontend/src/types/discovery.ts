export interface DiscoveryPhoto {
  id: number;
  fileUrl: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface DiscoveryInterest {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface DiscoveryProfile {
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
  photos: DiscoveryPhoto[];
  interests: DiscoveryInterest[];
  sharedInterests: string[];
  sharedInterestsCount: number;
  isVerified: boolean;
  isProfileComplete: boolean;
  compatibilityScore: number;
  hasSuperLikedYou?: boolean;
  isBoosted?: boolean;
  badge?: 'PRO' | 'VIP' | null;
}

export interface DiscoveryFiltersState {
  minAge?: number;
  maxAge?: number;
  gender?: 'all' | 'male' | 'female' | 'non_binary' | 'other';
  maxDistanceKm?: number;
  interests?: string[];
  verifiedOnly?: boolean;
}

export interface DiscoveryResponse {
  profiles: DiscoveryProfile[];
  nextCursor: number | null;
}

export interface InteractionResponse {
  liked?: boolean;
  passed?: boolean;
  superLiked?: boolean;
  matched: boolean;
  matchId?: number | null;
  targetUserId: number;
}
