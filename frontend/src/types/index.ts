// Connectly Frontend Core Domain Types

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
  uptime?: number;
  environment?: string;
  database?: string | Array<{ db: string; version: string }>;
  tablesCount?: number;
  error?: string;
}


export * from './auth';
export * from './onboarding';
export * from './settings';
export * from './subscription';
export * from './feed';
export * from './explore';
export * from './community';
export * from './trust';
export type {
  ProfilePhoto,
  ProfileInterest,
  ProfilePreferences,
  ProfileLocation,
  ProfileResponse,
  UpdateProfilePayload,
  PhotoOperationResult,
} from './profile';


export interface Profile {
  id: string | number;
  userId: string | number;
  displayName: string;
  age: number;
  gender: string;
  bio?: string;
  photos: string[];
  distanceKm?: number;
  locationCity?: string;
  interests: string[];
  matchPercentage?: number;
}

export interface Interest {
  id: string | number;
  name: string;
  icon?: string;
  category?: string;
}

export interface Match {
  id: string | number;
  user: Profile;
  matchedAt: string;
  status: 'active' | 'unmatched';
}

export interface Message {
  id: string | number;
  matchId: string | number;
  senderId: string | number;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  id: string | number;
  type: 'like' | 'match' | 'message' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface SystemHealthStatus {
  apiOnline: boolean;
  dbOnline: boolean;
  socketConnected: boolean;
  socketId?: string;
  lastChecked?: string;
  error?: string;
}
