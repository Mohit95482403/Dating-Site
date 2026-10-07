// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Verification Script

import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('   CONNECTLY DAY 24: ADVANCED COMMUNITIES & GROUPS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Database Schema Verification
    console.log('1. Database Tables Verification');
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND TABLE_NAME IN (
          'community_categories',
          'communities',
          'community_members',
          'community_events',
          'community_event_rsvps',
          'community_messages',
          'community_invites',
          'community_moderation_logs',
          'community_reports'
        )
    `);
    const tableNames = tables.map((t) => t.TABLE_NAME);
    assert('community_categories exists', tableNames.includes('community_categories'));
    assert('communities exists', tableNames.includes('communities'));
    assert('community_members exists', tableNames.includes('community_members'));
    assert('community_events exists', tableNames.includes('community_events'));
    assert('community_event_rsvps exists', tableNames.includes('community_event_rsvps'));
    assert('community_messages exists', tableNames.includes('community_messages'));
    assert('community_invites exists', tableNames.includes('community_invites'));
    assert('community_moderation_logs exists', tableNames.includes('community_moderation_logs'));
    assert('community_reports exists', tableNames.includes('community_reports'));

    // Check posts table community_id column
    const [colRows] = await pool.query<RowDataPacket[]>(`
      SELECT COLUMN_NAME FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'posts' AND column_name = 'community_id'
    `);
    assert('posts.community_id column exists', colRows.length > 0);

    // 2. Authentication & Test Tokens
    console.log('\n2. User Authentication & Session Tokens');
    const adminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@connectly.com', password: 'AdminPass123!' }),
    });
    const adminData = (await adminRes.json()) as any;
    const adminToken = adminData?.data?.tokens?.accessToken || adminData?.data?.accessToken;
    assert('Admin login successful', adminRes.status === 200 && Boolean(adminToken));

    // Get a regular user
    const [regUsers] = await pool.query<RowDataPacket[]>(
      `SELECT id, email FROM users WHERE role = 'user' AND status = 'active' LIMIT 1`
    );
    let userToken = adminToken;
    let testUserId = adminData?.data?.user?.id || 1;

    if (regUsers.length > 0) {
      testUserId = regUsers[0].id;
      // Login or simulate with adminToken for role-level checks
    }

    // 3. Categories Endpoint
    console.log('\n3. Categories & Discovery');
    const catRes = await fetch(`${API_BASE}/communities/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catData = (await catRes.json()) as any;
    assert('GET /api/communities/categories returns 200', catRes.status === 200);
    assert('Categories list is seeded', Array.isArray(catData?.data) && catData.data.length >= 5);

    // 4. Communities List & Debounced Search
    console.log('\n4. Communities List & Search');
    const commRes = await fetch(`${API_BASE}/communities?search=Travelers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const commData = (await commRes.json()) as any;
    assert('GET /api/communities?search returns 200', commRes.status === 200);
    const commList = Array.isArray(commData?.data) ? commData.data : commData?.data?.communities || [];
    assert(
      'Search finds Maharashtra Travelers',
      commList.some((c: any) => c.slug === 'maharashtra-travelers')
    );

    // 5. Community Detail by Slug
    console.log('\n5. Community Profile by Slug');
    const detailRes = await fetch(`${API_BASE}/communities/maharashtra-travelers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = (await detailRes.json()) as any;
    assert('GET /api/communities/:slug returns 200', detailRes.status === 200);
    const commId = detailData?.data?.id;
    assert('Community ID retrieved', Boolean(commId));
    assert('Community has creator details', Boolean(detailData?.data?.creatorId));

    // 6. Community Posts
    console.log('\n6. Community Posts Integration');
    const postsRes = await fetch(`${API_BASE}/communities/${commId}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const postsData = (await postsRes.json()) as any;
    assert('GET /api/communities/:id/posts returns 200', postsRes.status === 200);
    const postsList = Array.isArray(postsData?.data) ? postsData.data : postsData?.data?.posts || [];
    assert('Posts array returned', Array.isArray(postsList));

    // 7. Community Events & Concurrency RSVP
    console.log('\n7. Community Events & RSVP System');
    const evRes = await fetch(`${API_BASE}/communities/${commId}/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const evData = (await evRes.json()) as any;
    assert('GET /api/communities/:id/events returns 200', evRes.status === 200);
    const evList = Array.isArray(evData?.data) ? evData.data : evData?.data?.events || [];
    assert('Events array returned', Array.isArray(evList));

    if (evList.length > 0) {
      const eventId = evList[0].id;
      // Test RSVP
      const rsvpRes = await fetch(`${API_BASE}/communities/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'going' }),
      });
      assert('POST /events/:id/rsvp returns 200', rsvpRes.status === 200);

      // Verify attendees count was updated safely
      const [evCheck] = await pool.query<RowDataPacket[]>(
        `SELECT attendees_count FROM community_events WHERE id = ?`,
        [eventId]
      );
      assert('attendees_count reflects RSVP', evCheck[0]?.attendees_count >= 1);
    }

    // 8. Group Chat Messaging
    console.log('\n8. Group Chat Messaging');
    const sendMsgRes = await fetch(`${API_BASE}/communities/${commId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ content: 'Hello members! Day 24 group chat verification test.' }),
    });
    const sendMsgData = (await sendMsgRes.json()) as any;
    assert('POST /communities/:id/messages succeeds', sendMsgRes.status === 201 || sendMsgRes.status === 200);

    const getMsgRes = await fetch(`${API_BASE}/communities/${commId}/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getMsgData = (await getMsgRes.json()) as any;
    assert('GET /communities/:id/messages returns message list', Array.isArray(getMsgData?.data));
    assert(
      'Sent message appears in chat list',
      getMsgData?.data?.some((m: any) => m.content.includes('Day 24 group chat'))
    );

    // 9. Community Analytics (Staff)
    console.log('\n9. Community Analytics');
    const analyticsRes = await fetch(`${API_BASE}/communities/${commId}/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = (await analyticsRes.json()) as any;
    assert('GET /communities/:id/analytics returns 200', analyticsRes.status === 200);
    assert('Analytics totalMembers computed', typeof analyticsData?.data?.totalMembers === 'number');
    assert('Analytics totalPosts computed', typeof analyticsData?.data?.totalPosts === 'number');

    // 10. Moderation & Safety Reporting
    console.log('\n10. Moderation & Safety Reporting');
    const reportRes = await fetch(`${API_BASE}/communities/${commId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targetType: 'community',
        targetId: commId,
        reason: 'spam',
        details: 'Day 24 verification safety report check',
      }),
    });
    assert('POST /communities/:id/report returns 201', reportRes.status === 201);

    const getReportsRes = await fetch(`${API_BASE}/communities/${commId}/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportsData = (await getReportsRes.json()) as any;
    assert('Staff can inspect community reports', Array.isArray(reportsData?.data));

    // Summary
    console.log('\n====================================================');
    console.log(`   DAY 24 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
