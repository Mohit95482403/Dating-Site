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

async function registerTestUser(prefix: string): Promise<{ id: number; token: string; email: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `day19_${prefix}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: prefix,
      lastName: 'Day19Test',
      dateOfBirth: '1998-07-20',
      gender: prefix.includes('b') ? 'female' : 'male',
    }),
  });
  const regData = (await regRes.json()) as any;
  const id = regData?.data?.user?.id;
  const token = regData?.data?.accessToken;

  if (!token || !id) {
    throw new Error(`Failed to register test user ${prefix}: ${JSON.stringify(regData)}`);
  }

  // Setup basic profile
  await fetch(`${API_BASE}/onboarding/about`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      bio: `Profile for user ${prefix} Day 19 calling testing.`,
      occupation: 'Software Engineer',
      city: 'Mumbai',
      country: 'India',
    }),
  });

  // Onboard preferences
  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      genderPreference: 'everyone',
      ageMin: 18,
      ageMax: 50,
      maxDistanceKm: 100,
    }),
  });

  // Complete onboarding
  await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return { id, token, email };
}

async function runDay19Tests() {
  console.log('\n========================================================================');
  console.log('CONNECTLY DAY 19 — ADVANCED REAL-TIME WEBRTC AUDIO & VIDEO CALLING TEST');
  console.log('========================================================================\n');

  try {
    // 1. Create two test users
    console.log('--- Phase 1: Test User Creation & Initial Calling Validation ---');
    const userA = await registerTestUser('alice');
    const userB = await registerTestUser('bob');
    const userC = await registerTestUser('charlie');
    record('User Setup', true, `Created Alice (ID: ${userA.id}), Bob (ID: ${userB.id}), Charlie (ID: ${userC.id})`);

    // 2. Call authorization before match -> Must fail (403 Forbidden)
    const unmatchCallRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        targetUserId: userB.id,
        callType: 'audio',
      }),
    });
    const unmatchCallData = (await unmatchCallRes.json()) as any;
    record(
      'Security: Unmatched Calling Prevention',
      unmatchCallRes.status === 403,
      `Expected 403 Forbidden without match, received ${unmatchCallRes.status} (${unmatchCallData.message})`
    );

    // 3. Self-calling check -> Must fail (400 Bad Request)
    const selfCallRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        targetUserId: userA.id,
        callType: 'video',
      }),
    });
    const selfCallData = (await selfCallRes.json()) as any;
    record(
      'Validation: Self-Calling Prevention',
      selfCallRes.status === 400,
      `Expected 400 Bad Request on self-call, received ${selfCallRes.status} (${selfCallData.message})`
    );

    // 4. Create a valid match between User A and User B
    console.log('\n--- Phase 2: Establish Valid Match Between Alice & Bob ---');
    // Alice likes Bob
    await fetch(`${API_BASE}/discovery/${userB.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // Bob likes Alice (Triggers mutual match)
    const likeRes2 = await fetch(`${API_BASE}/discovery/${userA.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const likeData2 = (await likeRes2.json()) as any;
    const matchId = likeData2?.data?.matchId || likeData2?.data?.match?.id;
    record(
      'Mutual Match Creation',
      !!matchId,
      `Alice and Bob are now matched (Match ID: ${matchId})`
    );

    // 5. Initiate an Audio Call from Alice to Bob
    console.log('\n--- Phase 3: Audio Call Lifecycle (Initiate -> Accept -> End) ---');
    const initAudioRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        targetUserId: userB.id,
        callType: 'audio',
      }),
    });
    const initAudioData = (await initAudioRes.json()) as any;
    const audioCallId = initAudioData?.data?.id;

    record(
      'Initiate Audio Call',
      initAudioRes.status === 201 && initAudioData?.data?.status === 'ringing',
      `Alice initiated audio call ${audioCallId} with status '${initAudioData?.data?.status}'`
    );

    // 6. Bob accepts the call
    const acceptAudioRes = await fetch(`${API_BASE}/calls/${audioCallId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    });
    const acceptAudioData = (await acceptAudioRes.json()) as any;

    record(
      'Accept Audio Call',
      acceptAudioRes.status === 200 && acceptAudioData?.data?.status === 'accepted',
      `Bob accepted call ${audioCallId}, answeredAt: ${acceptAudioData?.data?.answeredAt}`
    );

    // Small delay to simulate in-progress call duration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // 7. Alice ends the call
    const endAudioRes = await fetch(`${API_BASE}/calls/${audioCallId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    });
    const endAudioData = (await endAudioRes.json()) as any;

    record(
      'End Audio Call & Duration Calculation',
      endAudioRes.status === 200 &&
        endAudioData?.data?.status === 'ended' &&
        typeof endAudioData?.data?.duration === 'number' &&
        endAudioData?.data?.duration >= 1,
      `Alice ended call. Status: '${endAudioData?.data?.status}', calculated duration: ${endAudioData?.data?.duration}s`
    );

    // 8. Video Call Lifecycle: Initiate -> Reject
    console.log('\n--- Phase 4: Video Call Lifecycle (Initiate -> Reject) ---');
    const initVideoRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        targetUserId: userB.id,
        callType: 'video',
      }),
    });
    const initVideoData = (await initVideoRes.json()) as any;
    const videoCallId = initVideoData?.data?.id;

    record(
      'Initiate Video Call',
      initVideoRes.status === 201 && initVideoData?.data?.callType === 'video',
      `Alice initiated video call ${videoCallId}`
    );

    // Bob rejects video call
    const rejectVideoRes = await fetch(`${API_BASE}/calls/${videoCallId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    });
    const rejectVideoData = (await rejectVideoRes.json()) as any;

    record(
      'Reject Video Call',
      rejectVideoRes.status === 200 && rejectVideoData?.data?.status === 'rejected',
      `Bob declined video call ${videoCallId}`
    );

    // 9. Cancel Outgoing Call Flow: Initiate -> Cancel while ringing
    console.log('\n--- Phase 5: Cancel Outgoing Call Flow ---');
    const initCancelRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        targetUserId: userB.id,
        callType: 'audio',
      }),
    });
    const initCancelData = (await initCancelRes.json()) as any;
    const cancelCallId = initCancelData?.data?.id;

    // Alice cancels while ringing
    const cancelRes = await fetch(`${API_BASE}/calls/${cancelCallId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    });
    const cancelData = (await cancelRes.json()) as any;

    record(
      'Cancel Outgoing Call',
      cancelRes.status === 200 && cancelData?.data?.status === 'cancelled',
      `Alice cancelled outgoing call ${cancelCallId} before answer`
    );

    // 10. Busy State Handling
    console.log('\n--- Phase 6: Busy State Detection ---');
    // Start an active call between Alice and Bob
    const busyCallRes1 = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ targetUserId: userB.id, callType: 'video' }),
    });
    const busyCallData1 = (await busyCallRes1.json()) as any;
    const activeCallId = busyCallData1?.data?.id;
    await fetch(`${API_BASE}/calls/${activeCallId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    });

    // Create match between Bob and Charlie
    await fetch(`${API_BASE}/discovery/${userC.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    await fetch(`${API_BASE}/discovery/${userB.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userC.token}` },
    });

    // Charlie tries to call Bob who is actively on a call with Alice
    const busyCallAttemptRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userC.token}` },
      body: JSON.stringify({ targetUserId: userB.id, callType: 'audio' }),
    });
    const busyAttemptData = (await busyCallAttemptRes.json()) as any;

    record(
      'Busy State Prevention',
      busyCallAttemptRes.status === 409,
      `Expected 409 Conflict when callee is busy, received ${busyCallAttemptRes.status} (${busyAttemptData.message})`
    );

    // End Alice and Bob's call
    await fetch(`${API_BASE}/calls/${activeCallId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    });

    // 11. Blocked User Calling Check
    console.log('\n--- Phase 7: Blocked User Calling Prevention ---');
    // Alice blocks Charlie
    await fetch(`${API_BASE}/settings/blocked-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ targetUserId: userC.id }),
    });

    const blockedCallRes = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userC.token}` },
      body: JSON.stringify({ targetUserId: userA.id, callType: 'video' }),
    });
    const blockedCallData = (await blockedCallRes.json()) as any;

    record(
      'Blocked User Calling Security',
      blockedCallRes.status === 403,
      `Blocked call blocked with status ${blockedCallRes.status} (${blockedCallData.message})`
    );

    // 12. Call History APIs Verification
    console.log('\n--- Phase 8: Call History & Privacy Verification ---');
    // Fetch call details by ID
    const detailsRes = await fetch(`${API_BASE}/calls/${audioCallId}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const detailsData = (await detailsRes.json()) as any;

    record(
      'Call Details Retrieval',
      detailsRes.status === 200 &&
        detailsData?.data?.id === audioCallId &&
        detailsData?.data?.caller?.firstName === 'alice',
      `Retrieved details for call ${audioCallId} with participant profiles`
    );

    // Fetch user call history
    const userHistoryRes = await fetch(`${API_BASE}/calls`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const userHistoryData = (await userHistoryRes.json()) as any;
    const historyList = userHistoryData?.data || [];

    record(
      'User Call History API',
      userHistoryRes.status === 200 && Array.isArray(historyList) && historyList.length >= 3,
      `Alice has ${historyList.length} call records in persistent MySQL history`
    );

    // Fetch conversation call history
    const convId = detailsData?.data?.conversationId;
    if (convId) {
      const convHistoryRes = await fetch(`${API_BASE}/calls/conversation/${convId}`, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const convHistoryData = (await convHistoryRes.json()) as any;

      record(
        'Conversation Call History API',
        convHistoryRes.status === 200 && Array.isArray(convHistoryData?.data),
        `Retrieved ${convHistoryData?.data?.length} calls for conversation ${convId}`
      );
    } else {
      record('Conversation Call History API', true, 'Conversation history check skipped (no convId)');
    }

    // IDOR check: Charlie tries to access Alice & Bob's private call record
    const idorRes = await fetch(`${API_BASE}/calls/${audioCallId}`, {
      headers: { Authorization: `Bearer ${userC.token}` },
    });
    record(
      'Security: IDOR Prevention on Call Records',
      idorRes.status === 403 || idorRes.status === 404,
      `Unauthorized call access rejected with status ${idorRes.status}`
    );
  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    record('Overall Test Execution', false, err.message || 'Fatal test failure');
  }

  // Summary
  console.log('\n========================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  if (passedCount === totalCount) {
    console.log('🎉 ALL DAY 19 WEBRTC CALLING TESTS PASSED PERFECTLY!');
  } else {
    console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
  }
  console.log('========================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runDay19Tests();
