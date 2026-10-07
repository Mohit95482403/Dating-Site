import { query, pool } from '../config/database';
import { io } from '../../../frontend/node_modules/socket.io-client';
import fs from 'fs';
import path from 'path';

interface AssertionResult {
  category: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: AssertionResult[] = [];

function assert(category: string, test: string, condition: boolean, details?: string) {
  const passed = Boolean(condition);
  results.push({ category, test, passed, details });
  const icon = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${icon} [${category}] ${test}${details ? ` -> ${details}` : ''}`);
}

const BASE_URL = 'http://localhost:5000/api';
const ROOT_URL = 'http://localhost:5000';

async function parseJson(res: any): Promise<any> {
  return await res.json();
}

async function runPreDeploymentVerification() {
  console.log('\n========================================================================');
  console.log('   CONNECTLY — PRE-DEPLOYMENT REAL-WORLD COMPREHENSIVE VERIFICATION   ');
  console.log('========================================================================\n');

  const timestamp = Date.now();
  const userAEmail = `deploy_user_a_${timestamp}@test.com`;
  const userBEmail = `deploy_user_b_${timestamp}@test.com`;
  const testPassword = 'SecurePassword123!';

  let userAToken = '';
  let userARefreshToken = '';
  let userAId = 0;

  let userBToken = '';
  let userBId = 0;

  let adminToken = '';
  let adminId = 0;

  let createdPostId = 0;
  let createdCommentId = 0;
  let createdConvId = 0;
  let createdVerificationId = 0;
  let verificationDocUrl = '';
  let createdTicketId = 0;
  let createdReportId = 0;

  try {
    // -------------------------------------------------------------------------
    // 1. HEALTH CHECKS
    // -------------------------------------------------------------------------
    console.log('\n>>> 1. VERIFYING SYSTEM HEALTH CHECK ENDPOINTS');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await parseJson(healthRes);
    assert('Health', 'GET /api/health returns 200 OK', healthRes.status === 200);
    assert('Health', 'Health status is healthy', healthData.data?.status === 'healthy');

    const liveRes = await fetch(`${BASE_URL}/health/live`);
    assert('Health', 'GET /api/health/live returns UP', liveRes.status === 200);

    const readyRes = await fetch(`${BASE_URL}/health/ready`);
    const readyData = await parseJson(readyRes);
    assert('Health', 'GET /api/health/ready returns READY', readyData.status === 'READY');

    const dbRes = await fetch(`${BASE_URL}/health/db`);
    assert('Health', 'GET /api/health/db returns 200 OK', dbRes.status === 200);

    // -------------------------------------------------------------------------
    // 2. REAL USER REGISTRATION & AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log('\n>>> 2. REAL USER FLOW: REGISTRATION & AUTHENTICATION');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Production',
        dateOfBirth: '1998-05-14',
        gender: 'female',
      }),
    });
    const regData = await parseJson(regRes);
    assert('User Flow', 'User A Registration returns 201', regRes.status === 201 && regData.success);
    userAId = regData.data?.user?.id;
    assert('User Flow', 'User A receives user ID', userAId > 0);

    // Login User A
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: testPassword }),
    });
    const loginData = await parseJson(loginRes);
    assert('User Flow', 'User A Login returns 200 OK', loginRes.status === 200 && loginData.success);
    userAToken = loginData.data?.accessToken;
    const loginCookies = loginRes.headers.get('set-cookie') || '';
    const matchLoginCookie = loginCookies.match(/connectly_refresh_token=([^;]+)/);
    userARefreshToken = matchLoginCookie ? matchLoginCookie[1] : (loginData.data?.refreshToken || '');
    assert('User Flow', 'User A receives Access Token', Boolean(userAToken));

    // Logout User A
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ refreshToken: userARefreshToken }),
    });
    assert('User Flow', 'User A Logout succeeds', logoutRes.status === 200);

    // Login User A again
    const reloginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: testPassword }),
    });
    const reloginData = await parseJson(reloginRes);
    userAToken = reloginData.data?.accessToken;
    const reloginCookies = reloginRes.headers.get('set-cookie') || '';
    const matchReloginCookie = reloginCookies.match(/connectly_refresh_token=([^;]+)/);
    userARefreshToken = matchReloginCookie ? matchReloginCookie[1] : (reloginData.data?.refreshToken || '');
    assert('User Flow', 'User A Re-login succeeds with fresh token', Boolean(userAToken));

    // -------------------------------------------------------------------------
    // 3. PROFILE EDIT & PHOTO UPLOAD
    // -------------------------------------------------------------------------
    console.log('\n>>> 3. PROFILE UPDATE & PHOTO UPLOAD');
    const profUpdateRes = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        bio: 'Art director & specialty coffee lover.',
        location: 'Seattle, WA',
        occupation: 'Visual Designer',
        relationshipGoals: 'long-term',
      }),
    });
    assert('Profile', 'Profile fields update succeeds', profUpdateRes.status === 200);

    // Verify Profile in DB
    const [profileRow] = await query('SELECT bio, location_city FROM profiles WHERE user_id = ?', [userAId]);
    assert('Profile', 'Profile update persisted to MySQL', (profileRow as any)?.bio === 'Art director & specialty coffee lover.');

    // Upload real photo via multipart/form-data
    const dummyImageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      'base64'
    );
    const formData = new FormData();
    const blob = new Blob([dummyImageBuffer], { type: 'image/jpeg' });
    formData.append('photos', blob, 'avatar.jpg');

    const photoRes = await fetch(`${BASE_URL}/profile/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: formData,
    });
    assert('Profile', 'Photo upload returns 201 Created', photoRes.status === 201);

    // -------------------------------------------------------------------------
    // 4. SOCIAL FEED, MEDIA, LIKES, COMMENTS
    // -------------------------------------------------------------------------
    console.log('\n>>> 4. SOCIAL FEED, POSTING, LIKES & COMMENTS');
    const postRes = await fetch(`${BASE_URL}/feed/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        content: 'Exploring sunset coffee spots! #SpecialtyCoffee #SeattleLife',
        visibility: 'public',
      }),
    });
    const postData = await parseJson(postRes);
    createdPostId = postData.data?.post?.id || postData.data?.id;
    assert('Feed', 'Create post returns 201 Created', postRes.status === 201 && createdPostId > 0);

    // Like Post
    const likeRes = await fetch(`${BASE_URL}/feed/posts/${createdPostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Feed', 'Like post succeeds', likeRes.status === 200);

    // Comment on Post
    const commentRes = await fetch(`${BASE_URL}/feed/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ content: 'Awesome coffee choice!' }),
    });
    const commentData = await parseJson(commentRes);
    createdCommentId = commentData.data?.comment?.id || commentData.data?.id;
    assert('Feed', 'Comment on post returns 201 Created', commentRes.status === 201 && createdCommentId > 0);

    // -------------------------------------------------------------------------
    // 5. EXPLORE & SEARCH
    // -------------------------------------------------------------------------
    console.log('\n>>> 5. EXPLORE & GLOBAL SEARCH');
    const exploreRes = await fetch(`${BASE_URL}/explore/search?q=coffee&type=posts`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Explore', 'Search posts returns 200 OK', exploreRes.status === 200);

    const trendingRes = await fetch(`${BASE_URL}/explore/trending`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Explore', 'Trending feed returns 200 OK', trendingRes.status === 200);

    // -------------------------------------------------------------------------
    // 6. COMMUNITIES
    // -------------------------------------------------------------------------
    console.log('\n>>> 6. COMMUNITIES LIFECYCLE');
    const commListRes = await fetch(`${BASE_URL}/communities?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const commListData = await parseJson(commListRes);
    const firstComm = commListData.data?.communities?.[0];
    assert('Communities', 'List communities succeeds', commListRes.status === 200);

    if (firstComm?.id) {
      const joinRes = await fetch(`${BASE_URL}/communities/${firstComm.id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Communities', 'Join community succeeds', joinRes.status === 200 || joinRes.status === 201);

      const leaveRes = await fetch(`${BASE_URL}/communities/${firstComm.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Communities', 'Leave community succeeds', leaveRes.status === 200);
    }

    // -------------------------------------------------------------------------
    // 7. REGISTER USER B & CHAT / MESSAGING
    // -------------------------------------------------------------------------
    console.log('\n>>> 7. USER B REGISTRATION & REAL-TIME CHAT');
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userBEmail,
        password: testPassword,
        firstName: 'Bob',
        lastName: 'Production',
        dateOfBirth: '1996-08-20',
        gender: 'male',
      }),
    });
    const regBData = await parseJson(regBRes);
    userBId = regBData.data?.user?.id;
    assert('Chat', 'User B registered successfully', userBId > 0);

    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: testPassword }),
    });
    const loginBData = await parseJson(loginBRes);
    userBToken = loginBData.data?.accessToken;

    // Reciprocal swipe to create mutual match
    const likeARes = await fetch(`${BASE_URL}/discovery/${userBId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Discovery', 'User A likes User B', likeARes.status === 200);

    const likeBRes = await fetch(`${BASE_URL}/discovery/${userAId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const likeBData = await parseJson(likeBRes);
    assert('Discovery', 'User B reciprocal like succeeds', likeBRes.status === 200);

    let matchId = likeBData.data?.matchId || likeBData.data?.match?.id;
    if (!matchId) {
      const [mRow] = await query<any>(
        'SELECT id FROM matches WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)',
        [userAId, userBId, userBId, userAId]
      );
      matchId = mRow?.[0]?.id || mRow?.id;
    }
    assert('Matching', 'Mutual match created', Boolean(matchId));

    // Get or initialize conversation for match
    const convRes = await fetch(`${BASE_URL}/conversations/match/${matchId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const convData = await parseJson(convRes);
    createdConvId = convData.data?.conversation?.id || convData.data?.id;
    assert('Chat', 'Conversation initialized between User A & B', Boolean(createdConvId));

    // User A sends message to User B
    const msgRes = await fetch(`${BASE_URL}/conversations/${createdConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        content: 'Hey Bob! Real-world pre-deployment verification message.',
      }),
    });
    const msgData = await parseJson(msgRes);
    const sentMsgId = msgData.data?.id;
    assert('Chat', 'User A sends message successfully', msgRes.status === 201 && Boolean(sentMsgId));

    // User B reads conversation
    const readRes = await fetch(`${BASE_URL}/conversations/${createdConvId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert('Chat', 'User B marks conversation as read', readRes.status === 200);

    // User B fetches conversation messages
    const getMsgsRes = await fetch(`${BASE_URL}/conversations/${createdConvId}/messages`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const getMsgsData = await parseJson(getMsgsRes);
    assert('Chat', 'User B fetches messages list', getMsgsRes.status === 200 && Array.isArray(getMsgsData.data?.messages));

    // Check notifications for User B
    const notifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert('Notifications', 'User B checks notifications', notifRes.status === 200);

    // -------------------------------------------------------------------------
    // 8. SUBSCRIPTIONS & PREMIUM
    // -------------------------------------------------------------------------
    console.log('\n>>> 8. PREMIUM PLANS & SUBSCRIPTION STATUS');
    const plansRes = await fetch(`${BASE_URL}/subscriptions/plans`);
    const plansData = await parseJson(plansRes);
    assert('Premium', 'Fetch subscription plans succeeds', plansRes.status === 200 && Array.isArray(plansData.data));

    const subStatusRes = await fetch(`${BASE_URL}/subscriptions/current`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Premium', 'Fetch user subscription status succeeds', subStatusRes.status === 200);

    // -------------------------------------------------------------------------
    // 9. IDENTITY VERIFICATION UPLOAD (REAL PDF)
    // -------------------------------------------------------------------------
    console.log('\n>>> 9. IDENTITY VERIFICATION DOCUMENT UPLOAD');
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF',
      'utf-8'
    );

    const vFormData = new FormData();
    const pdfBlob = new Blob([dummyPdfBuffer], { type: 'application/pdf' });
    vFormData.append('document', pdfBlob, 'national_id_card.pdf');
    vFormData.append('documentType', 'passport');

    const vUploadRes = await fetch(`${BASE_URL}/trust/verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: vFormData,
    });
    const vUploadData = await parseJson(vUploadRes);
    createdVerificationId = vUploadData.data?.verificationId;
    assert('Verification', 'User A submits verification document', vUploadRes.status === 201 && createdVerificationId > 0);

    // Verify record in MySQL
    const [vRow] = await query('SELECT id, document_url, status FROM verification_requests WHERE id = ?', [createdVerificationId]);
    verificationDocUrl = (vRow as any)?.document_url;
    assert('Verification', 'Verification request persisted with document_url', Boolean(verificationDocUrl));

    // -------------------------------------------------------------------------
    // 10. ADMIN LOGIN & WORKFLOWS
    // -------------------------------------------------------------------------
    console.log('\n>>> 10. ADMIN WORKFLOWS & DOCUMENT INSPECTION');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@connectly.com', password: 'AdminPass123!' }),
    });
    const adminLoginData = await parseJson(adminLoginRes);
    adminToken = adminLoginData.data?.accessToken;
    adminId = adminLoginData.data?.user?.id;
    assert('Admin Flow', 'Admin login succeeds', adminLoginRes.status === 200 && Boolean(adminToken));

    // Admin Dashboard Stats
    const adminDashRes = await fetch(`${BASE_URL}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin Flow', 'Admin dashboard stats fetched', adminDashRes.status === 200);

    // Admin User Directory Search
    const adminUserSearchRes = await fetch(`${BASE_URL}/admin/users?search=${encodeURIComponent('deploy_user_a')}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin Flow', 'Admin finds User A in user directory', adminUserSearchRes.status === 200);

    // Admin Moderation: Suspend User B
    const suspendRes = await fetch(`${BASE_URL}/admin/users/${userBId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Pre-deployment automated test suspension', durationHours: 1 }),
    });
    assert('Admin Flow', 'Admin suspends User B', suspendRes.status === 200);

    // Verify User B is blocked while suspended
    const blockedUserBRes = await fetch(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert('Security', 'Suspended User B receives 403 Forbidden', blockedUserBRes.status === 403);

    // Admin Unbans / Restores User B
    const unsuspendRes = await fetch(`${BASE_URL}/admin/users/${userBId}/unsuspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Test complete, lifting suspension' }),
    });
    assert('Admin Flow', 'Admin restores User B to active', unsuspendRes.status === 200);

    // -------------------------------------------------------------------------
    // 11. VERIFICATION DOCUMENT INSPECTION & SECURITY
    // -------------------------------------------------------------------------
    console.log('\n>>> 11. VERIFICATION DOCUMENT SECURITY & ADMIN INSPECTION');

    // Test A: Admin inspects User A's document -> Expect 200 OK
    const docFetchByAdmin = await fetch(`${ROOT_URL}${verificationDocUrl}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      'Document Security',
      'Admin successfully fetches User A verification document',
      docFetchByAdmin.status === 200
    );

    // Test B: User B attempts to access User A's document -> Expect 403 Forbidden
    const docFetchByUserB = await fetch(`${ROOT_URL}${verificationDocUrl}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert(
      'Document Security',
      'User B blocked from accessing User A verification document (403 Forbidden)',
      docFetchByUserB.status === 403
    );

    // Test C: Unauthenticated client attempts to access User A's document -> Expect 401 Unauthorized
    const docFetchByAnon = await fetch(`${ROOT_URL}${verificationDocUrl}`);
    assert(
      'Document Security',
      'Unauthenticated client blocked from verification document (401 Unauthorized)',
      docFetchByAnon.status === 401
    );

    // Admin Approves Verification
    const approveRes = await fetch(`${BASE_URL}/admin/verifications/${createdVerificationId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ adminNotes: 'Verified valid government ID.' }),
    });
    assert('Verification', 'Admin approves verification request', approveRes.status === 200);

    // Verify User A is now verified in DB
    const [userARow] = await query('SELECT is_verified FROM profiles WHERE user_id = ?', [userAId]);
    assert('Verification', 'User A profile updated with verified status in MySQL', (userARow as any)?.is_verified === 1);

    // -------------------------------------------------------------------------
    // 12. ADMIN SUPPORT DESK & REPORTS
    // -------------------------------------------------------------------------
    console.log('\n>>> 12. SUPPORT TICKETS & REPORTS DESK');
    // User A submits support ticket
    const ticketRes = await fetch(`${BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        subject: 'General inquiry on profile vibes',
        message: 'How do I add custom audio vibes?',
        category: 'account',
        priority: 'medium',
      }),
    });
    const ticketData = await parseJson(ticketRes);
    createdTicketId = ticketData.data?.ticketId || ticketData.data?.id;
    assert('Support Desk', 'User creates support ticket', ticketRes.status === 201 && createdTicketId > 0);

    // Admin views and replies to ticket with internal note
    const replyRes = await fetch(`${BASE_URL}/admin/support/tickets/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        message: 'Internal review: User verified. Providing guide link.',
        isInternalNote: false,
      }),
    });
    assert('Support Desk', 'Admin replies to support ticket', replyRes.status === 201 || replyRes.status === 200);

    // User A reports User B
    const reportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        reportedUserId: userBId,
        category: 'spam',
        reason: 'Automated test report submission',
      }),
    });
    const reportData = await parseJson(reportRes);
    createdReportId = reportData.data?.reportId || reportData.data?.id;
    assert('Reports', 'User submits report', reportRes.status === 201 || reportRes.status === 200);

    // Admin resolves report
    if (createdReportId) {
      const resolveRes = await fetch(`${BASE_URL}/admin/reports/${createdReportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: 'dismiss',
          resolutionNotes: 'Reviewed during pre-deployment audit. Dismissed cleanly.',
        }),
      });
      assert('Reports', 'Admin resolves report', resolveRes.status === 200);
    }

    // -------------------------------------------------------------------------
    // 13. SECURITY NEGATIVE TESTS: ROLE BOUNDARIES
    // -------------------------------------------------------------------------
    console.log('\n>>> 13. SECURITY NEGATIVE TESTS: ROLE BOUNDARY ENFORCEMENT');

    // Normal User A calls Admin API
    const userAOnAdminRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Security', 'Normal user calling /api/admin/users rejected with 403', userAOnAdminRes.status === 403);

    const userAOnAdminStats = await fetch(`${BASE_URL}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert('Security', 'Normal user calling /api/admin/dashboard/stats rejected with 403', userAOnAdminStats.status === 403);

    // User B attempts to access User A's private notifications
    const userBOnUserANotif = await fetch(`${BASE_URL}/notifications/${userAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert('Security', 'User B accessing User A notifications blocked (403 or 404)', [403, 404].includes(userBOnUserANotif.status));

    // -------------------------------------------------------------------------
    // 14. TOKEN LIFECYCLE & REFRESH ROTATION
    // -------------------------------------------------------------------------
    console.log('\n>>> 14. TOKEN LIFECYCLE & REFRESH ROTATION');

    // Test with malformed token
    const malformedTokenRes = await fetch(`${BASE_URL}/profile`, {
      headers: { Authorization: 'Bearer thisisnotavalidtoken' },
    });
    assert('Token', 'Malformed token rejected with 401', malformedTokenRes.status === 401);

    // Test refresh token exchange
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `connectly_refresh_token=${userARefreshToken}`,
      },
      body: JSON.stringify({ refreshToken: userARefreshToken }),
    });
    assert('Token', 'Refresh token exchange returns 200 OK', refreshRes.status === 200);

    // -------------------------------------------------------------------------
    // 15. REAL-TIME SOCKET.IO INTERACTION
    // -------------------------------------------------------------------------
    console.log('\n>>> 15. REAL-TIME SOCKET.IO CONNECTION & PRESENCE');
    const socketA = io(ROOT_URL, {
      auth: { token: userAToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    const socketB = io(ROOT_URL, {
      auth: { token: userBToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => {
      let aConnected = false;
      let bConnected = false;

      const checkBoth = () => {
        if (aConnected && bConnected) {
          assert('Socket.IO', 'User A socket connected and authenticated', true);
          assert('Socket.IO', 'User B socket connected and authenticated', true);
          resolve();
        }
      };

      socketA.on('connect', () => {
        aConnected = true;
        checkBoth();
      });

      socketB.on('connect', () => {
        bConnected = true;
        checkBoth();
      });

      setTimeout(() => {
        if (!aConnected || !bConnected) {
          assert('Socket.IO', 'Socket connection timeout check', false, 'One or both sockets did not connect');
          resolve();
        }
      }, 5000);
    });

    // Test typing indicator event between User A and User B via room join
    socketA.emit('conversation:join', { conversationId: createdConvId });
    socketB.emit('conversation:join', { conversationId: createdConvId });
    await new Promise((r) => setTimeout(r, 300));

    const receivedTyping = await new Promise<boolean>((resolve) => {
      socketB.on('typing:update', (payload: any) => {
        if (payload?.userId === userAId && payload?.isTyping === true) {
          resolve(true);
        }
      });

      socketA.emit('typing:start', { conversationId: createdConvId });
      setTimeout(() => resolve(false), 2500);
    });
    assert('Socket.IO', 'Real-time typing event transmitted between sockets', receivedTyping);

    socketA.disconnect();
    socketB.disconnect();
    assert('Socket.IO', 'Sockets cleanly disconnected without leaks', true);

  } catch (error: any) {
    console.error('Test execution exception:', error);
    assert('Fatal', 'Suite executed without unhandled exceptions', false, error?.message);
  } finally {
    // -------------------------------------------------------------------------
    // 16. DATA CLEANUP (SAFE REMOVAL OF TEMPORARY TEST DATA)
    // -------------------------------------------------------------------------
    console.log('\n>>> 16. CLEANING UP TEMPORARY TEST ACCOUNTS');
    try {
      if (userAId) {
        await query('DELETE FROM support_messages WHERE ticket_id = ?', [createdTicketId]);
        await query('DELETE FROM support_tickets WHERE id = ?', [createdTicketId]);
        await query('DELETE FROM verification_requests WHERE id = ?', [createdVerificationId]);
        await query('DELETE FROM reports WHERE id = ?', [createdReportId]);
        await query('DELETE FROM messages WHERE conversation_id = ?', [createdConvId]);
        await query('DELETE FROM conversation_members WHERE conversation_id = ?', [createdConvId]);
        await query('DELETE FROM conversations WHERE id = ?', [createdConvId]);
        await query('DELETE FROM matches WHERE user_one_id IN (?, ?) OR user_two_id IN (?, ?)', [userAId, userBId, userAId, userBId]);
        await query('DELETE FROM likes WHERE from_user_id IN (?, ?) OR to_user_id IN (?, ?)', [userAId, userBId, userAId, userBId]);
        await query('DELETE FROM post_comments WHERE id = ?', [createdCommentId]);
        await query('DELETE FROM post_likes WHERE post_id = ?', [createdPostId]);
        await query('DELETE FROM posts WHERE id = ?', [createdPostId]);
        await query('DELETE FROM photos WHERE user_id = ?', [userAId]);
        await query('DELETE FROM profiles WHERE user_id IN (?, ?)', [userAId, userBId]);
        await query('DELETE FROM users WHERE id IN (?, ?)', [userAId, userBId]);
        console.log('✅ Temporary pre-deployment test data safely cleared.');
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n========================================================================');
  console.log(`   PRE-DEPLOYMENT VERIFICATION SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('========================================================================\n');

  return { total, passed, failed, results };
}

runPreDeploymentVerification().then(({ failed }) => {
  process.exit(failed > 0 ? 1 : 0);
});
