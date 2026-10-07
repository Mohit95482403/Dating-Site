// Connectly AI Service
// Core business logic for Smart Compatibility, Profile Insights, and Conversation Assistant

import { pool, query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { ProfileModel } from '../models/profile.model';
import { MatchModel } from '../models/match.model';
import { ConversationModel } from '../models/conversation.model';
import { MessageModel } from '../models/message.model';
import { BlockModel } from '../models/block.model';
import { UserModel } from '../models/user.model';
import { ProfileService } from './profile.service';
import { PromptModel } from '../models/prompt.model';
import { AIProvider } from './ai/aiProvider';
import EntitlementService from './entitlement.service';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import { logger } from '../utils/logger';
import type {
  CompatibilityResult,
  CompatibilityTier,
  CategoryScores,
  ProfileInsightsResult,
  ProfileRating,
  BioStyle,
  BioImprovementResult,
  ConversationSuggestionsResult,
  ConversationStarterResult,
  AIFeatureType,
  AIAnalyticsSummary,
} from '../types/ai.types';

export class AIService {
  /**
   * Helper: Log AI telemetry to MySQL
   */
  private static async logUsage(
    userId: number,
    feature: AIFeatureType,
    status: 'success' | 'fallback' | 'error',
    latencyMs = 0,
    tokensUsed = 0
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO ai_usage_logs (user_id, feature, status, latency_ms, tokens_used)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, feature, status, latencyMs, tokensUsed]
      );
    } catch (err) {
      logger.warn('[AIService] Failed to write AI usage telemetry:', err);
    }
  }

  /**
   * 1. Smart Match Compatibility Engine
   */
  public static async getMatchCompatibility(
    currentUserId: number,
    targetUserId: number,
    matchId?: number
  ): Promise<CompatibilityResult> {
    const startTime = Date.now();

    if (!targetUserId || isNaN(targetUserId)) {
      throw new AppError('Valid targetUserId is required', HttpStatus.BAD_REQUEST);
    }

    if (currentUserId === targetUserId) {
      throw new AppError('Cannot calculate compatibility with yourself', HttpStatus.BAD_REQUEST);
    }

    // 1. Verify target user exists and is active
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser || targetUser.status !== 'active') {
      throw new AppError('Target user is not available', HttpStatus.NOT_FOUND);
    }

    // 2. Verify neither user blocked the other
    const isBlocked = await BlockModel.isBlocked(currentUserId, targetUserId);
    if (isBlocked) {
      throw new AppError('Unable to view compatibility for this member', HttpStatus.FORBIDDEN);
    }

    // 3. Verify match exists OR user is viewing a valid match
    const existingMatch = await MatchModel.findMatchBetween(currentUserId, targetUserId);
    if (matchId) {
      const match = await MatchModel.findMatchById(matchId, currentUserId);
      if (!match) {
        throw new AppError('You do not have permission to view compatibility for this match', HttpStatus.FORBIDDEN);
      }
    }

    // 4. Fetch User A & User B profile data
    const [profileA, profileB, prefA, prefB, interestsA, interestsB, photosA, photosB] =
      await Promise.all([
        ProfileModel.findByUserId(currentUserId),
        ProfileModel.findByUserId(targetUserId),
        ProfileModel.getPreferences(currentUserId),
        ProfileModel.getPreferences(targetUserId),
        ProfileModel.getUserInterests(currentUserId),
        ProfileModel.getUserInterests(targetUserId),
        ProfileModel.getPhotos(currentUserId),
        ProfileModel.getPhotos(targetUserId),
      ]);

    if (!profileA || !profileB) {
      throw new AppError('Both user profiles must exist to calculate compatibility', HttpStatus.NOT_FOUND);
    }

    const userAName = profileA.first_name || 'You';
    const userBName = profileB.first_name || 'Connection';

    const namesA = interestsA.map((i) => i.name);
    const namesB = interestsB.map((i) => i.name);
    const sharedInterests = namesA.filter((name) =>
      namesB.some((bName) => bName.toLowerCase() === name.toLowerCase())
    );

    // --- Deterministic Signal Computations ---
    const reasons: string[] = [];

    // Signal 1: Shared Interests (Weight: 35%)
    let sharedScore = 30; // baseline
    if (sharedInterests.length >= 4) {
      sharedScore = 100;
      reasons.push(`You share ${sharedInterests.length} common interests: ${sharedInterests.slice(0, 3).join(', ')}`);
    } else if (sharedInterests.length === 3) {
      sharedScore = 90;
      reasons.push(`You share 3 common interests: ${sharedInterests.join(', ')}`);
    } else if (sharedInterests.length === 2) {
      sharedScore = 78;
      reasons.push(`You both enjoy ${sharedInterests[0]} and ${sharedInterests[1]}`);
    } else if (sharedInterests.length === 1) {
      sharedScore = 60;
      reasons.push(`You both have a shared passion for ${sharedInterests[0]}`);
    } else {
      reasons.push(`Your unique interest sets offer exciting room to discover new hobbies together`);
    }

    // Signal 2: Preference & Intentions Match (Weight: 25%)
    let prefScore = 50;
    const calculateAge = (dobString?: string | Date | null) => {
      if (!dobString) return 25;
      const dob = new Date(dobString);
      const diffMs = Date.now() - dob.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    };

    const ageA = calculateAge(profileA.date_of_birth);
    const ageB = calculateAge(profileB.date_of_birth);

    let ageMatchA = true;
    let ageMatchB = true;
    if (prefA?.min_age && prefA?.max_age) {
      ageMatchA = ageB >= prefA.min_age && ageB <= prefA.max_age;
    }
    if (prefB?.min_age && prefB?.max_age) {
      ageMatchB = ageA >= prefB.min_age && ageA <= prefB.max_age;
    }

    if (ageMatchA && ageMatchB) {
      prefScore += 25;
      reasons.push('Your age preferences are mutually aligned');
    }

    if (
      prefA?.relationship_goal &&
      prefB?.relationship_goal &&
      prefA.relationship_goal === prefB.relationship_goal &&
      prefA.relationship_goal !== 'not_sure'
    ) {
      prefScore += 25;
      const formattedGoal = prefA.relationship_goal.replace(/_/g, ' ');
      reasons.push(`You are both looking for ${formattedGoal}`);
    } else {
      prefScore += 10;
    }
    prefScore = Math.min(100, prefScore);

    // Signal 3: Location Compatibility (Weight: 15%)
    let locationScore = 60;
    if (
      profileA.location_city &&
      profileB.location_city &&
      profileA.location_city.toLowerCase() === profileB.location_city.toLowerCase()
    ) {
      locationScore = 100;
      reasons.push(`You are both located in ${profileA.location_city}`);
    } else if (
      profileA.location_country &&
      profileB.location_country &&
      profileA.location_country.toLowerCase() === profileB.location_country.toLowerCase()
    ) {
      locationScore = 80;
      reasons.push(`You both reside in ${profileA.location_country}`);
    }

    // Signal 4: Profile Richness (Weight: 15%)
    let richnessScore = 50;
    const hasPhotosBoth = photosA.length >= 1 && photosB.length >= 1;
    const hasBioBoth = (profileA.bio?.length || 0) >= 20 && (profileB.bio?.length || 0) >= 20;
    if (hasPhotosBoth && hasBioBoth) {
      richnessScore = 95;
      reasons.push('Both profiles are detailed and expressive');
    } else if (hasPhotosBoth || hasBioBoth) {
      richnessScore = 75;
    }

    // Signal 5: Trust & Verification (Weight: 10%)
    let trustScore = 70;
    if (profileA.is_verified && profileB.is_verified) {
      trustScore = 100;
      reasons.push('Both accounts are photo-verified for authentic connections');
    } else if (profileB.is_verified) {
      trustScore = 85;
      reasons.push(`${userBName} has verified their identity badge`);
    }

    // --- Final Weighted Compatibility Calculation ---
    const rawScore =
      sharedScore * 0.35 +
      prefScore * 0.25 +
      locationScore * 0.15 +
      richnessScore * 0.15 +
      trustScore * 0.10;

    const overallScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    let compatibilityTier: CompatibilityTier = 'Moderate';
    if (overallScore >= 85) compatibilityTier = 'Exceptional';
    else if (overallScore >= 72) compatibilityTier = 'High';
    else if (overallScore >= 58) compatibilityTier = 'Good';
    else if (overallScore >= 45) compatibilityTier = 'Moderate';
    else compatibilityTier = 'Growing';

    const categoryScores: CategoryScores = {
      sharedInterests: sharedScore,
      preferences: prefScore,
      location: locationScore,
      profileRichness: richnessScore,
    };

    // AI Natural Language Explanation
    const aiExplanation = await AIProvider.generateCompatibilityExplanation({
      userAName,
      userBName,
      score: overallScore,
      sharedInterests,
      reasons,
    });

    const latencyMs = Date.now() - startTime;
    await this.logUsage(currentUserId, 'compatibility', 'success', latencyMs);

    return {
      targetUserId,
      targetName: userBName,
      matchId: existingMatch ? existingMatch.id : matchId || null,
      overallScore,
      compatibilityTier,
      categoryScores,
      sharedInterests,
      userAInterests: namesA,
      userBInterests: namesB,
      reasons,
      aiExplanation,
    };
  }

  /**
   * 2. Profile AI Insights & Optimization Recommendations
   */
  public static async getProfileInsights(userId: number): Promise<ProfileInsightsResult> {
    const startTime = Date.now();

    // Day 21: Check daily AI request quota through Entitlement system
    const aiQuota = await EntitlementService.checkAndIncrementUsage(userId, 'ai_requests');
    if (!aiQuota.allowed) {
      throw new AppError(
        `Daily AI quota reached (${aiQuota.limit} requests/day). Upgrade to Connectly Premium for higher AI limits!`,
        HttpStatus.FORBIDDEN
      );
    }

    const [profile, interests, photos, prompts, completion] = await Promise.all([
      ProfileModel.findByUserId(userId),
      ProfileModel.getUserInterests(userId),
      ProfileModel.getPhotos(userId),
      PromptModel.getUserPrompts(userId),
      ProfileService.calculateProfileCompletion(userId),
    ]);

    if (!profile) {
      throw new AppError('Profile not found', HttpStatus.NOT_FOUND);
    }

    const strengths: string[] = [];
    const suggestions: string[] = [];
    const recommendedActions: string[] = [];

    // Analyze Photos
    if (photos.length >= 3) {
      strengths.push(`Excellent photo variety (${photos.length} photos showcasing your lifestyle)`);
    } else if (photos.length >= 1) {
      strengths.push('Profile has a primary photo');
      suggestions.push('Add 2-3 more photos showing diverse hobbies or social settings');
      recommendedActions.push('Upload more photos');
    } else {
      suggestions.push('Upload high-quality profile photos to increase match visibility by 4x');
      recommendedActions.push('Upload primary photo');
    }

    // Analyze Bio
    const bioLen = (profile.bio || '').trim().length;
    if (bioLen >= 80) {
      strengths.push('Detailed, engaging bio that gives matches an authentic impression');
    } else if (bioLen >= 20) {
      strengths.push('Bio covers your core personality');
      suggestions.push('Use the AI Bio Improver to add a hook or conversation starter');
      recommendedActions.push('Refine bio');
    } else {
      suggestions.push('Write a bio (at least 2 sentences) describing your passions and vibe');
      recommendedActions.push('Add a bio');
    }

    // Analyze Interests
    if (interests.length >= 5) {
      strengths.push(`Rich selection of ${interests.length} diverse interests for high matching precision`);
    } else if (interests.length >= 3) {
      strengths.push(`Good set of ${interests.length} interests added`);
      suggestions.push('Add 2 more interests to unlock matches with similar tastes');
      recommendedActions.push('Add interests');
    } else {
      suggestions.push('Select at least 3-5 interests to power the smart compatibility engine');
      recommendedActions.push('Pick interests');
    }

    // Analyze Prompts
    if (prompts.length >= 2) {
      strengths.push(`Great personality showcase with ${prompts.length} answered profile prompts`);
    } else {
      suggestions.push('Answer 1-2 interactive profile prompts to give matches easy icebreakers');
      recommendedActions.push('Answer profile prompts');
    }

    // Analyze Verification
    if (profile.is_verified) {
      strengths.push('Verified Profile badge active (boosts trust & discovery rank)');
    } else {
      suggestions.push('Complete photo verification to earn the blue verified trust badge');
      recommendedActions.push('Get verified');
    }

    // Overall Rating
    let overallRating: ProfileRating = 'Good';
    if (completion.percentage >= 85 && profile.is_verified) {
      overallRating = 'Exceptional';
    } else if (completion.percentage >= 70) {
      overallRating = 'Strong';
    } else if (completion.percentage >= 45) {
      overallRating = 'Good';
    } else {
      overallRating = 'Needs Attention';
    }

    const aiSummary =
      overallRating === 'Exceptional'
        ? `Your profile is in top-tier shape! You have strong photo representation, clear passions, and verified authenticity that will attract quality connections.`
        : overallRating === 'Strong'
        ? `You have a compelling profile with great fundamentals. Addressing a few minor suggestions will maximize your visibility and incoming match rate.`
        : `Your profile has a solid foundation with plenty of room to shine. Adding more photos and expanding your bio will significantly boost your compatibility scores.`;

    const latencyMs = Date.now() - startTime;
    await this.logUsage(userId, 'profile_insights', 'success', latencyMs);

    return {
      overallRating,
      completionPercentage: completion.percentage,
      strengths,
      suggestions,
      recommendedActions,
      aiSummary,
    };
  }

  /**
   * 3. Bio Improvement Assistant
   */
  public static async improveBio(
    userId: number,
    inputBio?: string,
    style: BioStyle = 'friendly'
  ): Promise<BioImprovementResult> {
    const startTime = Date.now();

    // Day 21: Check daily AI request quota through Entitlement system
    const aiQuota = await EntitlementService.checkAndIncrementUsage(userId, 'ai_requests');
    if (!aiQuota.allowed) {
      throw new AppError(
        `Daily AI quota reached (${aiQuota.limit} requests/day). Upgrade to Connectly Premium for higher AI limits!`,
        HttpStatus.FORBIDDEN
      );
    }

    const [profile, interests] = await Promise.all([
      ProfileModel.findByUserId(userId),
      ProfileModel.getUserInterests(userId),
    ]);

    if (!profile) {
      throw new AppError('Profile not found', HttpStatus.NOT_FOUND);
    }

    const currentBio = inputBio !== undefined ? inputBio : profile.bio || '';
    const validStyles: BioStyle[] = [
      'friendly',
      'confident',
      'funny',
      'short_and_sweet',
      'creative',
      'professional',
    ];
    const selectedStyle: BioStyle = validStyles.includes(style) ? style : 'friendly';

    const result = await AIProvider.generateBioSuggestion({
      currentBio,
      style: selectedStyle,
      firstName: profile.first_name,
      occupation: profile.occupation,
      city: profile.location_city,
      interests: interests.map((i) => i.name),
    });

    const latencyMs = Date.now() - startTime;
    await this.logUsage(userId, 'bio_improvement', 'success', latencyMs);

    return {
      originalBio: currentBio,
      suggestedBio: result.suggestedBio,
      style: selectedStyle,
      keyHighlights: result.highlights,
      explanation: result.explanation,
    };
  }

  /**
   * 4. AI Conversation Assistant (Reply Suggestions)
   */
  public static async getConversationSuggestions(
    userId: number,
    conversationId: number
  ): Promise<ConversationSuggestionsResult> {
    const startTime = Date.now();

    if (!conversationId || isNaN(conversationId)) {
      throw new AppError('Valid conversationId is required', HttpStatus.BAD_REQUEST);
    }

    // 1. Verify user is authorized member of this conversation
    const isMember = await ConversationModel.isMember(conversationId, userId);
    if (!isMember) {
      throw new AppError('You do not have permission to access this conversation', HttpStatus.FORBIDDEN);
    }

    // Day 21: Check daily AI request quota through Entitlement system
    const aiQuota = await EntitlementService.checkAndIncrementUsage(userId, 'ai_requests');
    if (!aiQuota.allowed) {
      throw new AppError(
        `Daily AI quota reached (${aiQuota.limit} requests/day). Upgrade to Connectly Premium for higher AI limits!`,
        HttpStatus.FORBIDDEN
      );
    }

    // 2. Fetch conversation details & partner
    const access = await ConversationModel.verifyUserAccess(conversationId, userId);
    const partnerId = access.partnerUserId;
    if (!partnerId) {
      throw new AppError('Partner not found for this conversation', HttpStatus.NOT_FOUND);
    }

    const [partnerProfile, recentMsgs, sharedInterests] = await Promise.all([
      ProfileModel.findByUserId(partnerId),
      MessageModel.findByConversation(conversationId, userId, { limit: 10 }),
      this.getSharedInterestsBetween(userId, partnerId),
    ]);

    const partnerName = partnerProfile?.first_name || 'Partner';

    // 3. Format sanitized messages
    const formattedMessages = (recentMsgs.messages || []).map((m) => ({
      senderName: m.isFromMe ? 'You' : partnerName,
      text: m.content,
      isFromMe: m.isFromMe,
    }));

    // 4. Generate suggestions
    const result = await AIProvider.generateReplySuggestions({
      partnerName,
      recentMessages: formattedMessages,
      sharedInterests,
    });

    const latencyMs = Date.now() - startTime;
    await this.logUsage(userId, 'conversation_suggestions', 'success', latencyMs);

    return {
      conversationId,
      partnerName,
      suggestions: result.suggestions,
      topicsDetected: result.topicsDetected,
    };
  }

  /**
   * 5. AI Conversation Starters for New Connections
   */
  public static async getConversationStarter(
    userId: number,
    identifier: { conversationId?: number; matchId?: number }
  ): Promise<ConversationStarterResult> {
    const startTime = Date.now();
    let targetUserId = 0;

    if (identifier.conversationId) {
      const isMember = await ConversationModel.isMember(identifier.conversationId, userId);
      if (!isMember) {
        throw new AppError('You do not have access to this conversation', HttpStatus.FORBIDDEN);
      }
      const access = await ConversationModel.verifyUserAccess(identifier.conversationId, userId);
      targetUserId = access.partnerUserId || 0;
    } else if (identifier.matchId) {
      const match = await MatchModel.findMatchById(identifier.matchId, userId);
      if (!match) {
        throw new AppError('You do not have access to this match', HttpStatus.FORBIDDEN);
      }
      targetUserId = match.user.id;
    }

    if (!targetUserId) {
      throw new AppError('Target connection could not be resolved', HttpStatus.BAD_REQUEST);
    }

    const [partnerProfile, partnerInterests, sharedInterests] = await Promise.all([
      ProfileModel.findByUserId(targetUserId),
      ProfileModel.getUserInterests(targetUserId),
      this.getSharedInterestsBetween(userId, targetUserId),
    ]);

    const partnerName = partnerProfile?.first_name || 'Connection';

    const result = await AIProvider.generateConversationStarters({
      partnerName,
      sharedInterests,
      partnerInterests: partnerInterests.map((i) => i.name),
      partnerBio: partnerProfile?.bio,
    });

    const latencyMs = Date.now() - startTime;
    await this.logUsage(userId, 'conversation_starter', 'success', latencyMs);

    return {
      targetUserId,
      partnerName,
      starters: result.starters,
      sharedInterests: result.sharedInterests,
    };
  }

  /**
   * Helper: Get shared interest names between two users
   */
  private static async getSharedInterestsBetween(userA: number, userB: number): Promise<string[]> {
    const [intsA, intsB] = await Promise.all([
      ProfileModel.getUserInterests(userA),
      ProfileModel.getUserInterests(userB),
    ]);
    const namesA = intsA.map((i) => i.name);
    return namesA.filter((name) => intsB.some((b) => b.name.toLowerCase() === name.toLowerCase()));
  }

  /**
   * 6. AI Analytics Summary for Admin Panel
   */
  public static async getAIAnalyticsSummary(): Promise<AIAnalyticsSummary> {
    try {
      const [totalRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM ai_usage_logs'
      );
      const [todayRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM ai_usage_logs WHERE created_at >= CURDATE()'
      );
      const [weekRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM ai_usage_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      );
      const [featureRows] = await pool.query<RowDataPacket[]>(
        'SELECT feature, COUNT(*) as count FROM ai_usage_logs GROUP BY feature'
      );
      const [statusRows] = await pool.query<RowDataPacket[]>(
        'SELECT status, COUNT(*) as count FROM ai_usage_logs GROUP BY status'
      );

      const breakdown: Record<string, number> = {};
      let mostUsedFeature = 'None';
      let maxCount = 0;

      for (const r of featureRows) {
        breakdown[r.feature] = Number(r.count);
        if (Number(r.count) > maxCount) {
          maxCount = Number(r.count);
          mostUsedFeature = r.feature;
        }
      }

      const statusSummary = { success: 0, fallback: 0, error: 0 };
      for (const r of statusRows) {
        if (r.status in statusSummary) {
          statusSummary[r.status as 'success' | 'fallback' | 'error'] = Number(r.count);
        }
      }

      return {
        totalRequests: Number(totalRows[0]?.total || 0),
        requestsToday: Number(todayRows[0]?.total || 0),
        requestsThisWeek: Number(weekRows[0]?.total || 0),
        mostUsedFeature,
        breakdown,
        statusSummary,
      };
    } catch {
      return {
        totalRequests: 0,
        requestsToday: 0,
        requestsThisWeek: 0,
        mostUsedFeature: 'None',
        breakdown: {},
        statusSummary: { success: 0, fallback: 0, error: 0 },
      };
    }
  }

  /**
   * Day 26: AI-Assisted Personalized Discovery Suggestions & Themes
   * Follows strict data minimization: only non-sensitive interest names are passed.
   * Deterministic fallback guarantees 100% availability.
   */
  public static async getPersonalizedDiscoverySuggestions(userId: number): Promise<{
    themes: string[];
    summary: string;
    suggestedActivities: Array<{ title: string; category: string; description: string }>;
  }> {
    const startTime = Date.now();

    // 1. Fetch user interest labels
    let interests: string[] = [];
    try {
      const rows = await query<RowDataPacket[]>(
        `SELECT i.name 
         FROM user_interest_scores uis
         JOIN interests i ON uis.interest_id = i.id
         WHERE uis.user_id = ?
         ORDER BY uis.score DESC
         LIMIT 6`,
        [userId]
      );
      interests = rows.map((r) => String(r.name));
    } catch {
      // fallback
    }

    if (interests.length === 0) {
      interests = ['Travel', 'Photography', 'Music', 'Fitness', 'Technology'];
    }

    // Deterministic fallback structure
    const fallbackResponse = {
      themes: [
        `${interests[0] || 'Active'} & ${interests[1] || 'Creative'} Exploration`,
        `Local ${interests[2] || 'Social'} Community Meetups`,
        `Skill Sharing & Group Activities`,
      ],
      summary: `Discover kindred spirits and active communities centered around ${interests.slice(0, 3).join(', ')}.`,
      suggestedActivities: [
        {
          title: `Weekend ${interests[0] || 'Outdoor'} Adventure`,
          category: interests[0] || 'Lifestyle',
          description: `Connect with members who love ${interests[0] || 'exploring'} for collaborative events and meetups.`,
        },
        {
          title: `${interests[1] || 'Creative'} Enthusiasts Showcase`,
          category: interests[1] || 'Arts',
          description: `Share tips, gear, and favorite spots with fellow ${interests[1] || 'community'} creators.`,
        },
        {
          title: `Beginner-Friendly ${interests[2] || 'Social'} Group`,
          category: interests[2] || 'Community',
          description: `Expand your circle in relaxed, low-pressure community discussions and regular catch-ups.`,
        },
      ],
    };

    // 2. Check if user enabled AI data processing
    try {
      const [settings] = await query<RowDataPacket[]>(
        `SELECT ai_data_processing FROM user_settings WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (settings && settings.ai_data_processing === 0) {
        return fallbackResponse;
      }
    } catch {
      // ignore
    }

    // 3. AI enhancement with fallback
    try {
      const systemPrompt = `You are Connectly AI Discovery Engine. You generate inspiring, positive community exploration suggestions based strictly on interest tags. Return valid JSON only with keys: themes (array of 3 short strings), summary (one sentence, max 15 words), suggestedActivities (array of 3 objects with title, category, description).`;
      const userPrompt = `Given the member interests: ${interests.join(', ')}, generate discovery themes and 3 suggested activities.`;

      const aiRes = await AIProvider.completeJson<{
        themes: string[];
        summary: string;
        suggestedActivities: Array<{ title: string; category: string; description: string }>;
      }>(systemPrompt, userPrompt, 500);

      const latencyMs = Date.now() - startTime;

      if (aiRes && Array.isArray(aiRes.themes) && aiRes.summary && Array.isArray(aiRes.suggestedActivities)) {
        await this.logUsage(userId, 'personalization_discovery', 'success', latencyMs, 250);
        return {
          themes: aiRes.themes.slice(0, 3),
          summary: aiRes.summary,
          suggestedActivities: aiRes.suggestedActivities.slice(0, 3),
        };
      }
    } catch (err) {
      logger.debug('[AIService] getPersonalizedDiscoverySuggestions AI fallback:', err);
    }

    const latencyMs = Date.now() - startTime;
    await this.logUsage(userId, 'personalization_discovery', 'fallback', latencyMs, 0);
    return fallbackResponse;
  }
}

export default AIService;

