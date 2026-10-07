export {};

const API_BASE = 'http://127.0.0.1:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, message: string): void {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] ${name}: ${message}`);
}

async function registerAndOnboardUser(
  prefix: string,
  gender: string,
  preferredGender: string,
  interests: number[] = [1, 2, 3]
): Promise<{ id: number; token: string; email: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `day20_${prefix}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: prefix,
      lastName: 'AITest',
      dateOfBirth: '1997-08-14',
      gender,
    }),
  });
  const regData = (await regRes.json()) as any;
  const id = regData?.data?.user?.id;
  const token = regData?.data?.accessToken;

  if (!token || !id) {
    throw new Error(`Failed to register test user ${prefix}: ${JSON.stringify(regData)}`);
  }

  // 1. Onboard profile about
  await fetch(`${API_BASE}/onboarding/about`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      bio: `Hello, I'm ${prefix}! Passionate about photography, indie music, and exploring new coffee shops around the city.`,
      occupation: 'Product Designer',
      education: 'Design Academy',
      city: 'Mumbai',
      country: 'India',
    }),
  });

  // 2. Onboard preferences
  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      genderPreference: preferredGender,
      minAge: 20,
      maxAge: 35,
      maxDistanceKm: 50,
      relationshipGoal: 'dating',
    }),
  });

  // 3. Set interests
  await fetch(`${API_BASE}/onboarding/interests`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ interestIds: interests }),
  });

  // 4. Complete onboarding
  await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return { id, token, email };
}

async function runDay20Tests() {
  console.log('\n========================================================================');
  console.log('CONNECTLY DAY 20 — AI-POWERED MATCHING & CONVERSATION ASSISTANT TESTS');
  console.log('========================================================================\n');

  try {
    // 1. Create Test Users
    console.log('--- Phase 1: Test User Creation & Initial Security ---');
    const alice = await registerAndOnboardUser('Alice', 'female', 'male', [1, 2, 3]); // Travel, Photography, Music
    const bob = await registerAndOnboardUser('Bob', 'male', 'female', [1, 2, 4]); // Travel, Photography, Cooking
    const charlie = await registerAndOnboardUser('Charlie', 'male', 'female', [5, 6]); // Different interests
    record('User Setup', true, `Created Alice (ID: ${alice.id}), Bob (ID: ${bob.id}), Charlie (ID: ${charlie.id})`);

    // 2. Compatibility check before match -> Should be protected or require mutual context
    const preMatchRes = await fetch(`${API_BASE}/ai/compatibility/${charlie.id}`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    // In our system, checking compatibility with unmatched user works if discovery is valid, or requires matchId.
    record(
      'Compatibility Query Check',
      preMatchRes.status === 200 || preMatchRes.status === 403,
      `Pre-match query handled with HTTP ${preMatchRes.status}`
    );

    // 3. Establish mutual match between Alice and Bob
    console.log('\n--- Phase 2: Mutual Match & Smart Compatibility Engine ---');
    await fetch(`${API_BASE}/discovery/${bob.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const matchRes = await fetch(`${API_BASE}/discovery/${alice.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const matchData = (await matchRes.json()) as any;
    const matchId = matchData?.data?.matchId || matchData?.data?.match?.id;

    record('Match Establishment', !!matchId, `Alice and Bob matched with matchId: ${matchId}`);

    // 4. Test Compatibility Engine by Target User ID
    const compatRes = await fetch(`${API_BASE}/ai/compatibility/${bob.id}`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const compatData = (await compatRes.json()) as any;
    const compat = compatData?.data;

    record(
      'Smart Compatibility Score Calculation',
      compatRes.status === 200 &&
        typeof compat?.overallScore === 'number' &&
        compat?.overallScore >= 0 &&
        compat?.overallScore <= 100,
      `Calculated compatibility: ${compat?.overallScore}% (${compat?.compatibilityTier})`
    );

    record(
      'Compatibility Categories & Signals',
      compat?.categoryScores?.sharedInterests !== undefined &&
        compat?.categoryScores?.preferences !== undefined &&
        compat?.categoryScores?.location !== undefined &&
        compat?.categoryScores?.profileRichness !== undefined,
      `Category breakdown: Interests=${compat?.categoryScores?.sharedInterests}%, Prefs=${compat?.categoryScores?.preferences}%, Loc=${compat?.categoryScores?.location}%`
    );

    record(
      'Shared Interests Detection',
      Array.isArray(compat?.sharedInterests) && compat?.sharedInterests?.length >= 2,
      `Found ${compat?.sharedInterests?.length} shared interests: ${compat?.sharedInterests?.join(', ')}`
    );

    record(
      'AI Compatibility Natural Language Explanation',
      typeof compat?.aiExplanation === 'string' && compat?.aiExplanation?.length >= 20,
      `Explanation: "${compat?.aiExplanation?.slice(0, 80)}..."`
    );

    // 5. Test Compatibility by Match ID endpoint
    const matchCompatRes = await fetch(`${API_BASE}/ai/matches/${matchId}/compatibility`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const matchCompatData = (await matchCompatRes.json()) as any;
    record(
      'Match ID Compatibility Endpoint',
      matchCompatRes.status === 200 && matchCompatData?.data?.overallScore === compat?.overallScore,
      `Retrieved match compatibility via /matches/${matchId}/compatibility`
    );

    // 6. Security IDOR: Charlie attempts to access Alice & Bob's match compatibility
    const idorMatchRes = await fetch(`${API_BASE}/ai/matches/${matchId}/compatibility`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    record(
      'Security: IDOR Prevention on Match Compatibility',
      idorMatchRes.status === 403 || idorMatchRes.status === 404,
      `Charlie rejected with HTTP ${idorMatchRes.status}`
    );

    // 7. Profile AI Insights
    console.log('\n--- Phase 3: Profile AI Insights & Bio Improvement ---');
    const insightsRes = await fetch(`${API_BASE}/ai/profile/insights`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const insightsData = (await insightsRes.json()) as any;
    const insights = insightsData?.data;

    record(
      'Profile AI Insights Generation',
      insightsRes.status === 200 &&
        typeof insights?.completionPercentage === 'number' &&
        Array.isArray(insights?.strengths) &&
        insights?.strengths?.length > 0,
      `Rating: ${insights?.overallRating}, Completion: ${insights?.completionPercentage}%, Strengths count: ${insights?.strengths?.length}`
    );

    record(
      'Profile Actionable Suggestions',
      Array.isArray(insights?.suggestions) && typeof insights?.aiSummary === 'string',
      `Suggestions: ${insights?.suggestions?.length} items. Summary: "${insights?.aiSummary?.slice(0, 60)}..."`
    );

    // 8. Bio Improvement Assistant
    const bioImproveRes = await fetch(`${API_BASE}/ai/profile/improve-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
      body: JSON.stringify({
        bio: 'Hey, I love coffee and traveling on weekends.',
        style: 'confident',
      }),
    });
    const bioData = (await bioImproveRes.json()) as any;
    const bioResult = bioData?.data;

    record(
      'Bio Improvement (Confident Style)',
      bioImproveRes.status === 200 &&
        typeof bioResult?.suggestedBio === 'string' &&
        bioResult?.suggestedBio?.length >= 20 &&
        bioResult?.style === 'confident',
      `Suggested bio (${bioResult?.suggestedBio?.length} chars): "${bioResult?.suggestedBio?.slice(0, 75)}..."`
    );

    // Test different style: funny
    const funnyBioRes = await fetch(`${API_BASE}/ai/profile/improve-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
      body: JSON.stringify({ style: 'funny' }),
    });
    const funnyData = (await funnyBioRes.json()) as any;
    record(
      'Bio Improvement (Funny Style)',
      funnyBioRes.status === 200 && funnyData?.data?.style === 'funny',
      `Generated funny bio: "${funnyData?.data?.suggestedBio?.slice(0, 70)}..."`
    );

    // 9. Conversation Assistant & Reply Suggestions
    console.log('\n--- Phase 4: Conversation Assistant & Reply Suggestions ---');
    // Find conversation ID between Alice and Bob
    const convListRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const convListData = (await convListRes.json()) as any;
    const conv = convListData?.data?.conversations?.[0];
    const convId = conv?.conversationId;

    // Send a message from Bob to Alice
    await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bob.token}` },
      body: JSON.stringify({ content: 'Hey Alice! What are your favorite weekend spots in Mumbai?' }),
    });

    // Alice requests AI reply suggestions
    const suggestionsRes = await fetch(`${API_BASE}/ai/conversation/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
      body: JSON.stringify({ conversationId: convId }),
    });
    const suggestionsData = (await suggestionsRes.json()) as any;
    const suggestions = suggestionsData?.data?.suggestions;

    record(
      'Conversation Reply Suggestions',
      suggestionsRes.status === 200 && Array.isArray(suggestions) && suggestions.length >= 2,
      `Generated ${suggestions?.length} contextual suggestions: "${suggestions?.[0]}"`
    );

    // 10. Security IDOR: Charlie tries to get suggestions for Alice & Bob's conversation
    const idorConvRes = await fetch(`${API_BASE}/ai/conversation/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${charlie.token}` },
      body: JSON.stringify({ conversationId: convId }),
    });
    record(
      'Security: IDOR Prevention on Chat Suggestions',
      idorConvRes.status === 403,
      `Charlie rejected from accessing conversation suggestions with HTTP ${idorConvRes.status}`
    );

    // 11. Conversation Starter Generator
    const starterRes = await fetch(`${API_BASE}/ai/conversation/starter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
      body: JSON.stringify({ conversationId: convId }),
    });
    const starterData = (await starterRes.json()) as any;
    const starters = starterData?.data?.starters;

    record(
      'Conversation Starter Generator',
      starterRes.status === 200 && Array.isArray(starters) && starters.length >= 2,
      `Generated ${starters?.length} icebreaker starters: "${starters?.[0]}"`
    );

    // 12. Admin AI Analytics & Telemetry Verification
    console.log('\n--- Phase 5: Admin AI Analytics & Telemetry ---');
    // Login as admin
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@connectly.com', password: 'AdminPass123!' }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData?.data?.accessToken;

    const adminStatsRes = await fetch(`${API_BASE}/ai/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStatsData = (await adminStatsRes.json()) as any;
    const stats = adminStatsData?.data;

    record(
      'Admin AI Analytics Dashboard Metrics',
      adminStatsRes.status === 200 && typeof stats?.totalRequests === 'number' && stats?.totalRequests >= 4,
      `Admin AI telemetry: totalRequests=${stats?.totalRequests}, today=${stats?.requestsToday}, mostUsed=${stats?.mostUsedFeature}`
    );

    // Non-admin trying to access admin AI stats
    const nonAdminStatsRes = await fetch(`${API_BASE}/ai/admin/stats`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    record(
      'Security: Non-Admin Blocked from AI Analytics',
      nonAdminStatsRes.status === 403,
      `Normal user blocked from admin stats with HTTP ${nonAdminStatsRes.status}`
    );
  } catch (err: any) {
    console.error('Test execution error:', err);
    record('Overall Test Execution', false, err.message || 'Fatal test failure');
  }

  // Summary
  console.log('\n========================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  if (passedCount === totalCount) {
    console.log('🎉 ALL DAY 20 AI MATCHING & CONVERSATION ASSISTANT TESTS PASSED PERFECTLY!');
  } else {
    console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
  }
  console.log('========================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runDay20Tests();
