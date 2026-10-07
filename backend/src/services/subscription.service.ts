import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import paymentProvider from './payments/paymentProvider';
import EntitlementService from './entitlement.service';
import { NotificationService } from './notification.service';
import type {
  SubscriptionPlanItem,
  SubscriptionItem,
  PaymentTransactionItem,
  PaymentCheckoutResult,
  VerifyPaymentInput,
  AdminSubscriptionAnalytics,
  ActiveBoostInfo,
  UserEntitlements,
} from '../types/subscription.types';

export class SubscriptionService {
  /**
   * 1. Get all subscription plans
   */
  public static async getAllPlans(includeInactive = false): Promise<SubscriptionPlanItem[]> {
    const where = includeInactive ? '' : 'WHERE is_active = TRUE';
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, name, description, price_inr, currency, duration_days,
              features, limits, is_active, display_order
       FROM subscription_plans
       ${where}
       ORDER BY display_order ASC`
    );

    return rows.map((r) => ({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      description: r.description,
      priceInr: Number(r.price_inr),
      currency: r.currency,
      durationDays: Number(r.duration_days),
      features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features || [],
      limits: typeof r.limits === 'string' ? JSON.parse(r.limits) : r.limits || {},
      isActive: Boolean(r.is_active),
      displayOrder: Number(r.display_order),
    }));
  }

  /**
   * 1b. Get all active subscription plans
   */
  public static async getActivePlans(): Promise<SubscriptionPlanItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, name, description, price_inr, currency, duration_days,
              features, limits, is_active, display_order
       FROM subscription_plans
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );

    return rows.map((r) => ({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      description: r.description,
      priceInr: Number(r.price_inr),
      currency: r.currency,
      durationDays: Number(r.duration_days),
      features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features || [],
      limits: typeof r.limits === 'string' ? JSON.parse(r.limits) : r.limits || {},
      isActive: Boolean(r.is_active),
      displayOrder: Number(r.display_order),
    }));
  }

  /**
   * 2. Get user's current subscription + complete entitlements
   */
  public static async getUserSubscription(userId: number): Promise<{
    subscription: SubscriptionItem | null;
    entitlements: UserEntitlements;
  }> {
    const entitlements = await EntitlementService.getUserEntitlements(userId);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, s.user_id, s.plan_id, s.status, s.provider,
              s.provider_subscription_id, s.provider_order_id,
              s.started_at, s.expires_at, s.cancelled_at, s.created_at, s.updated_at,
              p.code as plan_code, p.name as plan_name
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = ?
       ORDER BY (s.status = 'active') DESC, s.id DESC
       LIMIT 1`,
      [userId]
    );

    let subscription: SubscriptionItem | null = null;
    if (rows.length > 0) {
      const r = rows[0];
      subscription = {
        id: Number(r.id),
        userId: Number(r.user_id),
        planId: Number(r.plan_id),
        planCode: r.plan_code,
        planName: r.plan_name,
        status: r.status,
        provider: r.provider,
        providerSubscriptionId: r.provider_subscription_id,
        providerOrderId: r.provider_order_id,
        startedAt: new Date(r.started_at).toISOString(),
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        cancelledAt: r.cancelled_at ? new Date(r.cancelled_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    }

    return { subscription, entitlements };
  }

  /**
   * 3. Get user's payment transaction history
   */
  public static async getSubscriptionHistory(userId: number): Promise<PaymentTransactionItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT pt.id, pt.user_id, pt.subscription_id, pt.plan_id, pt.provider,
              pt.provider_payment_id, pt.provider_order_id, pt.amount, pt.currency,
              pt.status, pt.metadata, pt.created_at,
              p.code as plan_code, p.name as plan_name
       FROM payment_transactions pt
       JOIN subscription_plans p ON pt.plan_id = p.id
       WHERE pt.user_id = ?
       ORDER BY pt.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      subscriptionId: r.subscription_id ? Number(r.subscription_id) : null,
      planId: Number(r.plan_id),
      planCode: r.plan_code,
      planName: r.plan_name,
      provider: r.provider,
      providerPaymentId: r.provider_payment_id,
      providerOrderId: r.provider_order_id,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * 4. Create checkout order via PaymentProvider
   */
  public static async createCheckoutOrder(
    userId: number,
    planId: number
  ): Promise<PaymentCheckoutResult> {
    const [planRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, name, price_inr, currency, is_active FROM subscription_plans WHERE id = ? LIMIT 1`,
      [planId]
    );

    if (planRows.length === 0 || !planRows[0].is_active) {
      throw new AppError('Selected subscription plan is invalid or inactive.', HttpStatus.BAD_REQUEST);
    }

    const plan = planRows[0];
    if (plan.price_inr === 0) {
      throw new AppError('Free plan does not require payment checkout.', HttpStatus.BAD_REQUEST);
    }

    return paymentProvider.createOrder({
      userId,
      planId: Number(plan.id),
      planCode: plan.code,
      planName: plan.name,
      amountInr: Number(plan.price_inr),
      currency: plan.currency || 'INR',
    });
  }

  /**
   * 5. Verify payment signature & activate subscription atomically
   */
  public static async verifyAndActivatePayment(
    userId: number,
    input: VerifyPaymentInput
  ): Promise<{
    subscription: SubscriptionItem;
    entitlements: UserEntitlements;
  }> {
    const { orderId, paymentId, signature } = input;

    // A. Verify cryptographic signature
    const isSignatureValid = await paymentProvider.verifyPayment({
      orderId,
      paymentId,
      signature,
    });

    if (!isSignatureValid) {
      throw new AppError('Payment signature verification failed. Untrusted transaction rejected.', HttpStatus.BAD_REQUEST);
    }

    // B. Check for idempotency (duplicate payment webhook/request)
    const [existingTx] = await pool.query<RowDataPacket[]>(
      `SELECT id, subscription_id, status FROM payment_transactions WHERE provider_payment_id = ? LIMIT 1`,
      [paymentId]
    );

    if (existingTx.length > 0 && existingTx[0].status === 'success') {
      logger.info(`[SubscriptionService] Duplicate verification for paymentId=${paymentId}; returning active state.`);
      return this.getUserSubscription(userId) as any;
    }

    // C. Resolve plan info from orderId or active plans
    // Expected order format: order_provider_timestamp_entropy or determine target plan
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, name, price_inr, duration_days FROM subscription_plans WHERE price_inr > 0 AND is_active = TRUE ORDER BY id ASC`
    );

    // Default to Premium plan or Premium Plus based on context
    const plan = plans.find((p) => p.code === 'PREMIUM_PLUS' && orderId.includes('premium_plus')) || plans[0];
    if (!plan) {
      throw new AppError('Unable to match subscription plan for checkout order.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // D. Expire / supersede existing active subscriptions
      await conn.query(
        `UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
        [userId]
      );

      // E. Insert new active subscription with 30-day duration
      const durationDays = Number(plan.duration_days) || 30;
      const [subResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO subscriptions (user_id, plan_id, status, provider, provider_subscription_id, provider_order_id, started_at, expires_at)
         VALUES (?, ?, 'active', 'dev_simulated', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [userId, plan.id, paymentId, orderId, durationDays]
      );

      const subscriptionId = subResult.insertId;

      // F. Record successful payment transaction
      await conn.query(
        `INSERT INTO payment_transactions (user_id, subscription_id, plan_id, provider, provider_payment_id, provider_order_id, amount, currency, status, signature)
         VALUES (?, ?, ?, 'dev_simulated', ?, ?, ?, 'INR', 'success', ?)
         ON DUPLICATE KEY UPDATE status = 'success', subscription_id = VALUES(subscription_id)`,
        [userId, subscriptionId, plan.id, paymentId, orderId, plan.price_inr, signature]
      );

      await conn.commit();
      logger.info(`[SubscriptionService] Activated ${plan.code} subscription for userId=${userId} (subId=${subscriptionId})`);

      // G. Notify user in real-time
      NotificationService.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Premium Activated! 🎉',
        message: `Welcome to ${plan.name}! You now have unlimited likes, AI matching insights, and premium features.`,
        referenceType: 'subscription',
        referenceId: subscriptionId,
      }).catch((err) => logger.warn('[SubscriptionService] Notification error:', err));

      const updated = await this.getUserSubscription(userId);
      return updated as { subscription: SubscriptionItem; entitlements: UserEntitlements };
    } catch (err) {
      await conn.rollback();
      logger.error(`[SubscriptionService] Subscription activation failed for user ${userId}:`, err);
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * 6. Cancel subscription with end-of-period benefit preservation
   */
  public static async cancelSubscription(userId: number): Promise<{
    cancelled: boolean;
    expiresAt: string | null;
  }> {
    const [subRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, status, expires_at 
       FROM subscriptions 
       WHERE user_id = ? AND status = 'active' 
       ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (subRows.length === 0) {
      throw new AppError('No active paid subscription found to cancel.', HttpStatus.NOT_FOUND);
    }

    const sub = subRows[0];
    await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE id = ?`,
      [sub.id]
    );

    const expiresAt = sub.expires_at ? new Date(sub.expires_at).toISOString() : null;

    NotificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Subscription Cancelled',
      message: `Your subscription has been cancelled. Your premium entitlements will remain active until ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'the end of your period'}.`,
      referenceType: 'subscription',
      referenceId: sub.id,
    }).catch(() => {});

    return { cancelled: true, expiresAt };
  }

  /**
   * 7. Activate 30-minute Profile Boost
   */
  public static async activateProfileBoost(userId: number): Promise<ActiveBoostInfo> {
    const entitlements = await EntitlementService.getUserEntitlements(userId);

    // Check if boost is already active
    if (entitlements.activeBoost.isActive) {
      throw new AppError(
        `You already have an active profile boost expiring in ${Math.ceil(entitlements.activeBoost.remainingSeconds / 60)} minutes.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Verify entitlement & remaining monthly boost allowance
    const check = await EntitlementService.checkAndIncrementUsage(userId, 'boosts');
    if (!check.allowed) {
      throw new AppError(
        'You have no profile boosts remaining this month. Upgrade to Premium for monthly boosts!',
        HttpStatus.FORBIDDEN
      );
    }

    const multiplier = entitlements.planCode === 'PREMIUM_PLUS' ? 3.0 : 2.5;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO profile_boosts (user_id, started_at, expires_at, status, multiplier)
       VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), 'active', ?)`,
      [userId, multiplier]
    );

    logger.info(`[SubscriptionService] Activated profile boost for userId=${userId} (boostId=${result.insertId})`);

    NotificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Profile Boost Activated! ⚡',
      message: 'Your profile visibility has been multiplied in discovery for the next 30 minutes!',
      referenceType: 'boost',
      referenceId: result.insertId,
    }).catch(() => {});

    const refreshed = await EntitlementService.getUserEntitlements(userId);
    return refreshed.activeBoost;
  }

  /**
   * 8. Admin: Subscription & Revenue Analytics Telemetry
   */
  public static async getAdminSubscriptionAnalytics(): Promise<AdminSubscriptionAnalytics> {
    const [revRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue FROM payment_transactions WHERE status = 'success'`
    );
    const [subCounts] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(*) as total_subscriptions,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
         SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_subscriptions
       FROM subscriptions`
    );

    const [userCounts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_users FROM users WHERE role = 'user'`
    );

    const [planDistRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.code, COUNT(s.id) as count 
       FROM subscription_plans p 
       LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status = 'active' 
       GROUP BY p.code`
    );

    const totalRevenueInr = Number(revRows[0]?.total_revenue || 0);
    const activeSubscribers = Number(subCounts[0]?.active_subscriptions || 0);
    const totalSubscribers = Number(subCounts[0]?.total_subscriptions || 0);
    const cancelledSubscribers = Number(subCounts[0]?.cancelled_subscriptions || 0);
    const expiredSubscribers = Number(subCounts[0]?.expired_subscriptions || 0);
    const totalUsers = Number(userCounts[0]?.total_users || 1);

    const monthlyRecurringRevenue = activeSubscribers * 499; // MRR projection based on average paid tier
    const conversionRate = Number(((activeSubscribers / Math.max(1, totalUsers)) * 100).toFixed(2));

    const planDistribution: Record<string, number> = {};
    for (const r of planDistRows) {
      planDistribution[r.code] = Number(r.count || 0);
    }

    return {
      totalRevenueInr,
      monthlyRecurringRevenue,
      totalSubscribers,
      activeSubscribers,
      cancelledSubscribers,
      expiredSubscribers,
      conversionRate,
      planDistribution,
    };
  }

  /**
   * 9. Admin: Paginated Subscribers Directory
   */
  public static async getAdminSubscribers(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    planCode?: string;
  }): Promise<{ subscribers: any[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(50, Math.max(1, Number(options.limit || 15)));
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (options.status) {
      where += ' AND s.status = ?';
      params.push(options.status);
    }

    if (options.planCode) {
      where += ' AND sp.code = ?';
      params.push(options.planCode);
    }

    if (options.search) {
      where += ' AND (u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       ${where}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, s.user_id, s.status, s.started_at, s.expires_at, s.cancelled_at, s.provider,
              u.email, p.first_name, p.last_name,
              sp.code as plan_code, sp.name as plan_name, sp.price_inr
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       ${where}
       ORDER BY s.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      subscribers: rows.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        email: r.email,
        userName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'User',
        planCode: r.plan_code,
        planName: r.plan_name,
        priceInr: Number(r.price_inr),
        status: r.status,
        startedAt: r.started_at,
        expiresAt: r.expires_at,
        cancelledAt: r.cancelled_at,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 10. Admin: Paginated Transactions Directory
   */
  public static async getAdminTransactions(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ transactions: PaymentTransactionItem[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(50, Math.max(1, Number(options.limit || 15)));
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (options.status) {
      where += ' AND pt.status = ?';
      params.push(options.status);
    }

    if (options.search) {
      where += ' AND (u.email LIKE ? OR pt.provider_payment_id LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term);
    }

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM payment_transactions pt
       JOIN users u ON pt.user_id = u.id
       ${where}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT pt.id, pt.user_id, pt.subscription_id, pt.plan_id, pt.provider,
              pt.provider_payment_id, pt.provider_order_id, pt.amount, pt.currency,
              pt.status, pt.created_at,
              u.email, p.first_name, p.last_name,
              sp.code as plan_code, sp.name as plan_name
       FROM payment_transactions pt
       JOIN users u ON pt.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       JOIN subscription_plans sp ON pt.plan_id = sp.id
       ${where}
       ORDER BY pt.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      transactions: rows.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        userEmail: r.email,
        userName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'User',
        subscriptionId: r.subscription_id ? Number(r.subscription_id) : null,
        planId: Number(r.plan_id),
        planCode: r.plan_code,
        planName: r.plan_name,
        provider: r.provider,
        providerPaymentId: r.provider_payment_id,
        providerOrderId: r.provider_order_id,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 11. Admin: Update subscription plan details
   */
  public static async adminUpdatePlan(
    planId: number,
    updates: {
      name?: string;
      description?: string;
      priceInr?: number;
      isActive?: boolean;
      features?: string[];
      limits?: any;
    }
  ): Promise<SubscriptionPlanItem> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.priceInr !== undefined) {
      fields.push('price_inr = ?');
      values.push(updates.priceInr);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }
    if (updates.features !== undefined) {
      fields.push('features = ?');
      values.push(JSON.stringify(updates.features));
    }
    if (updates.limits !== undefined) {
      fields.push('limits = ?');
      values.push(JSON.stringify(updates.limits));
    }

    if (fields.length > 0) {
      values.push(planId);
      await pool.query(`UPDATE subscription_plans SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM subscription_plans WHERE id = ? LIMIT 1`,
      [planId]
    );

    if (rows.length === 0) {
      throw new AppError('Plan not found.', HttpStatus.NOT_FOUND);
    }

    const r = rows[0];
    return {
      id: Number(r.id),
      code: r.code,
      name: r.name,
      description: r.description,
      priceInr: Number(r.price_inr),
      currency: r.currency,
      durationDays: Number(r.duration_days),
      features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features,
      limits: typeof r.limits === 'string' ? JSON.parse(r.limits) : r.limits,
      isActive: Boolean(r.is_active),
      displayOrder: Number(r.display_order),
    };
  }

  /**
   * 12. Admin: Refund a payment transaction safely with subscription status reconciliation
   */
  public static async adminRefundTransaction(
    adminId: number,
    transactionId: number,
    reason: string
  ): Promise<{ transactionId: number; amount: number; currency: string; status: string }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [txRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM payment_transactions WHERE id = ? FOR UPDATE',
        [transactionId]
      );

      if (txRows.length === 0) {
        throw new AppError('Payment transaction not found.', HttpStatus.NOT_FOUND);
      }

      const tx = txRows[0];
      if (tx.status === 'refunded') {
        throw new AppError('This transaction has already been refunded.', HttpStatus.BAD_REQUEST);
      }

      // Mark transaction refunded
      await conn.query(
        "UPDATE payment_transactions SET status = 'refunded' WHERE id = ?",
        [transactionId]
      );

      // If linked to a subscription, cancel it and revoke premium
      if (tx.subscription_id) {
        await conn.query(
          "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?",
          [tx.subscription_id]
        );

        // Check if user has any other active subscriptions
        const [activeSubs] = await conn.query<RowDataPacket[]>(
          "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > NOW() AND id != ?",
          [tx.user_id, tx.subscription_id]
        );

        if (activeSubs.length === 0) {
          await conn.query('UPDATE users SET is_premium = FALSE WHERE id = ?', [tx.user_id]);
        }
      }

      // Audit log
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'PAYMENT_REFUNDED', 'payment_transaction', ?, ?)`,
        [adminId, transactionId, `Refunded ${tx.currency} ${tx.amount} to user #${tx.user_id}. Reason: ${reason}`]
      );

      await conn.commit();

      return {
        transactionId,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: 'refunded',
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default SubscriptionService;
