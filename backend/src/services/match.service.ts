import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { MatchModel } from '../models/match.model';
import { InteractionModel } from '../models/interaction.model';
import { ProfileModel } from '../models/profile.model';
import { PhotoModel } from '../models/photo.model';
import { notifyMatchCreated, emitToUser } from '../sockets/socket';
import { UserMatchItem, MatchRow } from '../types/matching.types';
import { PoolConnection } from 'mysql2/promise';
import { NotificationService } from './notification.service';

export class MatchService {
  /**
   * Evaluate reciprocal like condition and create match transactionally if eligible
   */
  public static async createMatchIfEligible(
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<{ matched: boolean; matchId: number | null }> {
    if (userA === userB) {
      throw AppError.badRequest('A user cannot match with themselves.');
    }

    const isReciprocal = await InteractionModel.checkReciprocalLike(userA, userB, conn);
    if (!isReciprocal) {
      return { matched: false, matchId: null };
    }

    // Reciprocal positive interaction confirmed: create match
    const matchId = await MatchModel.createMatch(userA, userB, conn);
    logger.info(`[MatchService] Created match id=${matchId} between user ${userA} and user ${userB}`);

    // Trigger real-time notifications asynchronously without blocking the transaction
    this.sendMatchNotifications(matchId, userA, userB).catch((err) => {
      logger.warn(`[MatchService] Error broadcasting match notification:`, err);
    });

    return { matched: true, matchId };
  }

  /**
   * Helper to retrieve minimal user card profiles and notify connected sockets
   */
  private static async sendMatchNotifications(
    matchId: number,
    userAId: number,
    userBId: number
  ): Promise<void> {
    try {
      const [profileA, profileB, photosA, photosB] = await Promise.all([
        ProfileModel.findByUserId(userAId),
        ProfileModel.findByUserId(userBId),
        PhotoModel.findUserPhotosOrdered(userAId),
        PhotoModel.findUserPhotosOrdered(userBId),
      ]);

      const infoA = {
        id: userAId,
        firstName: profileA?.first_name || 'Member',
        location: {
          city: profileA?.location_city || null,
          state: profileA?.location_state || null,
        },
        primaryPhoto: photosA[0] ? { id: photosA[0].id, fileUrl: photosA[0].file_url } : null,
        avatarUrl: photosA[0] ? photosA[0].file_url : null,
        photoUrl: photosA[0] ? photosA[0].file_url : null,
      };

      const infoB = {
        id: userBId,
        firstName: profileB?.first_name || 'Member',
        location: {
          city: profileB?.location_city || null,
          state: profileB?.location_state || null,
        },
        primaryPhoto: photosB[0] ? { id: photosB[0].id, fileUrl: photosB[0].file_url } : null,
        avatarUrl: photosB[0] ? photosB[0].file_url : null,
        photoUrl: photosB[0] ? photosB[0].file_url : null,
      };

      notifyMatchCreated(matchId, userAId, userBId, infoA, infoB);

      // Persist MATCH_CREATED notifications for both participants and deliver via Socket.IO
      await Promise.all([
        NotificationService.createNotification({
          userId: userAId,
          actorId: userBId,
          type: 'MATCH_CREATED',
          title: "It's a Match! 🎉",
          message: `You and ${infoB.firstName} matched! Start a conversation now.`,
          referenceType: 'match',
          referenceId: matchId,
        }).catch((err) => logger.warn('[MatchService] Failed to notify userA of match:', err)),
        NotificationService.createNotification({
          userId: userBId,
          actorId: userAId,
          type: 'MATCH_CREATED',
          title: "It's a Match! 🎉",
          message: `You and ${infoA.firstName} matched! Start a conversation now.`,
          referenceType: 'match',
          referenceId: matchId,
        }).catch((err) => logger.warn('[MatchService] Failed to notify userB of match:', err)),
      ]);
    } catch (err) {
      logger.warn('[MatchService] Failed to send real-time match notification:', err);
    }
  }

  /**
   * Fetch all active matches for the authenticated user
   */
  public static async getUserMatches(userId: number): Promise<{ matches: UserMatchItem[]; count: number }> {
    logger.info(`[MatchService] Fetching matches for user ${userId}`);
    const matches = await MatchModel.findUserMatches(userId);
    return {
      matches,
      count: matches.length,
    };
  }

  /**
   * Fetch detailed match by ID, ensuring user authorization
   */
  public static async getMatchById(userId: number, matchId: number): Promise<UserMatchItem> {
    if (isNaN(matchId) || matchId <= 0) {
      throw AppError.badRequest('Invalid match ID.');
    }

    const match = await MatchModel.findMatchById(matchId, userId);
    if (!match) {
      throw AppError.notFound('Match not found or access denied.');
    }

    return match;
  }

  /**
   * Check if an active match exists between two users
   */
  public static async checkMatch(userA: number, userB: number): Promise<MatchRow | null> {
    return MatchModel.findMatchBetween(userA, userB);
  }

  /**
   * Get the active match count for a user
   */
  public static async getUserMatchCount(userId: number): Promise<number> {
    return MatchModel.countUserMatches(userId);
  }

  /**
   * Safely unmatch two connected users
   */
  public static async removeMatch(userId: number, matchId: number): Promise<boolean> {
    if (isNaN(matchId) || matchId <= 0) {
      throw AppError.badRequest('Invalid match ID.');
    }

    // Verify user belongs to the match
    const existing = await MatchModel.findMatchById(matchId, userId);
    if (!existing) {
      throw AppError.notFound('Match not found or you are not authorized to remove this match.');
    }

    const partnerUserId = existing.user.id;
    const removed = await MatchModel.deleteMatch(matchId, userId);

    if (removed) {
      logger.info(`[MatchService] User ${userId} unmatched match ${matchId} with user ${partnerUserId}`);
      // Notify partner in real-time if connected
      emitToUser(partnerUserId, 'match:unmatched', {
        matchId,
        unmatchedBy: userId,
      });
    }

    return removed;
  }
}

export default MatchService;
