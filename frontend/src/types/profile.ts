// Connectly Frontend Profile Domain Types

export type GenderType = 'male' | 'female' | 'non_binary' | 'other';
export type PreferredGenderType = 'all' | 'male' | 'female' | 'non_binary' | 'other';
export type RelationshipGoalType =
  | 'dating'
  | 'long_term'
  | 'friendship'
  | 'casual'
  | 'marriage'
  | 'not_sure';

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'rejected';

export interface ProfileLocation {
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface ProfileInterest {
  id: number;
  name: string;
  slug: string;
}

export interface ProfilePreferences {
  minAge: number;
  maxAge: number;
  preferredGender: PreferredGenderType;
  maxDistanceKm: number;
  relationshipGoal: RelationshipGoalType;
}

export interface ProfilePhoto {
  id: number;
  url: string;
  fileName?: string;
  isPrimary: boolean;
  displayOrder: number;
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

export interface Profile {
  userId: number;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: GenderType | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  location: ProfileLocation;
  interests: ProfileInterest[];
  preferences: ProfilePreferences;
  photos: ProfilePhoto[];
  prompts?: UserProfilePrompt[];
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  completionPercentage: number;
  isComplete: boolean;
  completion?: ProfileCompletionResult;
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
  location: ProfileLocation;
  photos: ProfilePhoto[];
  interests: ProfileInterest[];
  prompts: UserProfilePrompt[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  isOnline: boolean | null;
  lastSeenAt: string | null;
  matchStatus: 'none' | 'matched' | 'unmatched';
  conversationId: number | null;
  canMessage: boolean;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  primaryPhoto?: { id: number; fileUrl: string; url: string } | null;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string | null;
  dateOfBirth?: string;
  gender?: GenderType;
  bio?: string | null;
  occupation?: string | null;
  education?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  interests?: number[];
  preferences?: Partial<ProfilePreferences>;
}

export interface PhotoOperationResult {
  photo?: ProfilePhoto;
  photoId?: number;
  primaryPhotoId?: number;
  photos: ProfilePhoto[];
  completionPercentage?: number;
  isComplete?: boolean;
}

export interface PhotoUploadResponse {
  photos: ProfilePhoto[];
  uploadedCount: number;
  completionPercentage: number;
  isComplete: boolean;
}

export interface PhotoReorderRequest {
  photoIds: number[];
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  isVerified: boolean;
  documentUrl: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
}
