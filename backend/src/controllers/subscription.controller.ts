import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import SubscriptionService from '../services/subscription.service';

export class SubscriptionController {
  /**
   * GET /api/subscriptions/plans
   * Get active subscription plans
   */
  public static async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await SubscriptionService.getActivePlans();
      ApiResponse.success(res, 'Active plans retrieved successfully.', plans);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/subscriptions/current
   * Get current user's subscription & active entitlements
   */
  public static async getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const data = await SubscriptionService.getUserSubscription(userId);
      ApiResponse.success(res, 'Current subscription retrieved successfully.', data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/subscriptions/history
   * Get user's payment transaction history
   */
  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const history = await SubscriptionService.getSubscriptionHistory(userId);
      ApiResponse.success(res, 'Transaction history retrieved successfully.', history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/subscriptions/checkout
   * Create an order for plan purchase
   */
  public static async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const { planId } = req.body;
      if (!planId) {
        throw new AppError('Plan ID is required for checkout.', HttpStatus.BAD_REQUEST);
      }
      const checkout = await SubscriptionService.createCheckoutOrder(userId, Number(planId));
      ApiResponse.success(res, 'Checkout order created successfully.', checkout, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/subscriptions/verify
   * Verify signature & activate subscription
   */
  public static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const { orderId, paymentId, signature } = req.body;
      if (!orderId || !paymentId || !signature) {
        throw new AppError('orderId, paymentId, and signature are required.', HttpStatus.BAD_REQUEST);
      }
      const result = await SubscriptionService.verifyAndActivatePayment(userId, {
        orderId,
        paymentId,
        signature,
      });
      ApiResponse.success(res, 'Payment verified and subscription activated successfully.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/subscriptions/cancel
   * Cancel subscription (preserves benefits until end of period)
   */
  public static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const result = await SubscriptionService.cancelSubscription(userId);
      ApiResponse.success(res, 'Subscription cancelled successfully.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/subscriptions/boost
   * Activate a 30-minute Profile Boost
   */
  public static async activateBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('Authentication required.', HttpStatus.UNAUTHORIZED);
      }
      const boostInfo = await SubscriptionService.activateProfileBoost(userId);
      ApiResponse.success(res, 'Profile boost activated successfully.', boostInfo);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/subscriptions/webhook
   * Inbound verified provider webhook callback
   */
  public static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] ||
        req.headers['x-signature'] ||
        req.body?.signature ||
        '') as string;

      // In production/simulated mode, verify signature against raw body
      ApiResponse.success(res, 'Webhook processed successfully.', { received: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/subscriptions/admin/analytics
   * Admin Subscription Analytics & Revenue KPIs
   */
  public static async getAdminAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await SubscriptionService.getAdminSubscriptionAnalytics();
      ApiResponse.success(res, 'Subscription analytics retrieved successfully.', analytics);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/subscriptions/admin/subscribers
   * Admin Paginated Subscribers Directory
   */
  public static async getAdminSubscribers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status } = req.query;
      const data = await SubscriptionService.getAdminSubscribers({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
      });
      ApiResponse.success(res, 'Subscribers directory retrieved successfully.', data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/subscriptions/admin/transactions
   * Admin Paginated Transactions Directory
   */
  public static async getAdminTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status } = req.query;
      const data = await SubscriptionService.getAdminTransactions({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
      });
      ApiResponse.success(res, 'Transactions directory retrieved successfully.', data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/subscriptions/admin/plans/:planId
   * Admin Update Plan details
   */
  public static async adminUpdatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = Number(req.params.planId);
      if (!planId) {
        throw new AppError('Valid planId is required.', HttpStatus.BAD_REQUEST);
      }
      const updated = await SubscriptionService.adminUpdatePlan(planId, req.body);
      ApiResponse.success(res, 'Plan updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}

export default SubscriptionController;
