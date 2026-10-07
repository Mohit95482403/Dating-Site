export {};
const { io } = require('../../../frontend/node_modules/socket.io-client');

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_BASE = 'http://127.0.0.1:5000';

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
  firstName: string,
  gender: 'male' | 'female',
  preferredGender: 'male' | 'female'
): Promise<{ id: number; token: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const email = `match_test_${firstName.toLowerCase()}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  // Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName: 'Tester',
      dateOfBirth: '1997-04-10',
      gender,
    }),
  });
  const regData = (await regRes.json()) as any;
  const id = regData?.data?.user?.id;
  const token = regData?.data?.accessToken;

  // Onboard
  await fetch(`${API_BASE}/onboarding/about`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      bio: `Hello, I'm ${firstName}! I love hiking and travel.`,
      occupation: 'Developer',
      city: 'Nashik',
      country: 'India',
    }),
  });

  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      minAge: 18,
      maxAge: 40,
      preferredGender,
      maxDistanceKm: 100,
    }),
  });

  await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return { id, token };
}

export async function runDay11MatchingTestSuite(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 CONNECTLY DAY 11 MATCHING SYSTEM & REAL-TIME TEST SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Create Test Users: User A (Male), User B (Female), User C (Female), User D (Attacker/Unrelated)
    console.log('--- Setting up test users ---');
    const userA = await registerAndOnboardUser('Alex', 'male', 'female');
    const userB = await registerAndOnboardUser('Maya', 'female', 'male');
    const userC = await registerAndOnboardUser('Chloe', 'female', 'male');
    const userD = await registerAndOnboardUser('David', 'male', 'female');
    console.log(`Users created: A=${userA.id}, B=${userB.id}, C=${userC.id}, D=${userD.id}\n`);

    // 2. Setup Socket.IO listener for User B to test real-time notification
    let socketReceivedMatch: any = null;
    const socketB = io(SOCKET_BASE, {
      auth: { token: userB.token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      socketB.on('connect', () => {
        resolve();
      });
      setTimeout(resolve, 1500);
    });

    socketB.on('match:created', (data: any) => {
      socketReceivedMatch = data;
    });

    // 3. User A Likes User B -> No match yet
    const likeRes1 = await fetch(`${API_BASE}/discovery/${userB.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const likeData1 = (await likeRes1.json()) as any;
    record(
      'Matching: Unilateral Like',
      likeRes1.status === 200 && likeData1.data?.liked && !likeData1.data?.matched,
      'User A liked User B without reciprocal like (matched = false)'
    );

    // Verify User A and User B have 0 matches
    const countRes1 = await fetch(`${API_BASE}/matches/count`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const countData1 = (await countRes1.json()) as any;
    record(
      'Matching: Zero Match Count Pre-Reciprocal',
      countRes1.status === 200 && countData1.data?.count === 0,
      'Match count is 0 before reciprocal like'
    );

    // 4. User B Likes User A Back -> RECIPROCAL MATCH TRIGGERED!
    const likeRes2 = await fetch(`${API_BASE}/discovery/${userA.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const likeData2 = (await likeRes2.json()) as any;
    const matchIdAB = likeData2.data?.matchId || likeData2.data?.match?.id;

    record(
      'Matching: Reciprocal Like Triggered Match',
      likeRes2.status === 200 && likeData2.data?.matched === true && !!matchIdAB,
      `Mutual match created! Match ID: ${matchIdAB}`
    );

    // Wait a brief moment for socket emission
    await new Promise((r) => setTimeout(r, 600));

    record(
      'Real-Time: Socket.IO match:created Delivery',
      socketReceivedMatch !== null && socketReceivedMatch.matchId === matchIdAB,
      `User B received match:created event via socket with matchId=${socketReceivedMatch?.matchId}`
    );

    socketB.disconnect();

    // 5. Test Duplicate Match Prevention: User B likes User A again
    const dupLikeRes = await fetch(`${API_BASE}/discovery/${userA.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const dupLikeData = (await dupLikeRes.json()) as any;
    const dupMatchId = dupLikeData.data?.matchId || dupLikeData.data?.match?.id;

    record(
      'Matching: Duplicate Match Prevention',
      dupMatchId === matchIdAB,
      'Repeated like returned existing match ID without duplicate record creation'
    );

    // 6. Super Like Reciprocal Matching:
    // User A Super-Likes User C, then User C Likes User A
    const superLikeRes = await fetch(`${API_BASE}/discovery/${userC.id}/super-like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const superLikeData = (await superLikeRes.json()) as any;
    record(
      'Matching: Super Like Initial Interaction',
      superLikeRes.status === 200 && Boolean(superLikeData.data?.superLiked),
      'Super like recorded successfully'
    );

    const cLikesARes = await fetch(`${API_BASE}/discovery/${userA.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userC.token}` },
    });
    const cLikesAData = (await cLikesARes.json()) as any;
    const matchIdAC = cLikesAData.data?.matchId || cLikesAData.data?.match?.id;
    record(
      'Matching: Super Like Reciprocal Match',
      cLikesARes.status === 200 && cLikesAData.data?.matched === true && !!matchIdAC,
      `Super like resulted in mutual match ID: ${matchIdAC}`
    );

    // 7. Test User A Match Retrieval (Should have 2 matches: Maya & Chloe)
    const matchesARes = await fetch(`${API_BASE}/matches`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const matchesAData = (await matchesARes.json()) as any;
    const matchesA = matchesAData.data?.matches || [];

    record(
      'Matching: Retrieve User Matches List',
      matchesARes.status === 200 && matchesA.length === 2,
      `User A has exactly 2 matches (retrieved: ${matchesA.length})`
    );

    // Verify returned profile fields
    const partnerUser = matchesA[0]?.user;
    record(
      'Matching: Profile Sanitization & Structure',
      partnerUser &&
        partnerUser.id > 0 &&
        !!partnerUser.firstName &&
        partnerUser.password === undefined &&
        partnerUser.password_hash === undefined,
      `Partner: ${partnerUser?.firstName}, age: ${partnerUser?.age} (no passwords exposed)`
    );

    // 8. Test Match Count Endpoint
    const countRes2 = await fetch(`${API_BASE}/matches/count`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const countData2 = (await countRes2.json()) as any;
    record(
      'Matching: Live Match Count Endpoint',
      countRes2.status === 200 && countData2.data?.count === 2,
      `Match count is exactly 2 for User A`
    );

    // 9. Test Match Details by ID
    const matchDetailRes = await fetch(`${API_BASE}/matches/${matchIdAB}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const matchDetailData = (await matchDetailRes.json()) as any;
    const detailMatch = matchDetailData.data?.match;

    record(
      'Matching: Match Details View by ID',
      matchDetailRes.status === 200 && detailMatch?.id === matchIdAB && detailMatch?.user?.id === userB.id,
      `Detail fetched partner: ${detailMatch?.user?.firstName}`
    );

    // 10. Security & IDOR Verification:
    // User D attempts to view User A & B's match details
    const unauthorizedDetailRes = await fetch(`${API_BASE}/matches/${matchIdAB}`, {
      headers: { Authorization: `Bearer ${userD.token}` },
    });
    record(
      'Security: Unauthorized Match Details Blocked (IDOR)',
      unauthorizedDetailRes.status === 404,
      'Unrelated User D cannot access User A & B match details (HTTP 404)'
    );

    // User D attempts to unmatch User A & B
    const unauthorizedUnmatchRes = await fetch(`${API_BASE}/matches/${matchIdAB}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userD.token}` },
    });
    record(
      'Security: Unauthorized Unmatch Blocked',
      unauthorizedUnmatchRes.status === 404,
      'Unrelated User D cannot unmatch User A & B (HTTP 404)'
    );

    // 11. Legitimate Unmatch: User A unmatches User B
    const unmatchRes = await fetch(`${API_BASE}/matches/${matchIdAB}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const unmatchData = (await unmatchRes.json()) as any;
    record(
      'Matching: Authorized Unmatch Success',
      unmatchRes.status === 200 && unmatchData.success === true,
      'User A successfully removed match'
    );

    // 12. Verify Match is removed from both User A and User B
    const postUnmatchARes = await fetch(`${API_BASE}/matches`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const postUnmatchAData = (await postUnmatchARes.json()) as any;
    const matchesAfterUnmatchA = postUnmatchAData.data?.matches || [];
    const containsB = matchesAfterUnmatchA.some((m: any) => m.id === matchIdAB);

    record(
      'Matching: Unmatched Removal Verification for User A',
      !containsB && matchesAfterUnmatchA.length === 1,
      `User A matches count reduced to 1, User B excluded`
    );

    const postUnmatchBRes = await fetch(`${API_BASE}/matches`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const postUnmatchBData = (await postUnmatchBRes.json()) as any;
    const matchesAfterUnmatchB = postUnmatchBData.data?.matches || [];
    const containsA = matchesAfterUnmatchB.some((m: any) => m.id === matchIdAB);

    record(
      'Matching: Unmatched Removal Verification for User B',
      !containsA && matchesAfterUnmatchB.length === 0,
      `User B has 0 matches remaining`
    );

    // 13. Verify GET /api/matches/:matchId returns 404 after unmatch
    const postUnmatchDetailRes = await fetch(`${API_BASE}/matches/${matchIdAB}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    record(
      'Matching: Details Return 404 for Unmatched Pair',
      postUnmatchDetailRes.status === 404,
      'Unmatched match detail correctly returns 404'
    );

  } catch (error: any) {
    record('Fatal Execution Error', false, error.message || String(error));
  }

  console.log('\n=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`📊 DAY 11 TEST RESULTS: ${passedCount}/${results.length} tests passed (${Math.round((passedCount / results.length) * 100)}%)`);
  if (failedCount > 0) {
    console.log(`❌ ${failedCount} tests failed.`);
  } else {
    console.log('🎉 ALL DAY 11 MATCHING AND REAL-TIME TESTS PASSED PERFECTLY!');
  }
  console.log('=============================================================\n');

  return failedCount === 0;
}

runDay11MatchingTestSuite().then((success) => {
  process.exit(success ? 0 : 1);
});
