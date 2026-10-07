// Connectly Day 21 — Subscription, Monetization & Entitlements Types

export type PlanCode = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';

export type TransactionStatus = 'success' | 'pending' | 'failed' | 'refunded';

export type PaymentProviderType = 'dev_simulated' | 'razorpay' | 'stripe' | 'system';

export type FeatureKey =
  | 'BASIC_MATCHING'
  | 'TEXT_CHAT'
  | 'AUDIO_VIDEO_CALLS'
  | 'UNLIMITED_LIKES'
  | 'SEE_WHO_LIKED'
  | 'ADVANCED_FILTERS'
  | 'PROFILE_BOOST'
  | 'PREMIUM_AI'
  | 'PREMIUM_BADGE'
  | 'ADVANCED_COMPATIBILITY'
  | 'PRIORITY_DISCOVERY'
  | 'UNLIMITED_AI'
  | 'CREATE_MORE_COMMUNITIES'
  | 'COMMUNITY_BOOST';

export interface PlanLimits {
  dailyLikes: number; // -1 = unlimited
  dailySuperLikes: number;
  dailyAiRequests: number; // -1 = unlimited
  monthlyBoosts: number;
}

export interface SubscriptionPlanItem {
  id: number;
  code: PlanCode;
  name: string;
  description: string | null;
  priceInr: number;
  currency: string;
  durationDays: number;
  features: string[];
  limits: PlanLimits;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveBoostInfo {
  isActive: boolean;
  startedAt?: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
  multiplier: number;
  message?: string;
}

export interface FeatureUsageSummary {
  likesUsed: number;
  likesRemaining: number;
  superLikesUsed: number;
  superLikesRemaining: number;
  aiRequestsUsed: number;
  aiRequestsRemaining: number;
  boostsUsedThisMonth: number;
  boostsRemaining: number;
}

export interface UserEntitlements {
  planCode: PlanCode;
  planName: string;
  isPremium: boolean;
  badge: 'PRO' | 'VIP' | null;
  status: SubscriptionStatus;
  startedAt: string | null;
  expiresAt: string | null;
  features: string[];
  limits: PlanLimits;
  usage: FeatureUsageSummary;
  activeBoost: ActiveBoostInfo;
}

export interface SubscriptionItem {
  id: number;
  userId: number;
  planId: number;
  planCode: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  provider: string;
  providerSubscriptionId?: string | null;
  providerOrderId?: string | null;
  startedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionItem {
  id: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  subscriptionId?: number | null;
  planId: number;
  planCode?: PlanCode;
  planName: string;
  provider: string;
  providerPaymentId: string;
  providerOrderId?: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  metadata?: any;
  createdAt: string;
}

export interface PaymentCheckoutResult {
  orderId: string;
  amount: number;
  currency: string;
  planId: number;
  planCode: PlanCode;
  planName: string;
  provider: PaymentProviderType;
  signatureToken: string;
  keyId?: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface AdminSubscriptionAnalytics {
  totalRevenueInr: number;
  monthlyRecurringRevenue: number;
  totalSubscribers: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
  expiredSubscribers: number;
  conversionRate: number;
  planDistribution: Record<string, number>;
}
