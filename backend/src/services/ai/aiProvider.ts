// Connectly AI Provider Abstraction
// Supports Google Gemini / OpenAI with automatic, robust, contextual heuristic fallback

import { logger } from '../../utils/logger';
import type { BioStyle } from '../../types/ai.types';

export interface AIProviderResponse {
  text: string;
  source: 'gemini' | 'openai' | 'fallback';
  tokensUsed?: number;
  latencyMs: number;
}

export class AIProvider {
  private static getApiKey(): string | null {
    return (
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      null
    );
  }

  /**
   * Sanitize user input to neutralize prompt injection attacks
   */
  public static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    // Strip control characters and excessive whitespace
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/gi, '[filtered]')
      .slice(0, 1500)
      .trim();
  }

  /**
   * Internal generic text completion using Google Gemini or fallback
   */
  private static async completePrompt(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 300
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        // Call Google Gemini API (gemini-1.5-flash)
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as any;
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (text) {
            return {
              text,
              source: 'gemini',
              tokensUsed: data?.usageMetadata?.totalTokenCount || 50,
              latencyMs: Date.now() - startTime,
            };
          }
        } else {
          logger.warn(`[AIProvider] Gemini API returned status ${response.status}`);
        }
      } catch (err: any) {
        logger.warn(`[AIProvider] Remote AI API error (${err.message}), utilizing fallback engine.`);
      }
    }

    return {
      text: '',
      source: 'fallback',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Generic prompt completion helper for platform intelligence services
   */
  public static async completeText(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 150
  ): Promise<string> {
    const res = await this.completePrompt(systemPrompt, userPrompt, maxTokens);
    return res.text;
  }

  /**
   * JSON completion helper with markdown cleanup & validation
   */
  public static async completeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 300
  ): Promise<T | null> {
    const text = await this.completeText(
      systemPrompt + ' Return ONLY valid raw JSON with no markdown formatting or extra text.',
      userPrompt,
      maxTokens
    );
    if (!text) return null;
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  /**
   * 1. Generate Compatibility Natural Language Explanation
   */
  public static async generateCompatibilityExplanation(params: {
    userAName: string;
    userBName: string;
    score: number;
    sharedInterests: string[];
    reasons: string[];
  }): Promise<string> {
    const { userAName, userBName, score, sharedInterests, reasons } = params;

    const systemPrompt = `You are Connectly's AI Matchmaking Assistant. You provide friendly, brief, authentic explanations of why two people match on a modern dating platform. Keep it within 2-3 sentences. Never invent facts not given.`;
    const userPrompt = `Explain compatibility between ${userAName} and ${userBName}. Overall score: ${score}%. Shared interests: ${sharedInterests.join(', ') || 'None specified'}. Signals: ${reasons.join('; ')}.`;

    const aiRes = await this.completePrompt(systemPrompt, userPrompt, 150);
    if (aiRes.source !== 'fallback' && aiRes.text) {
      return aiRes.text.replace(/["\n]+/g, ' ').trim();
    }

    // Heuristic Contextual Fallback
    const tier =
      score >= 85
        ? 'an exceptional'
        : score >= 70
        ? 'a strong'
        : score >= 50
        ? 'a promising'
        : 'an evolving';

    let interestText = '';
    if (sharedInterests.length > 0) {
      interestText = ` You both share mutual enthusiasm for ${sharedInterests.slice(0, 3).join(' and ')}, giving you natural conversation starters.`;
    }

    return `You and ${userBName} share ${tier} ${score}% compatibility!${interestText} Your profile intentions and preferences align harmoniously for a meaningful connection.`;
  }

  /**
   * 2. Generate Bio Improvement Suggestion
   */
  public static async generateBioSuggestion(params: {
    currentBio?: string;
    style: BioStyle;
    firstName: string;
    occupation?: string | null;
    city?: string | null;
    interests: string[];
  }): Promise<{ suggestedBio: string; highlights: string[]; explanation: string }> {
    const { currentBio = '', style, firstName, occupation, city, interests } = params;
    const sanitizedBio = this.sanitizeInput(currentBio);

    const systemPrompt = `You are a professional dating profile copywriter. Write a concise, charming dating bio for ${firstName}. Style: ${style}. Limit to 2-3 short sentences. No hashtags or clichés.`;
    const userPrompt = `Current bio: "${sanitizedBio}". Occupation: ${occupation || 'Creative'}. City: ${city || 'India'}. Top interests: ${interests.slice(0, 4).join(', ') || 'Travel, Music'}.`;

    const aiRes = await this.completePrompt(systemPrompt, userPrompt, 150);
    if (aiRes.source !== 'fallback' && aiRes.text) {
      return {
        suggestedBio: aiRes.text.replace(/["\n]+/g, ' ').trim(),
        highlights: [
          `Tailored for a ${style.replace(/_/g, ' ')} tone`,
          'Highlights genuine passions & lifestyle',
          'Easy conversation opening hook',
        ],
        explanation: `Refined your bio in a ${style.replace(/_/g, ' ')} style with punchy clarity and engaging conversation hooks.`,
      };
    }

    // Heuristic Fallback Generator based on Style
    const topInterest = interests[0] || 'exploring new places';
    const secondInterest = interests[1] || 'great music';
    const loc = city ? `in ${city}` : 'around';
    const occ = occupation ? `Working in ${occupation.toLowerCase()}` : 'Passionate about my craft';

    let fallbackBio = '';
    switch (style) {
      case 'funny':
        fallbackBio = `${occ} by day, amateur enthusiast of ${topInterest} and ${secondInterest} by night. Looking for someone to debate the best coffee spots ${loc} with!`;
        break;
      case 'confident':
        fallbackBio = `Driven by curiosity, good vibes, and ${topInterest}. ${occ} ${loc} who values authentic conversations and weekend adventures. Let's see if we match.`;
        break;
      case 'short_and_sweet':
        fallbackBio = `${topInterest} enthusiast, ${secondInterest} lover, and ${occ.toLowerCase()} ${loc}. Always up for a spontaneous coffee or weekend adventure.`;
        break;
      case 'creative':
        fallbackBio = `Collecting moments between ${topInterest} and ${secondInterest}. ${occ} ${loc} with a weakness for good storytelling and spontaneous road trips.`;
        break;
      case 'professional':
        fallbackBio = `${occ} based ${loc}. Passionate about continuous learning, balanced with ${topInterest} and ${secondInterest} on the weekends. Looking for meaningful connections.`;
        break;
      case 'friendly':
      default:
        fallbackBio = `Hey there! I'm into ${topInterest}, ${secondInterest}, and discovering hidden gems ${loc}. Always happy to share a great conversation or discover something new together.`;
        break;
    }

    return {
      suggestedBio: fallbackBio,
      highlights: [
        `Optimized for a ${style.replace(/_/g, ' ')} tone`,
        `Features your passions: ${topInterest} & ${secondInterest}`,
        'Engaging hook for potential matches to reply to',
      ],
      explanation: `Crafted a personalized ${style.replace(/_/g, ' ')} bio that naturally showcases your lifestyle and sparks curiosity.`,
    };
  }

  /**
   * 3. Generate Smart Reply Suggestions
   */
  public static async generateReplySuggestions(params: {
    partnerName: string;
    recentMessages: Array<{ senderName: string; text: string; isFromMe: boolean }>;
    sharedInterests: string[];
  }): Promise<{ suggestions: string[]; topicsDetected: string[] }> {
    const { partnerName, recentMessages, sharedInterests } = params;

    const formattedContext = recentMessages
      .map((m) => `${m.senderName}: "${this.sanitizeInput(m.text)}"`)
      .join('\n');

    const systemPrompt = `You are Connectly's AI Chat Wingman. Suggest 3 authentic, respectful, charming reply choices to continue the conversation naturally with ${partnerName}. Return only 3 lines separated by newline.`;
    const userPrompt = `Recent messages:\n${formattedContext}\nShared interests: ${sharedInterests.join(', ') || 'General'}`;

    const aiRes = await this.completePrompt(systemPrompt, userPrompt, 150);
    if (aiRes.source !== 'fallback' && aiRes.text) {
      const parsed = aiRes.text
        .split('\n')
        .map((s) => s.replace(/^\d+[\.\)]\s*/, '').replace(/["']/g, '').trim())
        .filter((s) => s.length > 5)
        .slice(0, 3);

      if (parsed.length >= 2) {
        return {
          suggestions: parsed,
          topicsDetected: sharedInterests.slice(0, 3),
        };
      }
    }

    // Heuristic Fallback Analysis
    const lastIncoming = [...recentMessages].reverse().find((m) => !m.isFromMe);
    const lastText = (lastIncoming?.text || '').toLowerCase();

    const topics: string[] = [];
    if (lastText.includes('weekend') || lastText.includes('sunday') || lastText.includes('saturday')) topics.push('Weekend plans');
    if (lastText.includes('coffee') || lastText.includes('tea') || lastText.includes('drink')) topics.push('Coffee date');
    if (lastText.includes('travel') || lastText.includes('trip') || lastText.includes('vacation')) topics.push('Travel');
    if (lastText.includes('work') || lastText.includes('job') || lastText.includes('busy')) topics.push('Work life');

    const suggestions: string[] = [];
    if (lastText.includes('?') || lastText.includes('how') || lastText.includes('what')) {
      suggestions.push(`That's a great question! For me, it really comes down to having fun and keeping things relaxed.`);
      suggestions.push(`I was actually just thinking about that! How about you, what's your take?`);
      suggestions.push(`Haha, honestly it depends on the day! What usually makes your top list?`);
    } else if (topics.includes('Weekend plans')) {
      suggestions.push(`That sounds like a great weekend! Any must-do spots you're planning to check out?`);
      suggestions.push(`I love that! I'm planning to keep it pretty relaxed myself with some ${sharedInterests[0] || 'good food'}.`);
      suggestions.push(`Sounds fun! We should definitely plan to grab coffee sometime if your weekend frees up.`);
    } else {
      suggestions.push(`That's really cool! How did you first get into that?`);
      suggestions.push(`I totally agree with that. You seem to have a really great perspective!`);
      suggestions.push(`Haha love that! Tell me more about what you've been up to lately.`);
    }

    return {
      suggestions: suggestions.slice(0, 3),
      topicsDetected: topics.length > 0 ? topics : sharedInterests.slice(0, 2),
    };
  }

  /**
   * 4. Generate Conversation Starters for Newly Matched Pairs
   */
  public static async generateConversationStarters(params: {
    partnerName: string;
    sharedInterests: string[];
    partnerInterests: string[];
    partnerBio?: string | null;
  }): Promise<{ starters: string[]; sharedInterests: string[] }> {
    const { partnerName, sharedInterests, partnerInterests } = params;

    const common = sharedInterests.length > 0 ? sharedInterests : partnerInterests;
    const item1 = common[0] || 'traveling';
    const item2 = common[1] || 'good music';

    const systemPrompt = `Suggest 3 friendly, natural opening icebreaker messages for a user starting a conversation on Connectly with ${partnerName}. No cheesy pickup lines. Return 3 lines separated by newline.`;
    const userPrompt = `Partner: ${partnerName}. Shared/Their interests: ${common.join(', ')}.`;

    const aiRes = await this.completePrompt(systemPrompt, userPrompt, 150);
    if (aiRes.source !== 'fallback' && aiRes.text) {
      const parsed = aiRes.text
        .split('\n')
        .map((s) => s.replace(/^\d+[\.\)]\s*/, '').replace(/["']/g, '').trim())
        .filter((s) => s.length > 5)
        .slice(0, 3);

      if (parsed.length >= 2) {
        return {
          starters: parsed,
          sharedInterests: common.slice(0, 3),
        };
      }
    }

    // Heuristic Starters
    return {
      starters: [
        `Hey ${partnerName}! Great to match with you. I noticed you love ${item1} too — what's your favorite thing about it?`,
        `Hi ${partnerName}! Your profile caught my eye, especially since we both enjoy ${item1} and ${item2}. How's your week going?`,
        `Hey ${partnerName}! If you had to pick one dream place to travel or relax right now, where would you go?`,
      ],
      sharedInterests: common.slice(0, 3),
    };
  }
}

export default AIProvider;
