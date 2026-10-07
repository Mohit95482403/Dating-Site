// Connectly Day 25: Centralized Anti-Abuse & Risk Detection Service

import { TrustModel } from '../models/trust.model';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class AbuseRiskService {
  // High-frequency in-memory sliding window counters
  private static messageTimestamps: Map<number, number[]> = new Map();
  private static likeTimestamps: Map<number, number[]> = new Map();

  /**
   * Verify if user is allowed to send a message
   */
  public static async assertCanSendMessage(userId: number): Promise<void> {
    const restrictions = await TrustModel.getActiveRestrictions(userId);
    const isLocked = restrictions.some(
      (r) => r.restrictionType === 'TEMPORARILY_LOCKED' || r.restrictionType === 'MESSAGE_RESTRICTED'
    );

    if (isLocked) {
      throw AppError.forbidden(
        'Your messaging privileges are temporarily restricted due to community safety rules.'
      );
    }

    // Rate limit: max 30 messages per 60 seconds
    const now = Date.now();
    const timestamps = this.messageTimestamps.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < 60000);

    if (recent.length >= 30) {
      logger.warn(`[AbuseRiskService] User ${userId} exceeded messaging rate limit`);
      throw AppError.tooManyRequests(
        'You are sending messages too quickly. Please pause for a moment.'
      );
    }

    recent.push(now);
    this.messageTimestamps.set(userId, recent);
  }

  /**
   * Verify if user is allowed to perform likes / swipes
   */
  public static async assertCanSendLike(userId: number): Promise<void> {
    const restrictions = await TrustModel.getActiveRestrictions(userId);
    const isLocked = restrictions.some(
      (r) => r.restrictionType === 'TEMPORARILY_LOCKED' || r.restrictionType === 'LIKE_RESTRICTED'
    );

    if (isLocked) {
      throw AppError.forbidden(
        'Your liking and matching privileges are temporarily restricted.'
      );
    }

    // Rate limit: max 40 likes per minute
    const now = Date.now();
    const timestamps = this.likeTimestamps.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < 60000);

    if (recent.length >= 40) {
      throw AppError.tooManyRequests('You are liking profiles too fast. Please slow down.');
    }

    recent.push(now);
    this.likeTimestamps.set(userId, recent);
  }

  /**
   * Verify if user is allowed to participate in communities
   */
  public static async assertCanJoinCommunity(userId: number): Promise<void> {
    const restrictions = await TrustModel.getActiveRestrictions(userId);
    const isLocked = restrictions.some(
      (r) => r.restrictionType === 'TEMPORARILY_LOCKED' || r.restrictionType === 'COMMUNITY_RESTRICTED'
    );

    if (isLocked) {
      throw AppError.forbidden(
        'Your community interactions are temporarily restricted by moderators.'
      );
    }
  }

  /**
   * Verify if user is allowed to initiate WebRTC calls
   */
  public static async assertCanCall(userId: number): Promise<void> {
    const restrictions = await TrustModel.getActiveRestrictions(userId);
    const isLocked = restrictions.some((r) => r.restrictionType === 'TEMPORARILY_LOCKED');

    if (isLocked) {
      throw AppError.forbidden('Your account is temporarily locked from making calls.');
    }
  }

  /**
   * Evaluate dynamic risk score
   */
  public static async evaluateRisk(userId: number): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    trustScore: number;
    reasons: string[];
  }> {
    const signals = await TrustModel.getUserTrustSignals(userId);
    const reasons: string[] = [];
    let riskPoints = 0;

    if (signals.reportsReceivedCount > 0) {
      riskPoints += signals.reportsReceivedCount * 15;
      reasons.push(`${signals.reportsReceivedCount} user safety reports on file`);
    }

    if (signals.blocksAgainstCount > 3) {
      riskPoints += 20;
      reasons.push('Multiple users have blocked this account');
    }

    if (signals.activeRestrictionsCount > 0) {
      riskPoints += 40;
      reasons.push('Active safety restrictions applied');
    }

    if (!signals.isEmailVerified) {
      riskPoints += 10;
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskPoints >= 50) riskLevel = 'high';
    else if (riskPoints >= 25) riskLevel = 'medium';

    const trustScore = Math.max(0, 100 - riskPoints);

    return {
      riskLevel,
      trustScore,
      reasons,
    };
  }
}
