import { api } from './api';
import type {
  SubscriptionPlanItem,
  UserEntitlements,
  SubscriptionItem,
  PaymentTransactionItem,
  PaymentCheckoutResult,
  BoostStatusResult,
  ReceivedLikesResponse,
  AdminSubscriptionAnalytics,
  AdminSubscribersListResponse,
  AdminTransactionsListResponse,
} from '../types/subscription';

export class SubscriptionService {
  /**
   * Fetch all active subscription tiers available on Connectly
   */
  public static async getActivePlans(): Promise<SubscriptionPlanItem[]> {
    const response = await api.get('/subscriptions/plans');
    return response.data?.data || [];
  }

  /**
   * Fetch authenticated user's current subscription and effective entitlements
   */
  public static async getCurrentSubscription(): Promise<{
    subscription: SubscriptionItem | null;
    entitlements: UserEntitlements;
  }> {
    const response = await api.get('/subscriptions/current');
    return response.data?.data || { subscription: null, entitlements: null };
  }

  /**
   * Initialize a checkout order with server-side validation
   */
  public static async createCheckoutOrder(planId: number): Promise<PaymentCheckoutResult> {
    const response = await api.post('/subscriptions/checkout', { planId });
    return response.data?.data;
  }

  /**
   * Submit cryptographic payment verification payload to activate subscription
   */
  public static async verifyPayment(payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{ subscription: SubscriptionItem; entitlements: UserEntitlements }> {
    const response = await api.post('/subscriptions/verify', payload);
    return response.data?.data;
  }

  /**
   * Cancel subscription (retaining benefits until period end)
   */
  public static async cancelSubscription(): Promise<{
    cancelled: boolean;
    expiresAt: string;
    message: string;
  }> {
    const response = await api.post('/subscriptions/cancel');
    return response.data?.data;
  }

  /**
   * Activate a 30-minute profile visibility boost
   */
  public static async activateBoost(): Promise<BoostStatusResult> {
    const response = await api.post('/subscriptions/boost');
    return response.data?.data;
  }

  /**
   * Check active boost countdown and status
   */
  public static async getBoostStatus(): Promise<BoostStatusResult> {
    const response = await api.get('/subscriptions/boost/status');
    return response.data?.data || { isActive: false, remainingSeconds: 0 };
  }

  /**
   * Fetch authenticated user's verified billing & transaction history
   */
  public static async getPaymentHistory(): Promise<PaymentTransactionItem[]> {
    const response = await api.get('/subscriptions/history');
    return response.data?.data?.transactions || [];
  }

  /**
   * Fetch profiles of users who liked the authenticated user (Premium feature)
   */
  public static async getReceivedLikes(): Promise<ReceivedLikesResponse> {
    const response = await api.get('/likes/received');
    return response.data?.data;
  }

  // --- Admin API Methods ---

  /**
   * Fetch platform-wide subscription metrics & MRR analytics
   */
  public static async getAdminSubscriptionAnalytics(): Promise<AdminSubscriptionAnalytics> {
    const response = await api.get('/subscriptions/admin/analytics');
    return response.data?.data;
  }

  /**
   * Fetch paginated list of subscribers with plan details
   */
  public static async getAdminSubscribers(
    page = 1,
    limit = 20,
    status?: string
  ): Promise<AdminSubscribersListResponse> {
    const params: any = { page, limit };
    if (status && status !== 'all') params.status = status;
    const response = await api.get('/subscriptions/admin/subscribers', { params });
    return response.data?.data;
  }

  /**
   * Fetch paginated list of payment transactions with status
   */
  public static async getAdminTransactions(
    page = 1,
    limit = 20
  ): Promise<AdminTransactionsListResponse> {
    const response = await api.get('/subscriptions/admin/transactions', { params: { page, limit } });
    return response.data?.data;
  }

  /**
   * Update plan configuration (Admin only)
   */
  public static async updateAdminPlan(
    planId: number,
    data: { name?: string; tagline?: string; priceInr?: number; isActive?: boolean }
  ): Promise<SubscriptionPlanItem> {
    const response = await api.put(`/subscriptions/admin/plans/${planId}`, data);
    return response.data?.data;
  }
}

export default SubscriptionService;
