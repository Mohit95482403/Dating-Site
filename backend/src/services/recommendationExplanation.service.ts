// Connectly Day 26: Recommendation Explanation Service
// Generates clear, human-understandable, and privacy-safe explanations for recommended items
// Converts scoring signals into transparent reasons without leaking private/sensitive telemetry

import { RecommendationExplanation, RecommendationType } from '../types/personalization.types';
import { AIProvider } from './ai/aiProvider';
import { logger } from '../utils/logger';

export class RecommendationExplanationService {
  /**
   * Deterministically generate human-readable explanations based on ranking factors
   */
  public static generateExplanation(
    type: RecommendationType,
    item: any,
    userInterestNames: string[] = []
  ): RecommendationExplanation {
    switch (type) {
      case 'PEOPLE':
        return this.explainPerson(item, userInterestNames);
      case 'COMMUNITY':
        return this.explainCommunity(item, userInterestNames);
      case 'EVENT':
        return this.explainEvent(item, userInterestNames);
      case 'POST':
        return this.explainPost(item, userInterestNames);
      case 'TRENDING':
        return this.explainTrending(item, userInterestNames);
      default:
        return {
          primary: 'Recommended for you based on platform discovery',
          confidence: 0.7,
          factors: {},
        };
    }
  }

  private static explainPerson(item: any, userInterestNames: string[]): RecommendationExplanation {
    const rawInterests = item.interests_str ? String(item.interests_str).split(',').map((s) => s.trim()) : [];
    const sharedInterests = rawInterests.filter((i) =>
      userInterestNames.some((ui) => ui.toLowerCase() === i.toLowerCase())
    );

    let primary = 'Recommended based on shared lifestyle interests';
    const details: string[] = [];

    if (sharedInterests.length > 0) {
      const topShared = sharedInterests.slice(0, 3).join(', ');
      primary = `Because you both like ${topShared}`;
      details.push(`Shared interests: ${topShared}`);
    } else if (Number(item.shared_communities_count) > 0) {
      primary = `Active in ${item.shared_communities_count} shared ${item.shared_communities_count === 1 ? 'community' : 'communities'}`;
      details.push('You participate in the same groups');
    } else if (item.profile_verified || item.user_verified) {
      primary = 'Verified profile in your discovery area';
      details.push('Identity-verified with complete profile');
    } else if (item.occupation) {
      primary = `Works in ${item.occupation}`;
      details.push('Compatible career and location affinity');
    }

    if (item.has_active_subscription) {
      details.push('Featured member profile');
    }

    return {
      primary,
      details,
      confidence: sharedInterests.length > 0 ? 0.9 : 0.75,
      factors: {
        shared_interests: sharedInterests,
        is_verified: Boolean(item.profile_verified || item.user_verified),
        is_premium_boosted: Boolean(item.has_active_subscription),
      },
    };
  }

  private static explainCommunity(item: any, userInterestNames: string[]): RecommendationExplanation {
    const catName = item.category_name || 'Lifestyle';
    let primary = `Popular in ${catName}`;
    const details: string[] = [];

    const isInterestMatch = userInterestNames.some(
      (ui) => ui.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(ui.toLowerCase())
    );

    if (isInterestMatch) {
      primary = `Matches your passion for ${catName}`;
      details.push(`Aligned with your selected ${catName} interests`);
    } else if (item.is_boosted) {
      primary = `Featured community in ${catName}`;
      details.push('Highlighted active community with live discussions');
    } else if (Number(item.member_count) > 5) {
      primary = `Thriving community with ${item.member_count} active members`;
      details.push('Regular member posts and discussions');
    }

    return {
      primary,
      details,
      confidence: isInterestMatch ? 0.92 : 0.8,
      factors: {
        behavioral_affinity: catName,
        is_premium_boosted: Boolean(item.is_boosted),
      },
    };
  }

  private static explainEvent(item: any, userInterestNames: string[]): RecommendationExplanation {
    const catName = item.category_name || 'Community';
    const commName = item.community_name || 'Local Community';
    let primary = `Upcoming event hosted by ${commName}`;
    const details: string[] = [];

    if (item.category_interest_match > 0) {
      primary = `Matches your interest in ${catName}`;
      details.push(`Hosted by ${commName}`);
    } else if (item.location_name) {
      primary = `Happening at ${item.location_name}`;
      details.push(`${item.location_type === 'online' ? 'Online virtual meetup' : 'In-person meetup'}`);
    }

    if (item.attendees_count > 0) {
      details.push(`${item.attendees_count} people attending`);
    }

    return {
      primary,
      details,
      confidence: 0.88,
      factors: {
        behavioral_affinity: catName,
      },
    };
  }

  private static explainPost(item: any, userInterestNames: string[]): RecommendationExplanation {
    let primary = 'Engaging post from your community network';
    const details: string[] = [];

    if (item.community_name) {
      primary = `From ${item.community_name}`;
      details.push(`Active discussion in ${item.community_name}`);
    } else if (item.likes_count > 5) {
      primary = `Popular post with ${item.likes_count} likes`;
      details.push('High engagement from active members');
    }

    return {
      primary,
      details,
      confidence: 0.82,
      factors: {},
    };
  }

  private static explainTrending(item: any, userInterestNames: string[]): RecommendationExplanation {
    const isMatched = item.is_user_interest > 0;
    const primary = isMatched
      ? `Trending topic matching your interest #${item.name}`
      : `Trending hashtag #${item.name} with ${item.posts_count} posts`;

    return {
      primary,
      details: [`${item.posts_count} active posts tagged with #${item.name}`],
      confidence: isMatched ? 0.95 : 0.85,
      factors: {
        behavioral_affinity: item.name,
      },
    };
  }

  /**
   * Optional AI explanation enhancement via Day 20 AI Provider
   * Strictly non-blocking: falls back to deterministic explanation on any AI outage or error
   */
  public static async enhanceExplanationWithAI(
    explanation: RecommendationExplanation,
    contextSummary: string
  ): Promise<RecommendationExplanation> {
    try {
      const prompt = `Rewrite the following recommendation reason into a concise, friendly, one-sentence phrase (max 12 words) for a social discovery app.
Current reason: "${explanation.primary}"
Context: ${contextSummary}
Return ONLY the one-sentence text.`;

      const aiText = await AIProvider.completeText('You are Connectly AI Assistant. Respond in max 12 words.', prompt, 100);
      if (aiText && aiText.trim().length > 5 && aiText.trim().length < 100) {
        return {
          ...explanation,
          primary: aiText.trim().replace(/^["']|["']$/g, ''),
        };
      }
    } catch (err) {
      logger.debug('[RecommendationExplanationService] AI explanation fallback:', err);
    }
    return explanation;
  }
}
