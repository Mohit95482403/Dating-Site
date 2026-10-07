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
  const email = `chat_test_${firstName.toLowerCase()}_${ts}@example.com`;
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
      dateOfBirth: '1998-05-15',
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
      bio: `Hello, I'm ${firstName}! Let's connect.`,
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

async function runDay12Tests() {
  console.log('\n======================================================');
  console.log('🚀 CONNECTLY DAY 12: REAL-TIME CHAT FOUNDATION TEST SUITE');
  console.log('======================================================\n');

  try {
    // ------------------------------------------------------------------
    // STEP 1: Create Test Users (Alex, Bella, Charlie)
    // ------------------------------------------------------------------
    console.log('--- Step 1: Setting up Users ---');
    const alex = await registerAndOnboardUser('Alex', 'male', 'female');
    const bella = await registerAndOnboardUser('Bella', 'female', 'male');
    const charlie = await registerAndOnboardUser('Charlie', 'male', 'female'); // Unrelated user

    record(
      'User Setup',
      Boolean(alex.id && bella.id && charlie.id),
      `Alex (ID: ${alex.id}), Bella (ID: ${bella.id}), Charlie (ID: ${charlie.id}) created and onboarded`
    );

    // ------------------------------------------------------------------
    // STEP 2: Mutual Like -> Match & Automatic Conversation Creation
    // ------------------------------------------------------------------
    console.log('\n--- Step 2: Creating Mutual Match & Verifying Conversation ---');
    // Alex likes Bella
    await fetch(`${API_BASE}/discovery/${bella.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alex.token}` },
    });

    // Bella likes Alex (Mutual Match!)
    const matchRes = await fetch(`${API_BASE}/discovery/${alex.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const matchData = (await matchRes.json()) as any;
    const matchId = matchData?.data?.matchId || matchData?.data?.match?.id;

    record('Mutual Match Created', Boolean(matchId), `Match ID: ${matchId}`);

    // Verify Conversation was automatically created
    const alexConvListRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const alexConvListData = (await alexConvListRes.json()) as any;
    const conv = alexConvListData?.data?.conversations?.[0];
    const convId = conv?.conversationId;

    record(
      'Automatic Conversation Creation',
      Boolean(convId && conv?.matchId === matchId && conv?.otherUser?.id === bella.id),
      `Conversation ID: ${convId} created for Match ${matchId} with partner Bella`
    );

    // ------------------------------------------------------------------
    // STEP 3: Conversation Retrieval & Unread Count API
    // ------------------------------------------------------------------
    console.log('\n--- Step 3: Conversation Details & Unread Count ---');
    const singleConvRes = await fetch(`${API_BASE}/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const singleConvData = (await singleConvRes.json()) as any;
    record(
      'GET /api/conversations/:id',
      singleConvRes.status === 200 && singleConvData?.data?.conversation?.conversationId === convId,
      'Single conversation details fetched successfully'
    );

    const unreadCountRes = await fetch(`${API_BASE}/conversations/unread-count`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const unreadCountData = (await unreadCountRes.json()) as any;
    record(
      'GET /api/conversations/unread-count',
      unreadCountRes.status === 200 && unreadCountData?.data?.count === 0,
      `Initial unread count is 0`
    );

    // ------------------------------------------------------------------
    // STEP 4: Security & IDOR Authorization Tests
    // ------------------------------------------------------------------
    console.log('\n--- Step 4: Security & IDOR Authorization Enforcement ---');
    // Charlie tries to access Alex & Bella's conversation
    const charlieAccessRes = await fetch(`${API_BASE}/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    record(
      'IDOR Protection on GET /api/conversations/:id',
      charlieAccessRes.status === 403,
      `Unmatched User Charlie blocked with status ${charlieAccessRes.status}`
    );

    // Charlie tries to read messages
    const charlieMsgAccessRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    record(
      'IDOR Protection on GET /api/conversations/:id/messages',
      charlieMsgAccessRes.status === 403,
      `Charlie blocked from reading messages with status ${charlieMsgAccessRes.status}`
    );

    // Charlie tries to send message to Alex & Bella's conversation
    const charlieSendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${charlie.token}` },
      body: JSON.stringify({ content: 'Unauthorized intrusion attempt' }),
    });
    record(
      'IDOR Protection on POST /api/conversations/:id/messages',
      charlieSendRes.status === 403,
      `Charlie blocked from posting messages with status ${charlieSendRes.status}`
    );

    // ------------------------------------------------------------------
    // STEP 5: Message Content Validation (Empty, Whitespace, Oversized)
    // ------------------------------------------------------------------
    console.log('\n--- Step 5: Message Content Validation ---');
    // Empty message
    const emptySendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: '' }),
    });
    record(
      'Validation: Empty Message Rejected',
      emptySendRes.status === 400,
      `Empty message rejected with status ${emptySendRes.status}`
    );

    // Whitespace only
    const whitespaceSendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: '     \n  \t   ' }),
    });
    record(
      'Validation: Whitespace-only Message Rejected',
      whitespaceSendRes.status === 400,
      `Whitespace-only message rejected with status ${whitespaceSendRes.status}`
    );

    // Oversized message (> 2000 chars)
    const longContent = 'A'.repeat(2005);
    const oversizedSendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: longContent }),
    });
    record(
      'Validation: Oversized (>2000 chars) Message Rejected',
      oversizedSendRes.status === 400,
      `Oversized message rejected with status ${oversizedSendRes.status}`
    );

    // ------------------------------------------------------------------
    // STEP 6: Real-Time Socket.IO Messaging & Persistence Test
    // ------------------------------------------------------------------
    console.log('\n--- Step 6: Socket.IO Connection & Real-Time Delivery ---');
    const alexSocket = io(SOCKET_BASE, {
      auth: { token: alex.token },
      transports: ['websocket'],
    });

    const bellaSocket = io(SOCKET_BASE, {
      auth: { token: bella.token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => alexSocket.on('connect', () => resolve())),
      new Promise<void>((resolve) => bellaSocket.on('connect', () => resolve())),
    ]);

    record(
      'Socket Authentication',
      alexSocket.connected && bellaSocket.connected,
      'Both Alex and Bella connected and authenticated via Socket.IO'
    );

    // Join conversation rooms
    alexSocket.emit('conversation:join', { conversationId: convId });
    bellaSocket.emit('conversation:join', { conversationId: convId });

    // Wait for room join to register
    await new Promise((r) => setTimeout(r, 200));

    // Prepare listener for Bella
    const receivedMessagesByBella: any[] = [];
    bellaSocket.on('message:new', (payload: any) => {
      receivedMessagesByBella.push(payload);
    });

    // Alex sends valid message via API
    const testMsgText = 'Hello Bella! So happy we matched! ✨';
    const sendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: testMsgText }),
    });
    const sendData = (await sendRes.json()) as any;
    const msgId = sendData?.data?.id;

    record(
      'POST /api/conversations/:id/messages (Alex -> Bella)',
      sendRes.status === 201 && sendData?.data?.content === testMsgText,
      `Message ID: ${msgId} created with status 201`
    );

    // Wait for socket broadcast
    await new Promise((r) => setTimeout(r, 500));

    const socketDelivered = receivedMessagesByBella.some(
      (p) => p.conversationId === convId && p.message?.id === msgId && p.message?.content === testMsgText
    );

    record(
      'Real-Time Socket Delivery (message:new)',
      socketDelivered,
      `Bella received real-time socket event for message ${msgId}`
    );

    // Check Bella's unread count
    const bellaConvRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaConvData = (await bellaConvRes.json()) as any;
    const bellaConv = bellaConvData?.data?.conversations?.[0];

    record(
      'Unread Count Tracking',
      bellaConv?.unreadCount === 1 && bellaConv?.lastMessage?.content === testMsgText,
      `Bella's unread count is 1 and last message preview is accurate`
    );

    // ------------------------------------------------------------------
    // STEP 7: Message Retrieval, Ordering & Pagination
    // ------------------------------------------------------------------
    console.log('\n--- Step 7: Pagination & Message Retrieval ---');
    // Send 3 more messages to test pagination
    for (let i = 1; i <= 3; i++) {
      await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
        body: JSON.stringify({ content: `Reply #${i} from Bella` }),
      });
      await new Promise((r) => setTimeout(r, 50));
    }

    // Fetch with limit=2
    const paginatedRes = await fetch(`${API_BASE}/conversations/${convId}/messages?limit=2`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const paginatedData = (await paginatedRes.json()) as any;
    const paginatedMessages = paginatedData?.data?.messages || [];
    const hasMore = paginatedData?.data?.hasMore;
    const nextCursor = paginatedData?.data?.nextCursor;

    record(
      'Message Pagination (limit=2, hasMore=true)',
      paginatedMessages.length === 2 && hasMore === true && Boolean(nextCursor),
      `Fetched 2 messages, hasMore: ${hasMore}, nextCursor: ${nextCursor}`
    );

    // Fetch older page with cursor
    const olderPageRes = await fetch(
      `${API_BASE}/conversations/${convId}/messages?limit=2&cursor=${nextCursor}`,
      {
        headers: { Authorization: `Bearer ${alex.token}` },
      }
    );
    const olderPageData = (await olderPageRes.json()) as any;
    const olderMessages = olderPageData?.data?.messages || [];

    record(
      'Cursor-based Pagination (Next Page)',
      olderMessages.length > 0 && olderMessages[0].id !== paginatedMessages[0].id,
      `Older messages retrieved using cursor ${nextCursor}`
    );

    // ------------------------------------------------------------------
    // STEP 8: Mark Conversation As Read
    // ------------------------------------------------------------------
    console.log('\n--- Step 8: Mark Conversation As Read ---');
    // Bella marks conversation as read
    const markReadRes = await fetch(`${API_BASE}/conversations/${convId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    record(
      'POST /api/conversations/:id/read',
      markReadRes.status === 200,
      'Mark as read API returned 200 OK'
    );

    const bellaUnreadAfter = await fetch(`${API_BASE}/conversations/unread-count`, {
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const bellaUnreadAfterData = (await bellaUnreadAfter.json()) as any;

    record(
      'Unread Reset Verification',
      bellaUnreadAfterData?.data?.count === 0,
      'Bella unread messages reset to 0'
    );

    // ------------------------------------------------------------------
    // STEP 9: Unmatch Security Test (Active Match Enforced)
    // ------------------------------------------------------------------
    console.log('\n--- Step 9: Unmatch Chat Restriction ---');
    // Alex unmatches Bella
    const unmatchRes = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    record('Alex unmatches Bella', unmatchRes.status === 200, 'Unmatch successful');

    // Alex tries to send another message to Bella after unmatch
    const postAfterUnmatchRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: 'Are you still there?' }),
    });
    record(
      'Messaging Blocked After Unmatch',
      postAfterUnmatchRes.status === 403,
      `Sending message after unmatch blocked with status ${postAfterUnmatchRes.status}`
    );

    // Disconnect sockets
    alexSocket.disconnect();
    bellaSocket.disconnect();

    // ------------------------------------------------------------------
    // FINAL SUMMARY
    // ------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('📊 DAY 12 CHAT TEST SUMMARY');
    console.log('======================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`Passed: ${passedCount} / ${totalCount}`);

    if (passedCount === totalCount) {
      console.log('\n🎉 ALL DAY 12 TESTS PASSED PERFECTLY!\n');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please review the output above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test suite encountered an unhandled error:', error);
    process.exit(1);
  }
}

runDay12Tests();
