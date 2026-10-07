import { Router } from 'express';
import healthRoutes from './healthRoutes';
import testRoutes from './test.routes';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import discoveryRoutes from './discovery.routes';
import likeRoutes from './like.routes';
import matchRoutes from './match.routes';
import conversationRoutes from './conversation.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import blockRoutes from './block.routes';
import reportRoutes from './report.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';
import onboardingRoutes from './onboarding.routes';
import interestRoutes from './interest.routes';
import settingsRoutes from './settings.routes';
import accountRoutes from './account.routes';
import sessionRoutes from './session.routes';
import callRoutes from './call.routes';
import aiRoutes from './ai.routes';
import subscriptionRoutes from './subscription.routes';
import feedRoutes from './feed.routes';
import exploreRoutes from './explore.routes';
import communityRoutes from './community.routes';
import trustRoutes from './trust.routes';
import personalizationRoutes from './personalization.routes';
import supportRoutes from './support.routes';

const router = Router();

// Core infrastructure routes
router.use('/health', healthRoutes);
router.use('/test', testRoutes);

// Modular domain routers
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/interests', interestRoutes);
router.use('/profile', profileRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/discover', discoveryRoutes);
router.use('/likes', likeRoutes);
router.use('/matches', matchRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/calls', callRoutes);
router.use('/ai', aiRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/account', accountRoutes);
router.use('/blocks', blockRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reports', reportRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/feed', feedRoutes);
router.use('/explore', exploreRoutes);
router.use('/search', exploreRoutes);
router.use('/communities', communityRoutes);
router.use('/trust', trustRoutes);
router.use('/personalization', personalizationRoutes);
router.use('/home', personalizationRoutes);
router.use('/behavior', personalizationRoutes);
router.use('/', feedRoutes);

export default router;

