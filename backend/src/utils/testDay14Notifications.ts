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
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `day14_${firstName.toLowerCase()}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  // Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName: 'Day14Tester',
      dateOfBirth: '1997-04-12',
      gender,
    }),
  });
  const regData = (await regRes.json()) as any;
  const id = regData?.data?.user?.id;
  const token = regData?.data?.accessToken;

  if (!token || !id) {
    throw new Error(`Failed to register user ${firstName}: ${JSON.stringify(regData)}`);
  }

  // Onboard about
  await fetch(`${API_BASE}/onboarding/about`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      bio: `Hello, I'm ${firstName}! Let's connect on Day 14.`,
      occupation: 'Engineer',
      city: 'Mumbai',
      country: 'India',
    }),
  });

  // Onboard preferences
  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      genderPreference: preferredGender,
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

  return { id, token };
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDay14Tests() {
  console.log('\n=============================================================');
  console.log('🚀 CONNECTLY DAY 14: NOTIFICATION SYSTEM & ACTIVITY CENTER');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------
    // Step 1: User Registration & Onboarding
    // -------------------------------------------------------------
    console.log('--- Step 1: Users Setup (Alex, Bella, Charlie) ---');
    const alex = await registerAndOnboardUser('Alex', 'male', 'female');
    const bella = await registerAndOnboardUser('Bella', 'female', 'male');
    const charlie = await registerAndOnboardUser('Charlie', 'male', 'female');

    record(
      'Users Setup',
      !!alex.id && !!bella.id && !!charlie.id,
      `Alex (ID: ${alex.id}), Bella (ID: ${bella.id}), Charlie (ID: ${charlie.id}) onboarded`
    );

    // Verify initial unread notification count is 0
    const initialCountRes = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const initialCountData = (await initialCountRes.json()) as any;
    record(
      'Initial Unread Count',
      initialCountData?.data?.unreadCount === 0,
      `Initial Bella unread count is 0`
    );

    // -------------------------------------------------------------
    // Step 2: Like Notification (One-Way Like)
    // -------------------------------------------------------------
    console.log('\n--- Step 2: One-Way Like Notification ---');
    // Alex likes Bella
    const likeRes = await fetch(`${API_BASE}/discovery/${bella.id}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${alex.token}`,
      },
    });
    const likeData = (await likeRes.json()) as any;
    record('Alex Likes Bella', likeData?.success && !likeData?.data?.matched, 'Alex liked Bella (one-way like)');

    // Allow async notification creation to complete
    await delay(350);

    // Bella checks notifications
    const bellaNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaNotifs = (await bellaNotifsRes.json()) as any;
    const likeNotif = bellaNotifs?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'LIKE_RECEIVED'
    );

    record(
      'LIKE_RECEIVED Notification',
      !!likeNotif && likeNotif.actorId === alex.id && likeNotif.referenceType === 'user',
      `Bella received LIKE_RECEIVED notification with actor Alex (ID: ${alex.id})`
    );

    // Verify Bella unread count is now 1
    const unreadCountRes1 = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const unreadCount1 = (await unreadCountRes1.json()) as any;
    record(
      'Unread Count After Like',
      unreadCount1?.data?.unreadCount === 1,
      `Bella unread notification count incremented to 1`
    );

    // -------------------------------------------------------------
    // Step 3: Super Like Notification
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Super Like Notification ---');
    // Charlie super-likes Bella
    const superLikeRes = await fetch(`${API_BASE}/discovery/${bella.id}/super-like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${charlie.token}`,
      },
    });
    const superLikeData = (await superLikeRes.json()) as any;
    record('Charlie Super Likes Bella', superLikeData?.success, 'Charlie sent Super Like to Bella');

    await delay(350);

    const bellaNotifsRes2 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaNotifs2 = (await bellaNotifsRes2.json()) as any;
    const superLikeNotif = bellaNotifs2?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'SUPERLIKE_RECEIVED'
    );

    record(
      'SUPERLIKE_RECEIVED Notification',
      !!superLikeNotif && superLikeNotif.actorId === charlie.id,
      `Bella received SUPERLIKE_RECEIVED notification from Charlie`
    );

    // -------------------------------------------------------------
    // Step 4: Mutual Match Notification
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Mutual Match Notification ---');
    // Bella likes Alex back -> Forms mutual match!
    const matchRes = await fetch(`${API_BASE}/discovery/${alex.id}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bella.token}`,
      },
    });
    const matchData = (await matchRes.json()) as any;
    const matchId = matchData?.data?.matchId || matchData?.data?.match?.id;
    record('Mutual Match Formed', !!matchId, `Mutual match formed with ID: ${matchId}`);

    await delay(400);

    // Verify Alex received MATCH_CREATED notification
    const alexNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const alexNotifs = (await alexNotifsRes.json()) as any;
    const alexMatchNotif = alexNotifs?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'MATCH_CREATED'
    );

    record(
      'MATCH_CREATED for User A (Alex)',
      !!alexMatchNotif && alexMatchNotif.referenceType === 'match' && Number(alexMatchNotif.referenceId) === matchId,
      `Alex received MATCH_CREATED notification for Match ID ${matchId}`
    );

    // Verify Bella received MATCH_CREATED notification
    const bellaNotifsRes3 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaNotifs3 = (await bellaNotifsRes3.json()) as any;
    const bellaMatchNotif = bellaNotifs3?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'MATCH_CREATED'
    );

    record(
      'MATCH_CREATED for User B (Bella)',
      !!bellaMatchNotif && bellaMatchNotif.referenceType === 'match' && Number(bellaMatchNotif.referenceId) === matchId,
      `Bella received MATCH_CREATED notification for Match ID ${matchId}`
    );

    // -------------------------------------------------------------
    // Step 5: New Message Notification (Intelligent room check)
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Intelligent New Message Notification ---');
    // Find conversation ID between Alex and Bella
    const convsRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const convsData = (await convsRes.json()) as any;
    const conversationId = convsData?.data?.conversations?.[0]?.id;

    record('Conversation Found', !!conversationId, `Found Conversation ID: ${conversationId}`);

    // Alex sends a message when Bella is NOT in conversation room
    const msgRes = await fetch(`${API_BASE}/messages/${conversationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alex.token}`,
      },
      body: JSON.stringify({ content: 'Hey Bella, great matching with you!' }),
    });
    const msgData = (await msgRes.json()) as any;
    const messageId = msgData?.data?.id || msgData?.data?.message?.id;

    record('Message Sent', !!messageId, `Message ${messageId} sent by Alex`);

    await delay(400);

    // Bella checks notifications for NEW_MESSAGE
    const bellaNotifsRes4 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaNotifs4 = (await bellaNotifsRes4.json()) as any;
    const msgNotif = bellaNotifs4?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'NEW_MESSAGE'
    );

    record(
      'NEW_MESSAGE Notification',
      !!msgNotif && msgNotif.referenceType === 'conversation' && Number(msgNotif.referenceId) === conversationId,
      `Bella received NEW_MESSAGE notification referencing Conversation ${conversationId}`
    );

    // -------------------------------------------------------------
    // Step 6: Message Reaction Notification
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Reaction Notification ---');
    // Bella reacts to Alex's message with ❤️
    const reactRes = await fetch(`${API_BASE}/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bella.token}`,
      },
      body: JSON.stringify({ reaction: '❤️' }),
    });
    const reactData = (await reactRes.json()) as any;
    record('Bella Reacts to Message', reactData?.success, 'Bella added reaction ❤️');

    await delay(400);

    // Alex checks notifications for REACTION_RECEIVED
    const alexNotifsRes2 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const alexNotifs2 = (await alexNotifsRes2.json()) as any;
    const reactionNotif = alexNotifs2?.data?.notifications?.find(
      (n: any) => n.type.toUpperCase() === 'REACTION_RECEIVED'
    );

    record(
      'REACTION_RECEIVED Notification',
      !!reactionNotif && reactionNotif.actorId === bella.id,
      `Alex received REACTION_RECEIVED notification from Bella`
    );

    // -------------------------------------------------------------
    // Step 7: Mark Single Notification As Read
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Read Receipt & Mark As Read ---');
    if (likeNotif) {
      const markRes = await fetch(`${API_BASE}/notifications/${likeNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${bella.token}` },
      });
      const markData = (await markRes.json()) as any;
      record('Mark Single Notification As Read', markData?.success, `Notification ${likeNotif.id} marked read`);

      // Verify notification is marked read in GET
      const verifyRes = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${bella.token}` },
      });
      const verifyData = (await verifyRes.json()) as any;
      const updatedLikeNotif = verifyData?.data?.notifications?.find((n: any) => n.id === likeNotif.id);

      record(
        'Verify is_read and read_at',
        updatedLikeNotif?.isRead === true && !!updatedLikeNotif?.readAt,
        `Notification ${likeNotif.id} has isRead: true and readAt: ${updatedLikeNotif?.readAt}`
      );
    }

    // -------------------------------------------------------------
    // Step 8: Mark All Notifications As Read
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Mark All As Read ---');
    const markAllRes = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const markAllData = (await markAllRes.json()) as any;
    record('Mark All As Read', markAllData?.success, `Mark all returned markedCount: ${markAllData?.data?.markedCount}`);

    // Verify unread count is 0
    const zeroCountRes = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const zeroCountData = (await zeroCountRes.json()) as any;
    record(
      'Unread Count Reset to 0',
      zeroCountData?.data?.unreadCount === 0,
      `Bella unread notifications count is now 0`
    );

    // Verify filter=unread returns 0 items
    const unreadFilterRes = await fetch(`${API_BASE}/notifications?filter=unread`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const unreadFilterData = (await unreadFilterRes.json()) as any;
    record(
      'Filter=Unread Returns Empty',
      unreadFilterData?.data?.notifications?.length === 0,
      `filter=unread returned 0 notifications after mark-all-read`
    );

    // -------------------------------------------------------------
    // Step 9: Delete Notification
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Delete Notification ---');
    if (superLikeNotif) {
      const delRes = await fetch(`${API_BASE}/notifications/${superLikeNotif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${bella.token}` },
      });
      const delData = (await delRes.json()) as any;
      record('Delete Notification API', delData?.success, `Notification ${superLikeNotif.id} deleted`);

      // Verify it's gone
      const verifyDelRes = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${bella.token}` },
      });
      const verifyDelData = (await verifyDelRes.json()) as any;
      const stillExists = verifyDelData?.data?.notifications?.some((n: any) => n.id === superLikeNotif.id);
      record('Verify Notification Removed', !stillExists, `Notification ${superLikeNotif.id} no longer in list`);
    }

    // -------------------------------------------------------------
    // Step 10: Security & Authorization (IDOR)
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Security & IDOR Enforcement ---');
    // Charlie attempts to mark Alex's notification as read
    if (alexMatchNotif) {
      const idorReadRes = await fetch(`${API_BASE}/notifications/${alexMatchNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${charlie.token}` },
      });
      record(
        'IDOR Protection on Mark Read',
        idorReadRes.status === 403,
        `Charlie blocked with 403 when marking Alex notification`
      );

      // Charlie attempts to delete Alex's notification
      const idorDelRes = await fetch(`${API_BASE}/notifications/${alexMatchNotif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${charlie.token}` },
      });
      record(
        'IDOR Protection on Delete',
        idorDelRes.status === 403,
        `Charlie blocked with 403 when deleting Alex notification`
      );
    }

    // Unauthenticated access
    const noAuthRes = await fetch(`${API_BASE}/notifications`);
    record(
      'Unauthenticated Access Blocked',
      noAuthRes.status === 401,
      `Access without token blocked with 401 Unauthorized`
    );

    // -------------------------------------------------------------
    // Step 11: Real-Time Socket.IO Notification Delivery
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Real-Time Socket.IO Notification Delivery ---');
    const bellaSocket = io(SOCKET_BASE, {
      auth: { token: bella.token },
      transports: ['websocket'],
    });

    const socketConnected = await new Promise<boolean>((resolve) => {
      bellaSocket.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });
    record('Bella Socket Authenticated', socketConnected, `Bella connected to Socket.IO gateway`);

    let receivedSocketNotif: any = null;
    let receivedCountUpdate: any = null;

    bellaSocket.on('notification:new', (payload: any) => {
      receivedSocketNotif = payload;
    });

    bellaSocket.on('notification:count-updated', (payload: any) => {
      receivedCountUpdate = payload;
    });

    // Register Dave to like Bella while Bella is connected to Socket.IO
    const dave = await registerAndOnboardUser('Dave', 'male', 'female');
    await fetch(`${API_BASE}/discovery/${bella.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dave.token}` },
    });

    await delay(600);

    record(
      'Socket Real-Time notification:new',
      !!receivedSocketNotif && receivedSocketNotif.actorId === dave.id,
      `Bella received notification:new event in real time from Dave`
    );

    record(
      'Socket Real-Time notification:count-updated',
      !!receivedCountUpdate && typeof receivedCountUpdate.unreadCount === 'number',
      `Bella received notification:count-updated with unreadCount: ${receivedCountUpdate?.unreadCount}`
    );

    bellaSocket.disconnect();
  } catch (err: any) {
    console.error('Fatal test error:', err);
    record('Day 14 Test Execution', false, err.message);
  }

  // -------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('📊 DAY 14 NOTIFICATION SYSTEM TEST SUMMARY');
  console.log('=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Passed: ${passedCount} / ${totalCount}`);

  if (passedCount === totalCount) {
    console.log('\n🎉 ALL DAY 14 NOTIFICATION & ACTIVITY TESTS PASSED PERFECTLY!\n');
  } else {
    console.error(`\n❌ ${totalCount - passedCount} TESTS FAILED!\n`);
    process.exit(1);
  }
  process.exit(0);
}

runDay14Tests();
