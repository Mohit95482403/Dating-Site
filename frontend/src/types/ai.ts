// Connectly Day 20 AI Domain Types for Frontend

export type CompatibilityTier = 'Exceptional' | 'High' | 'Good' | 'Moderate' | 'Growing';

export interface CategoryScores {
  sharedInterests: number; // 0-100
  preferences: number;     // 0-100
  location: number;        // 0-100
  profileRichness: number; // 0-100
}

export interface CompatibilityResult {
  targetUserId: number;
  targetName: string;
  matchId?: number | null;
  overallScore: number; // 0-100
  compatibilityTier: CompatibilityTier;
  categoryScores: CategoryScores;
  sharedInterests: string[];
  userAInterests: string[];
  userBInterests: string[];
  reasons: string[];
  aiExplanation: string;
}

export type ProfileRating = 'Exceptional' | 'Strong' | 'Good' | 'Needs Attention';

export interface ProfileInsightsResult {
  overallRating: ProfileRating;
  completionPercentage: number;
  strengths: string[];
  suggestions: string[];
  recommendedActions: string[];
  aiSummary: string;
}

export type BioStyle =
  | 'friendly'
  | 'confident'
  | 'funny'
  | 'short_and_sweet'
  | 'creative'
  | 'professional';

export interface BioImprovementInput {
  bio?: string;
  style?: BioStyle;
}

export interface BioImprovementResult {
  originalBio: string;
  suggestedBio: string;
  style: BioStyle;
  keyHighlights: string[];
  explanation: string;
}

export interface ConversationSuggestionsResult {
  conversationId: number;
  partnerName: string;
  suggestions: string[];
  topicsDetected: string[];
}

export interface ConversationStarterResult {
  targetUserId: number;
  partnerName: string;
  starters: string[];
  sharedInterests: string[];
}

export interface AIAnalyticsSummary {
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  mostUsedFeature: string;
  breakdown: Record<string, number>;
  statusSummary: {
    success: number;
    fallback: number;
    error: number;
  };
}
