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
  const email = `day13_${firstName.toLowerCase()}_${ts}@example.com`;
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
      occupation: 'Designer',
      city: 'Pune',
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

async function runDay13Tests() {
  console.log('\n=============================================================');
  console.log('🚀 CONNECTLY DAY 13: ADVANCED REAL-TIME CHAT TEST SUITE');
  console.log('=============================================================\n');

  try {
    // ------------------------------------------------------------------
    // STEP 1: Setup Users and Reciprocal Match
    // ------------------------------------------------------------------
    console.log('--- Step 1: User Registration & Match Connection ---');
    const alex = await registerAndOnboardUser('Alex', 'male', 'female');
    const bella = await registerAndOnboardUser('Bella', 'female', 'male');
    const charlie = await registerAndOnboardUser('Charlie', 'male', 'female'); // Unrelated user

    record('Users Setup', Boolean(alex.id && bella.id && charlie.id), 'Alex, Bella, Charlie onboarded');

    // Create mutual match
    await fetch(`${API_BASE}/discovery/${bella.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const matchRes = await fetch(`${API_BASE}/discovery/${alex.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    const matchData = (await matchRes.json()) as any;
    const matchId = matchData?.data?.matchId || matchData?.data?.match?.id;

    record('Mutual Match Connection', Boolean(matchId), `Match ID: ${matchId}`);

    // Get conversation ID
    const convListRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const convListData = (await convListRes.json()) as any;
    const conv = convListData?.data?.conversations?.[0];
    const convId = conv?.conversationId;

    record('Conversation Verified', Boolean(convId), `Conversation ID: ${convId}`);

    // ------------------------------------------------------------------
    // STEP 2: Multi-Socket Presence & Last Seen Tracking
    // ------------------------------------------------------------------
    console.log('\n--- Step 2: Multi-Socket Presence & Last Seen ---');
    // Connect Bella socket to observe Alex's presence
    const bellaSocket = io(SOCKET_BASE, {
      auth: { token: bella.token },
      transports: ['websocket'],
    });

    await new Promise<void>((res) => bellaSocket.on('connect', () => res()));

    let bellaObservedPresence: any[] = [];
    bellaSocket.on('presence:update', (payload: any) => {
      bellaObservedPresence.push(payload);
    });

    // Alex connects Tab 1
    const alexTab1 = io(SOCKET_BASE, {
      auth: { token: alex.token },
      transports: ['websocket'],
    });
    await new Promise<void>((res) => alexTab1.on('connect', () => res()));
    await new Promise((r) => setTimeout(r, 200));

    const onlineEvent = bellaObservedPresence.find((p) => p.userId === alex.id && p.isOnline === true);
    record(
      'Presence: User Comes Online',
      Boolean(onlineEvent),
      'Bella received real-time presence:update (Alex Online)'
    );

    // Alex connects Tab 2 (Multi-device/Multi-tab)
    const alexTab2 = io(SOCKET_BASE, {
      auth: { token: alex.token },
      transports: ['websocket'],
    });
    await new Promise<void>((res) => alexTab2.on('connect', () => res()));
    await new Promise((r) => setTimeout(r, 200));

    // Clear events
    bellaObservedPresence = [];

    // Alex disconnects Tab 1 -> User should REMAIN online because Tab 2 is active!
    alexTab1.disconnect();
    await new Promise((r) => setTimeout(r, 300));

    const prematureOffline = bellaObservedPresence.some((p) => p.userId === alex.id && p.isOnline === false);
    record(
      'Multi-Socket Support: Tab 1 disconnect keeps user Online',
      !prematureOffline,
      'Alex remains online while Tab 2 is still connected'
    );

    // Alex disconnects Tab 2 -> NOW Alex is completely offline!
    alexTab2.disconnect();
    await new Promise((r) => setTimeout(r, 400));

    const offlineEvent = bellaObservedPresence.find((p) => p.userId === alex.id && p.isOnline === false);
    record(
      'Presence: Complete Offline Transition & Last Seen',
      Boolean(offlineEvent && offlineEvent.lastSeenAt),
      `Alex transitioned to offline with lastSeenAt: ${offlineEvent?.lastSeenAt}`
    );

    // Check presence query API
    let alexPresenceQuery: any = null;
    await new Promise<void>((resolve) => {
      bellaSocket.emit('presence:check', { userId: alex.id }, (res: any) => {
        alexPresenceQuery = res;
        resolve();
      });
      setTimeout(resolve, 1000);
    });

    record(
      'Presence: presence:check Callback Query',
      alexPresenceQuery?.isOnline === false && Boolean(alexPresenceQuery?.lastSeenAt),
      'Presence check confirmed offline with persisted last_seen_at'
    );

    // Reconnect Alex
    const alexSocket = io(SOCKET_BASE, {
      auth: { token: alex.token },
      transports: ['websocket'],
    });
    await new Promise<void>((res) => alexSocket.on('connect', () => res()));
    await new Promise((r) => setTimeout(r, 200));

    // Join conversation rooms
    alexSocket.emit('conversation:join', { conversationId: convId });
    bellaSocket.emit('conversation:join', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 200));

    // ------------------------------------------------------------------
    // STEP 3: Real-Time Typing Indicators & Debounce
    // ------------------------------------------------------------------
    console.log('\n--- Step 3: Real-Time Typing Indicators ---');
    let bellaTypingEvents: any[] = [];
    bellaSocket.on('typing:update', (payload: any) => {
      bellaTypingEvents.push(payload);
    });

    // Alex starts typing
    alexSocket.emit('typing:start', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 250));

    const typingStartEvent = bellaTypingEvents.find(
      (e) => e.conversationId === convId && e.userId === alex.id && e.isTyping === true
    );
    record(
      'Typing: Start Indicator Broadcast',
      Boolean(typingStartEvent && typingStartEvent.userName === 'Alex'),
      'Bella received real-time typing:update with Alex name'
    );

    // Alex stops typing
    alexSocket.emit('typing:stop', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 250));

    const typingStopEvent = bellaTypingEvents.find(
      (e) => e.conversationId === convId && e.userId === alex.id && e.isTyping === false
    );
    record(
      'Typing: Stop Indicator Broadcast',
      Boolean(typingStopEvent),
      'Bella received real-time typing:update (stopped)'
    );

    // Security: Charlie attempts typing:start on Alex-Bella's conversation
    const charlieSocket = io(SOCKET_BASE, {
      auth: { token: charlie.token },
      transports: ['websocket'],
    });
    await new Promise<void>((res) => charlieSocket.on('connect', () => res()));

    let charlieTypingLeaked = false;
    bellaTypingEvents = [];
    charlieSocket.emit('typing:start', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));

    charlieTypingLeaked = bellaTypingEvents.some((e) => e.userId === charlie.id);
    record(
      'Typing: IDOR Protection against unauthorized typing',
      !charlieTypingLeaked,
      'Unauthorized user typing events are dropped by backend'
    );
    charlieSocket.disconnect();

    // ------------------------------------------------------------------
    // STEP 4: Sent -> Delivered -> Read Message Lifecycle
    // ------------------------------------------------------------------
    console.log('\n--- Step 4: Message Status Lifecycle (Sent -> Delivered -> Read) ---');
    // Alex sends message
    const sendRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alex.token}` },
      body: JSON.stringify({ content: 'Hello Bella, testing receipts!' }),
    });
    const sendData = (await sendRes.json()) as any;
    const msgId = sendData?.data?.id;

    record(
      'Message Status: Persisted as "sent"',
      sendRes.status === 201 && sendData?.data?.status === 'sent',
      `Message ${msgId} created with initial status 'sent'`
    );

    // Listen for status updates on Alex socket
    let alexObservedStatus: any[] = [];
    alexSocket.on('message:status', (payload: any) => {
      alexObservedStatus.push(payload);
    });

    // Bella acknowledges delivery
    bellaSocket.emit('message:delivered', { messageId: msgId, conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));

    const deliveredEvent = alexObservedStatus.find((s) => s.messageId === msgId && s.status === 'delivered');
    record(
      'Message Status: Acknowledged as "delivered"',
      Boolean(deliveredEvent),
      'Alex received real-time delivery update (status: delivered)'
    );

    // Listen for read updates on Alex socket
    let alexObservedRead: any[] = [];
    alexSocket.on('message:read', (payload: any) => {
      alexObservedRead.push(payload);
    });

    // Bella reads the conversation
    const markReadRes = await fetch(`${API_BASE}/conversations/${convId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bella.token}` },
    });
    await new Promise((r) => setTimeout(r, 300));

    const readEvent = alexObservedRead.find((r) => r.conversationId === convId && r.readerId === bella.id);
    record(
      'Message Status: Real-time Read Receipt Emitted',
      markReadRes.status === 200 && Boolean(readEvent),
      'Alex received real-time message:read event'
    );

    // Verify status in DB via messages API
    const messagesRes = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${alex.token}` },
    });
    const messagesData = (await messagesRes.json()) as any;
    const fetchedMsg = messagesData?.data?.messages?.find((m: any) => m.id === msgId);

    record(
      'Message Status: Database updated to "read"',
      fetchedMsg?.status === 'read',
      `Message status in MySQL is 'read'`
    );

    // ------------------------------------------------------------------
    // STEP 5: Message Reactions (Add, Toggle, Replace, Real-Time)
    // ------------------------------------------------------------------
    console.log('\n--- Step 5: Message Reactions & Real-Time Sync ---');
    let alexReactionEvents: any[] = [];
    alexSocket.on('message:reaction', (payload: any) => {
      alexReactionEvents.push(payload);
    });

    // Bella reacts ❤️ to Alex's message
    const reactRes1 = await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
      body: JSON.stringify({ reaction: '❤️' }),
    });
    const reactData1 = (await reactRes1.json()) as any;
    await new Promise((r) => setTimeout(r, 300));

    const reactionEvent1 = alexReactionEvents.find(
      (e) => e.messageId === msgId && e.reaction === '❤️' && e.action === 'added'
    );

    record(
      'Reactions: Add Reaction (❤️)',
      reactRes1.status === 200 && Boolean(reactionEvent1),
      'Reaction ❤️ added and real-time message:reaction broadcasted'
    );

    // Bella clicks ❤️ again -> Toggle OFF (remove)
    alexReactionEvents = [];
    const reactRes2 = await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
      body: JSON.stringify({ reaction: '❤️' }),
    });
    const reactData2 = (await reactRes2.json()) as any;
    await new Promise((r) => setTimeout(r, 300));

    const reactionEvent2 = alexReactionEvents.find(
      (e) => e.messageId === msgId && e.action === 'removed'
    );

    record(
      'Reactions: Toggle Reaction Off',
      reactRes2.status === 200 && reactData2.data?.action === 'removed' && Boolean(reactionEvent2),
      'Clicking same reaction removed it cleanly'
    );

    // Bella reacts 🔥 then replaces with 😂
    await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
      body: JSON.stringify({ reaction: '🔥' }),
    });

    const replaceRes = await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
      body: JSON.stringify({ reaction: '😂' }),
    });
    const replaceData = (await replaceRes.json()) as any;

    record(
      'Reactions: Replace Reaction (🔥 -> 😂)',
      replaceRes.status === 200 && replaceData.data?.action === 'updated',
      'Reaction updated to 😂 (at most one reaction per user per message)'
    );

    // Security: Charlie attempts to react to Alex's message
    const charlieReactRes = await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${charlie.token}` },
      body: JSON.stringify({ reaction: '❤️' }),
    });

    record(
      'Reactions: IDOR Protection against unauthorized reaction',
      charlieReactRes.status === 403,
      `Unmatched user Charlie blocked with status ${charlieReactRes.status}`
    );

    // Invalid reaction emoji rejected
    const invalidEmojiRes = await fetch(`${API_BASE}/messages/${msgId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bella.token}` },
      body: JSON.stringify({ reaction: '🍕' }),
    });

    record(
      'Reactions: Invalid Emoji Validation',
      invalidEmojiRes.status === 400,
      `Invalid emoji rejected with status ${invalidEmojiRes.status}`
    );

    // Disconnect sockets
    alexSocket.disconnect();
    bellaSocket.disconnect();

    // ------------------------------------------------------------------
    // FINAL SUMMARY
    // ------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('📊 DAY 13 ADVANCED CHAT TEST SUMMARY');
    console.log('=============================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`Passed: ${passedCount} / ${totalCount}`);

    if (passedCount === totalCount) {
      console.log('\n🎉 ALL DAY 13 ADVANCED REAL-TIME CHAT TESTS PASSED PERFECTLY!\n');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please review the output above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test suite encountered an unhandled error:', error);
    process.exit(1);
  }
}

runDay13Tests();
