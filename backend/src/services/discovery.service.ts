import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { DiscoveryModel } from '../models/discovery.model';
import { InteractionModel } from '../models/interaction.model';
import { MatchModel } from '../models/match.model';
import { MatchService } from './match.service';
import { NotificationService } from './notification.service';
import { ProfileModel } from '../models/profile.model';
import EntitlementService from './entitlement.service';
import {
  DiscoveryFilterOptions,
  CandidateProfile,
  InteractionResult,
} from '../types/discovery.types';

export class DiscoveryService {
  /**
   * Fetch candidate profiles for the authenticated user
   */
  public static async getDiscoveryProfiles(
    userId: number,
    options: DiscoveryFilterOptions
  ): Promise<{ profiles: CandidateProfile[]; nextCursor: number | null }> {
    logger.info(`[DiscoveryService] Fetching candidates for userId=${userId} with filters:`, options);

    // Day 21: Check advanced filter entitlements
    const hasAdvFilters = Boolean(options.interests && options.interests.length > 0) || Boolean((options as any).verifiedOnly);
    if (hasAdvFilters) {
      const isEntitled = await EntitlementService.hasFeature(userId, 'ADVANCED_FILTERS');
      if (!isEntitled) {
        throw AppError.forbidden('Advanced discovery filters are a Premium feature. Upgrade to unlock full search filters!');
      }
    }

    const result = await DiscoveryModel.findCandidateProfiles(userId, options);
    logger.info(`[DiscoveryService] Found ${result.profiles.length} candidates for userId=${userId}`);
    return result;
  }

  /**
   * Process a LIKE interaction from authenticated user to candidate
   */
  public static async likeProfile(
    fromUserId: number,
    toUserId: number
  ): Promise<InteractionResult> {
    if (fromUserId === toUserId) {
      throw AppError.badRequest('You cannot like your own profile.');
    }

    // Day 21: Check daily like quota through Entitlement system
    const likeQuota = await EntitlementService.checkAndIncrementUsage(fromUserId, 'likes');
    if (!likeQuota.allowed) {
      throw AppError.forbidden(
        `Daily like limit reached (${likeQuota.limit}/day). Upgrade to Connectly Premium for unlimited likes!`
      );
    }

    const isValid = await InteractionModel.isCandidateValid(toUserId);
    if (!isValid) {
      throw AppError.notFound('Profile not found or is currently not discoverable.');
    }

    const isBlocked = await InteractionModel.isBlocked(fromUserId, toUserId);
    if (isBlocked) {
      throw AppError.forbidden('Unable to interact with this profile.');
    }

    const conn = await pool.getConnection();
    let matched = false;
    let matchId: number | null = null;

    try {
      await conn.beginTransaction();

      // Record the like
      await InteractionModel.recordLike(fromUserId, toUserId, conn);

      // Check if candidate already liked/super-liked current user
      const isReciprocal = await InteractionModel.checkReciprocalLike(fromUserId, toUserId, conn);

      if (isReciprocal) {
        matched = true;
        matchId = await MatchModel.createMatch(fromUserId, toUserId, conn);
        logger.info(`[DiscoveryService] Match created! User ${fromUserId} and User ${toUserId} matched (matchId=${matchId})`);
      }

      await conn.commit();
      logger.info(`[DiscoveryService] User ${fromUserId} liked User ${toUserId} (matched=${matched})`);

      if (matched && matchId) {
        // Trigger real-time notifications via MatchService asynchronously
        MatchService.createMatchIfEligible(fromUserId, toUserId).catch(() => {});
      } else {
        // One-way like: send LIKE_RECEIVED notification to candidate
        ProfileModel.findByUserId(fromUserId)
          .then((senderProfile) => {
            const senderName = senderProfile?.first_name || 'Someone';
            NotificationService.createNotification({
              userId: toUserId,
              actorId: fromUserId,
              type: 'LIKE_RECEIVED',
              title: 'New Like',
              message: `${senderName} liked your profile!`,
              referenceType: 'user',
              referenceId: fromUserId,
            }).catch((err) => {
              logger.warn(`[DiscoveryService] Failed to create like notification:`, err);
            });
          })
          .catch(() => {});
      }

      return {
        liked: true,
        matched,
        matchId,
        match: matchId ? { id: matchId } : null,
        targetUserId: toUserId,
      };
    } catch (error) {
      await conn.rollback();
      logger.error(`[DiscoveryService] Failed to record like from ${fromUserId} to ${toUserId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Process a PASS interaction from authenticated user to candidate
   */
  public static async passProfile(
    fromUserId: number,
    toUserId: number
  ): Promise<{ passed: boolean; targetUserId: number }> {
    if (fromUserId === toUserId) {
      throw AppError.badRequest('You cannot pass your own profile.');
    }

    const isValid = await InteractionModel.isCandidateValid(toUserId);
    if (!isValid) {
      throw AppError.notFound('Profile not found or is currently not discoverable.');
    }

    await InteractionModel.recordPass(fromUserId, toUserId);
    logger.info(`[DiscoveryService] User ${fromUserId} passed on User ${toUserId}`);

    return {
      passed: true,
      targetUserId: toUserId,
    };
  }

  /**
   * Process a SUPER LIKE interaction from authenticated user to candidate
   */
  public static async superLikeProfile(
    fromUserId: number,
    toUserId: number
  ): Promise<InteractionResult> {
    if (fromUserId === toUserId) {
      throw AppError.badRequest('You cannot super-like your own profile.');
    }

    // Day 21: Check daily Super Like quota through Entitlement system
    const superLikeQuota = await EntitlementService.checkAndIncrementUsage(fromUserId, 'super_likes');
    if (!superLikeQuota.allowed) {
      throw AppError.forbidden(
        `Daily Super Like limit reached (${superLikeQuota.limit}/day). Upgrade to Premium for more Super Likes!`
      );
    }

    const isValid = await InteractionModel.isCandidateValid(toUserId);
    if (!isValid) {
      throw AppError.notFound('Profile not found or is currently not discoverable.');
    }

    const isBlocked = await InteractionModel.isBlocked(fromUserId, toUserId);
    if (isBlocked) {
      throw AppError.forbidden('Unable to interact with this profile.');
    }

    const conn = await pool.getConnection();
    let matched = false;
    let matchId: number | null = null;

    try {
      await conn.beginTransaction();

      // Record the super like
      await InteractionModel.recordSuperLike(fromUserId, toUserId, conn);

      // Check if candidate already liked/super-liked current user
      const isReciprocal = await InteractionModel.checkReciprocalLike(fromUserId, toUserId, conn);

      if (isReciprocal) {
        matched = true;
        matchId = await MatchModel.createMatch(fromUserId, toUserId, conn);
        logger.info(`[DiscoveryService] Super Like match created! User ${fromUserId} and User ${toUserId} matched (matchId=${matchId})`);
      }

      await conn.commit();
      logger.info(`[DiscoveryService] User ${fromUserId} super-liked User ${toUserId} (matched=${matched})`);

      if (matched && matchId) {
        // Trigger real-time notifications via MatchService asynchronously
        MatchService.createMatchIfEligible(fromUserId, toUserId).catch(() => {});
      } else {
        // One-way super like: send SUPERLIKE_RECEIVED notification to candidate
        ProfileModel.findByUserId(fromUserId)
          .then((senderProfile) => {
            const senderName = senderProfile?.first_name || 'Someone';
            NotificationService.createNotification({
              userId: toUserId,
              actorId: fromUserId,
              type: 'SUPERLIKE_RECEIVED',
              title: 'New Super Like',
              message: `${senderName} sent you a Super Like ⭐!`,
              referenceType: 'user',
              referenceId: fromUserId,
            }).catch((err) => {
              logger.warn(`[DiscoveryService] Failed to create super like notification:`, err);
            });
          })
          .catch(() => {});
      }

      return {
        superLiked: true,
        matched,
        matchId,
        match: matchId ? { id: matchId } : null,
        targetUserId: toUserId,
      };
    } catch (error) {
      await conn.rollback();
      logger.error(`[DiscoveryService] Failed to record super like from ${fromUserId} to ${toUserId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }
}

export default DiscoveryService;
