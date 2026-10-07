// Connectly Onboarding Domain Types

import type { GenderType, PreferredGenderType, RelationshipGoal } from './auth';

export interface Interest {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
}

export interface PhotoItem {
  id?: number;
  fileUrl: string;
  fileName?: string;
  isPrimary?: boolean;
  displayOrder?: number;
  isUploading?: boolean;
}

export interface BasicInfoData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderType | string;
}

export interface AboutYouData {
  bio: string;
  occupation: string;
  education: string;
  city: string;
  state: string;
  country: string;
}

export interface PreferencesData {
  minAge: number;
  maxAge: number;
  preferredGender: PreferredGenderType | string;
  maxDistanceKm: number;
  relationshipGoal: RelationshipGoal | string;
}

export interface OnboardingStatusResponse {
  currentStep: number;
  completedSteps: string[];
  completionPercentage: number;
  isComplete: boolean;
  profile: {
    firstName: string;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bio: string | null;
    occupation: string | null;
    education: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  preferences: {
    minAge: number;
    maxAge: number;
    preferredGender: string;
    maxDistanceKm: number;
    relationshipGoal: string;
  };
  interests: number[];
  photos: PhotoItem[];
}

export interface OnboardingCompletionResult {
  isComplete: boolean;
  completionPercentage: number;
}
