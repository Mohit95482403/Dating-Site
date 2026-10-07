export type PlanCode = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';

export type TransactionStatus = 'initiated' | 'completed' | 'failed' | 'refunded';

export type FeatureKey =
  | 'UNLIMITED_LIKES'
  | 'EXTRA_SUPER_LIKES'
  | 'SEE_WHO_LIKED'
  | 'ADVANCED_FILTERS'
  | 'PROFILE_BOOST'
  | 'PRIORITY_DISCOVERY'
  | 'PREMIUM_AI'
  | 'PREMIUM_BADGE'
  | 'ADVANCED_COMPATIBILITY';

export interface SubscriptionPlanItem {
  id: number;
  code: PlanCode;
  name: string;
  tagline: string | null;
  description: string | null;
  priceInr: number;
  durationDays: number;
  currency: string;
  features: string[];
  isActive: boolean;
  highlighted?: boolean;
}

export interface EntitlementLimits {
  dailyLikes: number;
  dailySuperLikes: number;
  dailyAiRequests: number;
  monthlyBoosts: number;
}

export interface EntitlementUsage {
  dailyLikesUsed: number;
  dailySuperLikesUsed: number;
  dailyAiRequestsUsed: number;
  monthlyBoostsUsed: number;
}

export interface UserEntitlements {
  planCode: PlanCode;
  isPremium: boolean;
  badge: 'PRO' | 'VIP' | null;
  features: FeatureKey[];
  limits: EntitlementLimits;
  usage: EntitlementUsage;
  status: SubscriptionStatus | 'none';
  expiresAt: string | null;
  daysRemaining: number;
}

export interface SubscriptionItem {
  id: number;
  userId: number;
  planId: number;
  planCode: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  provider: string;
  providerSubscriptionId?: string;
  startedAt: string;
  expiresAt: string;
  cancelledAt?: string | null;
}

export interface PaymentTransactionItem {
  id: number;
  userId: number;
  subscriptionId?: number;
  planId?: number;
  planName?: string;
  provider: string;
  providerPaymentId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface PaymentCheckoutResult {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  planId?: number;
  planCode?: PlanCode;
  planName?: string;
  plan?: SubscriptionPlanItem;
  keyId?: string;
  isDevSimulation?: boolean;
}

export interface BoostStatusResult {
  isActive: boolean;
  startedAt?: string | null;
  expiresAt?: string | null;
  remainingSeconds: number;
  message?: string;
}

export interface ReceivedLikeCandidate {
  userId: number;
  firstName: string;
  lastName?: string;
  age: number;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  gender?: string;
  occupation?: string;
  isVerified?: boolean;
  likedAt: string;
  isSuperLike: boolean;
}

export interface ReceivedLikesResponse {
  isPremium: boolean;
  count: number;
  likes: ReceivedLikeCandidate[];
  message?: string;
}

export interface AdminSubscriptionAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
  expiredSubscribers: number;
  totalRevenueInr: number;
  monthlyRecurringRevenueInr: number;
  conversionRate: number;
  planBreakdown: {
    free: number;
    premium: number;
    premiumPlus: number;
  };
}

export interface AdminSubscribersListResponse {
  total: number;
  page: number;
  limit: number;
  subscribers: Array<{
    id: number;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    planCode: PlanCode;
    planName: string;
    priceInr: number;
    status: SubscriptionStatus;
    provider: string;
    startedAt: string;
    expiresAt: string;
    cancelledAt: string | null;
  }>;
}

export interface AdminTransactionsListResponse {
  total: number;
  page: number;
  limit: number;
  transactions: Array<{
    id: number;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    planName: string;
    provider: string;
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    createdAt: string;
  }>;
}
