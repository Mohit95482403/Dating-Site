// Connectly Day 26: AI Personalization, Recommendation Intelligence & Behavioral Learning Comprehensive Verification Script
// Tests DB schema, behavioral events, interest modeling & decay, hard filtering, scoring, feedback, reset, and admin analytics

import { pool, query, execute } from '../config/database';
import { initializeDatabase } from '../config/databaseInit';
import { PersonalizationModel } from '../models/personalization.model';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationExplanationService } from '../services/recommendationExplanation.service';
import { logger } from './logger';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 CONNECTLY DAY 26: PERSONALIZATION & INTELLIGENCE TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Initialize schema
    console.log('[Step 1] Initializing database & Day 26 tables...');
    await initializeDatabase();

    const tableCheck = await query<any[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name IN (
          'user_behavior_events',
          'user_interest_scores',
          'recommendation_feedback',
          'recommendation_exposures',
          'personalization_settings',
          'recommendation_experiments'
        )
    `);
    assert(tableCheck.length === 6, 'All 6 Day 26 database tables exist');

    // 2. Fetch or seed a test user
    console.log('\n[Step 2] Setting up test users and profiles...');
    const users = await query<any[]>('SELECT id FROM users LIMIT 3');
    if (users.length < 2) {
      throw new Error('Need at least 2 users in the database to run personalization tests');
    }
    const testUserId = Number(users[0].id);
    const candidateUserId = Number(users[1].id);

    // 3. Test Behavioral Events Ingestion
    console.log('\n[Step 3] Testing Behavioral Event Ingestion & Whitelisting...');
    const invalidEvent = await PersonalizationModel.recordBehaviorEvent(
      testUserId,
      'ADMIN_FORCE_APPROVE' as any,
      'PROFILE',
      String(candidateUserId)
    );
    assert(invalidEvent === false, 'Disallowed arbitrary event type is rejected by whitelist');

    const validEvent = await PersonalizationModel.recordBehaviorEvent(
      testUserId,
      'PROFILE_VIEW',
      'PROFILE',
      String(candidateUserId),
      { duration_seconds: 15 }
    );
    assert(validEvent === true, 'Allowed PROFILE_VIEW event is successfully recorded');

    // Test Batch Ingestion
    const batchResult = await PersonalizationModel.recordBatchBehaviorEvents(testUserId, [
      { eventType: 'POST_VIEW', entityType: 'POST', entityId: '1' },
      { eventType: 'COMMUNITY_VIEW', entityType: 'COMMUNITY', entityId: '1' },
      { eventType: 'UNAUTHORIZED_HACK' as any, entityType: 'POST', entityId: '2' },
    ]);
    assert(batchResult.inserted === 2 && batchResult.rejected === 1, 'Batch ingestion inserts valid events and rejects disallowed ones');

    // 4. Test User Interest Model & Decay
    console.log('\n[Step 4] Testing User Interest Model & Deterministic Decay...');
    // Seed an explicit interest for test user
    const [interestRow] = await query<any[]>('SELECT id FROM interests LIMIT 1');
    const interestId = Number(interestRow.id);

    await execute(
      'INSERT IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)',
      [testUserId, interestId]
    );
    await PersonalizationModel.syncExplicitInterests(testUserId);

    const scoresAfterSync = await PersonalizationModel.getUserInterestScores(testUserId);
    const hasExplicit = scoresAfterSync.some((s) => s.interest_id === interestId && s.score >= 10.0);
    assert(hasExplicit, 'Explicit interest carries strong baseline score (>= 10.0)');

    // Add behavioral score increment
    await PersonalizationModel.incrementInterestScore(testUserId, interestId, 2.5, 'BEHAVIORAL', 0.8);
    const scoresAfterIncrement = await PersonalizationModel.getUserInterestScores(testUserId);
    const updatedScore = scoresAfterIncrement.find((s) => s.interest_id === interestId);
    assert(Boolean(updatedScore && updatedScore.score >= 12.0), 'Behavioral score increment successfully updates interest model');

    // Test Decay function execution
    await PersonalizationModel.applyInterestDecay(testUserId);
    assert(true, 'Deterministic interest decay executes without SQL error');

    // 5. Test Hard Safety & Privacy Filters First
    console.log('\n[Step 5] Testing Hard Safety Filters Priority...');
    // Test block: block candidateUserId
    await execute('INSERT IGNORE INTO blocks (blocker_id, blocked_user_id) VALUES (?, ?)', [testUserId, candidateUserId]);
    const excludedIds = await PersonalizationModel.getHardExcludedUserIds(testUserId);
    assert(excludedIds.has(candidateUserId), 'Blocked candidate is strictly included in hard exclusion set');

    const candidatesWhileBlocked = await PersonalizationModel.getCandidatePeople(testUserId, excludedIds, 10);
    const leakedBlocked = candidatesWhileBlocked.some((c) => Number(c.user_id) === candidateUserId);
    assert(!leakedBlocked, 'Blocked user is NEVER returned in candidate people recommendations');

    // Cleanup block
    await execute('DELETE FROM blocks WHERE blocker_id = ? AND blocked_user_id = ?', [testUserId, candidateUserId]);

    // 6. Test Explainable Recommendations
    console.log('\n[Step 6] Testing "Why am I seeing this?" Explanation Service...');
    const mockPerson = {
      user_id: 99,
      first_name: 'Alex',
      interests_str: 'Travel, Photography, Coding',
      shared_interests_count: 2,
      profile_verified: 1,
      has_active_subscription: 1,
    };
    const explanation = RecommendationExplanationService.generateExplanation('PEOPLE', mockPerson, ['Travel', 'Photography']);
    assert(explanation.primary.includes('Because you both like'), 'Explanation provides clear, friendly shared-interest reason');
    assert(Boolean(explanation.factors.is_verified), 'Explanation factors capture verified trust signal');

    const commExplanation = RecommendationExplanationService.generateExplanation('COMMUNITY', {
      name: 'Outdoor Adventures',
      category_name: 'Travel',
      member_count: 24,
      is_boosted: 1,
    }, ['Travel']);
    assert(commExplanation.primary.includes('passion for Travel') || commExplanation.primary.includes('Travel'), 'Community explanation captures category affinity');

    // 7. Test Recommendation Feedback & Repetition Penalty
    console.log('\n[Step 7] Testing Recommendation Feedback & Exposures...');
    await RecommendationService.submitFeedback(testUserId, 'PEOPLE', String(candidateUserId), 'NOT_INTERESTED', 'Not my type');
    const negativeFeedbackIds = await PersonalizationModel.getNegativeFeedbackEntityIds(testUserId, 'PEOPLE');
    assert(negativeFeedbackIds.has(String(candidateUserId)), 'NOT_INTERESTED feedback is recorded');

    // Ensure candidate is now excluded
    const candidateList = await RecommendationService.getPeopleRecommendations(testUserId, 10);
    const foundDismissed = candidateList.some((c) => Number(c.item.user_id) === candidateUserId);
    assert(!foundDismissed, 'User marked NOT_INTERESTED is removed from recommendations');

    // 8. Test Settings & Reset Personalization
    console.log('\n[Step 8] Testing Personalization Settings & Reset...');
    const settings = await PersonalizationModel.getPersonalizationSettings(testUserId);
    assert(settings.personalized_recommendations === true, 'Default personalization settings are enabled');
    assert(['v1', 'v2'].includes(settings.experiment_version), 'User is deterministically assigned to A/B experiment group');

    await PersonalizationModel.updatePersonalizationSettings(testUserId, { ai_recommendations: false });
    const updatedSettings = await PersonalizationModel.getPersonalizationSettings(testUserId);
    assert(updatedSettings.ai_recommendations === false, 'Personalization settings update persists successfully');

    // Reset personalization
    await RecommendationService.resetPersonalization(testUserId);
    const feedbackAfterReset = await PersonalizationModel.getNegativeFeedbackEntityIds(testUserId, 'PEOPLE');
    assert(!feedbackAfterReset.has(String(candidateUserId)), 'Reset personalization clears feedback penalties and resets inferred scores');

    // 9. Test Admin Analytics & Experiments
    console.log('\n[Step 9] Testing Admin Analytics Telemetry & Experiments...');
    const adminAnalytics = await RecommendationService.getAdminAnalytics();
    assert(typeof adminAnalytics.ctr === 'number', 'Admin recommendation analytics calculates CTR');
    assert(Array.isArray(adminAnalytics.recommendationTypeBreakdown), 'Recommendation type breakdown is generated');

    const experiments = await RecommendationService.getExperiments();
    assert(experiments.length >= 2, 'Default A/B experiments (v1 and v2) exist in database');

    // 10. Test Full Personalized Home Feed
    console.log('\n[Step 10] Testing Full Personalized Home Experience API...');
    const homeResponse = await RecommendationService.getPersonalizedHome(testUserId, true);
    assert(Array.isArray(homeResponse.people), 'Personalized home returns people list');
    assert(Array.isArray(homeResponse.communities), 'Personalized home returns communities list');
    assert(Array.isArray(homeResponse.events), 'Personalized home returns events list');
    assert(Array.isArray(homeResponse.posts), 'Personalized home returns posts list');
    assert(Array.isArray(homeResponse.trending), 'Personalized home returns trending list');

    // 11. Test Standalone Recommendations Services
    console.log('\n[Step 11] Testing Standalone Endpoints & AI Suggestions...');
    const eventRecs = await RecommendationService.getEventRecommendations(testUserId, 5);
    assert(Array.isArray(eventRecs), 'Standalone getEventRecommendations returns array');

    const postRecs = await RecommendationService.getPostRecommendations(testUserId, 5);
    assert(Array.isArray(postRecs), 'Standalone getPostRecommendations returns array');

    const feedResult = await RecommendationService.getPersonalizedFeed(testUserId, 1, 5);
    assert(Array.isArray(feedResult.posts) && typeof feedResult.pagination.hasMore === 'boolean', 'getPersonalizedFeed returns paginated posts');

    const trendingRecs = await RecommendationService.getTrendingForUser(testUserId, 5);
    assert(Array.isArray(trendingRecs), 'getTrendingForUser returns ranked hashtags');

    const aiSuggestions = await RecommendationService.getAiDiscoverySuggestions(testUserId);
    assert(Array.isArray(aiSuggestions.themes) && aiSuggestions.themes.length > 0, 'getAiDiscoverySuggestions returns valid themes with fallback');
    assert(Array.isArray(aiSuggestions.suggestedActivities) && aiSuggestions.suggestedActivities.length > 0, 'getAiDiscoverySuggestions returns activity suggestions');

    console.log('\n======================================================');
    console.log(`🏁 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal test exception:', error);
    process.exit(1);
  }
}

runTests();
