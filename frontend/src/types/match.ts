export interface MatchLocation {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface MatchPhoto {
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
  location?: MatchLocation | null;
  primaryPhoto?: MatchPhoto | null;
  photos?: MatchPhoto[];
  interests?: string[];
  isVerified: boolean;
}

export interface MatchItem {
  id: number;
  user: MatchUser;
  matchedAt: string;
  createdAt?: string;
}

export interface MatchesResponseData {
  matches: MatchItem[];
  count: number;
}

export interface MatchDetailResponseData {
  match: MatchItem;
}
