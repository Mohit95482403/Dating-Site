import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import SubscriptionController from '../controllers/subscription.controller';

const router = Router();

// Public / Authenticated: Plans
router.get('/plans', asyncHandler(SubscriptionController.getPlans as any));

// Webhook endpoint (unauthenticated callback from provider)
router.post('/webhook', asyncHandler(SubscriptionController.handleWebhook as any));

// User Authenticated Endpoints
router.use(requireAuth);

router.get('/current', asyncHandler(SubscriptionController.getCurrentSubscription as any));
router.get('/history', asyncHandler(SubscriptionController.getHistory as any));
router.post('/checkout', asyncHandler(SubscriptionController.createCheckout as any));
router.post('/verify', asyncHandler(SubscriptionController.verifyPayment as any));
router.post('/cancel', asyncHandler(SubscriptionController.cancelSubscription as any));
router.get('/boost/status', asyncHandler(SubscriptionController.getBoostStatus as any));
router.get('/boost', asyncHandler(SubscriptionController.getBoostStatus as any));
router.post('/boost', asyncHandler(SubscriptionController.activateBoost as any));

// Admin Protected Endpoints
router.get('/admin/analytics', requireRole('admin'), asyncHandler(SubscriptionController.getAdminAnalytics as any));
router.get('/admin/subscribers', requireRole('admin'), asyncHandler(SubscriptionController.getAdminSubscribers as any));
router.get('/admin/transactions', requireRole('admin'), asyncHandler(SubscriptionController.getAdminTransactions as any));
router.put('/admin/plans/:planId', requireRole('admin'), asyncHandler(SubscriptionController.adminUpdatePlan as any));

export default router;
