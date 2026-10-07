// Connectly Day 23: Explore, Global Search, Trending & Discovery Types

export type SearchType = 'all' | 'people' | 'posts' | 'stories' | 'hashtags' | 'interests';

export type ExploreSortOption = 'recommended' | 'newest' | 'compatibility' | 'popular';

export interface SearchQueryParams {
  q: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

export interface PeopleFilterParams {
  minAge?: number;
  maxAge?: number;
  city?: string;
  gender?: string;
  interests?: string[];
  verifiedOnly?: boolean;
  onlineOnly?: boolean;
  hasPhoto?: boolean;
  sort?: ExploreSortOption;
  page?: number;
  limit?: number;
}

export interface SearchResultProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  locationCity: string | null;
  locationCountry?: string | null;
  isVerified: boolean;
  isBoosted: boolean;
  isOnline: boolean;
  compatibilityScore?: number;
  sharedInterests?: string[];
  interests?: string[];
}

export interface SearchResultPost {
  id: number;
  userId: number;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  visibility: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  createdAt: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    isVerified: boolean;
    isPremium?: boolean;
  };
}

export interface SearchResultStory {
  id: number;
  userId: number;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  viewsCount: number;
  reactionsCount: number;
  expiresAt: string;
  createdAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    isVerified?: boolean;
  };
}

export interface SearchResultHashtag {
  id: number;
  name: string;
  postsCount: number;
  recentCount?: number;
  trendScore?: number;
  trendBadge?: '🔥 Viral' | '↑ Trending' | '✨ Rising' | 'Popular';
}

export interface SearchResultInterest {
  id: number;
  name: string;
  slug: string;
  profilesCount: number;
}

export interface GlobalSearchResponse {
  query: string;
  type: SearchType;
  people: SearchResultProfile[];
  posts: SearchResultPost[];
  stories: SearchResultStory[];
  hashtags: SearchResultHashtag[];
  interests: SearchResultInterest[];
  totalMatches: number;
}

export interface SearchHistoryItem {
  id: number;
  userId: number;
  query: string;
  searchType: SearchType;
  createdAt: string;
}

export interface TrendingResponse {
  hashtags: SearchResultHashtag[];
  posts: SearchResultPost[];
  stories: SearchResultStory[];
}

export interface SuggestedPeopleResponse {
  profiles: SearchResultProfile[];
  total: number;
}

export interface HashtagDetailResponse {
  hashtag: SearchResultHashtag;
  posts: SearchResultPost[];
  total: number;
  page: number;
  totalPages: number;
  sort: 'popular' | 'recent';
}

export interface AdminExploreAnalytics {
  topSearches: Array<{ query: string; count: number }>;
  popularHashtags: Array<{ name: string; postsCount: number; trendScore: number }>;
  totalSearchesToday: number;
  totalActiveHashtags: number;
  exploreInteractions24h: number;
}
