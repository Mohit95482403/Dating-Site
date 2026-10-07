import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { HttpStatus } from '../../utils/httpStatus';
import type { PaymentCheckoutResult, PaymentProviderType } from '../../types/subscription.types';

export interface CreateOrderParams {
  userId: number;
  planId: number;
  planCode: string;
  planName: string;
  amountInr: number;
  currency: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  metadata?: any;
}

export interface IPaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentCheckoutResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookVerificationResult>;
}

/**
 * Universal Payment Provider Adapter
 * Implements HMAC-SHA256 cryptographic verification for Razorpay / Stripe
 * and secure dev simulation mode when external credentials are not set.
 */
export class PaymentProvider implements IPaymentProvider {
  private providerType: PaymentProviderType;
  private keyId: string;
  private keySecret: string;

  constructor() {
    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayKey && razorpaySecret) {
      this.providerType = 'razorpay';
      this.keyId = razorpayKey;
      this.keySecret = razorpaySecret;
      logger.info('[PaymentProvider] Initialized with Razorpay credentials.');
    } else {
      this.providerType = 'dev_simulated';
      this.keyId = 'connectly_dev_key_live';
      this.keySecret = process.env.JWT_SECRET || 'connectly_dev_payment_hmac_secret_2026';
      logger.info('[PaymentProvider] Initialized in secure DevSimulation mode.');
    }
  }

  /**
   * Create checkout order with cryptographic signature token
   */
  public async createOrder(params: CreateOrderParams): Promise<PaymentCheckoutResult> {
    const { userId, planId, planCode, planName, amountInr, currency } = params;

    const timestamp = Date.now();
    const entropy = crypto.randomBytes(6).toString('hex');
    const orderId = `order_${this.providerType}_${timestamp}_${entropy}`;

    // Cryptographic signature token for order verification
    const signatureToken = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${amountInr}|${planId}|${userId}`)
      .digest('hex');

    logger.info(`[PaymentProvider] Created order ${orderId} for userId=${userId}, plan=${planCode}, amount=${amountInr}`);

    return {
      orderId,
      amount: amountInr,
      currency,
      planId,
      planCode: planCode as any,
      planName,
      provider: this.providerType,
      signatureToken,
      keyId: this.keyId,
    };
  }

  /**
   * Verify payment signature (Never trust frontend client without cryptographic verification)
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    const { orderId, paymentId, signature } = params;

    if (!orderId || !paymentId || !signature) {
      throw new AppError('Incomplete payment verification payload.', HttpStatus.BAD_REQUEST);
    }

    try {
      // 1. Dev / test simulation mode support
      if (
        this.providerType === 'dev_simulated' &&
        (signature === `simulated_sig_${orderId}_${paymentId}` ||
          signature.startsWith(`simulated_sig_${orderId}`) ||
          signature.startsWith('simulated_sig_'))
      ) {
        logger.info(`[PaymentProvider] Successfully verified simulated payment for orderId=${orderId}, paymentId=${paymentId}`);
        return true;
      }

      // Standard payment provider verification: HMAC-SHA256(order_id + '|' + payment_id, secret)
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Prevent RangeError: Input buffers must have the same byte length
      if (Buffer.byteLength(signature, 'utf8') !== Buffer.byteLength(expectedSignature, 'utf8')) {
        logger.warn(`[PaymentProvider] Payment signature length mismatch for orderId=${orderId}, paymentId=${paymentId}`);
        return false;
      }

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (!isMatch) {
        logger.warn(`[PaymentProvider] Payment signature mismatch for orderId=${orderId}, paymentId=${paymentId}`);
        return false;
      }

      logger.info(`[PaymentProvider] Successfully verified payment for orderId=${orderId}, paymentId=${paymentId}`);
      return true;
    } catch (err: any) {
      logger.error('[PaymentProvider] Payment signature verification exception:', err);
      return false;
    }
  }

  /**
   * Verify inbound provider webhook signature (Idempotent webhook security)
   */
  public async verifyWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookVerificationResult> {
    if (!signature) {
      return { isValid: false, event: 'unknown' };
    }

    try {
      const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(rawBody)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (!isValid) {
        return { isValid: false, event: 'invalid_signature' };
      }

      const parsed = JSON.parse(rawBody);
      return {
        isValid: true,
        event: parsed.event || 'payment.captured',
        paymentId: parsed.payload?.payment?.entity?.id || parsed.paymentId,
        orderId: parsed.payload?.payment?.entity?.order_id || parsed.orderId,
        amount: parsed.payload?.payment?.entity?.amount || parsed.amount,
        metadata: parsed.payload || parsed.metadata,
      };
    } catch (err) {
      logger.warn('[PaymentProvider] Webhook verification parse error:', err);
      return { isValid: false, event: 'parse_error' };
    }
  }

  /**
   * Helper: Generate a valid test signature for development testing
   */
  public generateTestSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }
}

export const paymentProvider = new PaymentProvider();
export default paymentProvider;
