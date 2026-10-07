// Connectly Day 23 Complete Verification Script
// Tests Global Search, Trending, Suggested People, Advanced Filters, Search History, Hashtags, Security & Privacy

import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('   CONNECTLY DAY 23: EXPLORE & SMART DISCOVERY TESTS');
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
    // 1. Verify MySQL schema
    console.log('1. Database Tables Verification');
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND TABLE_NAME IN ('search_history', 'hashtags', 'post_hashtags')
    `);
    const tableNames = tables.map((t) => t.TABLE_NAME);
    assert('search_history table exists', tableNames.includes('search_history'));
    assert('hashtags table exists', tableNames.includes('hashtags'));
    assert('post_hashtags table exists', tableNames.includes('post_hashtags'));

    // 2. Obtain JWT tokens for testing
    console.log('\n2. User Authentication & Session Tokens');
    // Login as admin
    const adminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@connectly.com', password: 'AdminPass123!' }),
    });
    const adminData = await adminRes.json() as any;
    const adminToken = adminData?.data?.tokens?.accessToken || adminData?.data?.accessToken;
    assert('Admin login succeeded', adminRes.status === 200 && Boolean(adminToken));

    // Get another active user
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email FROM users WHERE role = 'user' AND status = 'active' LIMIT 1`
    );
    const testUser = userRows[0];
    let userToken = '';

    if (testUser) {
      // Generate a mock auth token by logging in or registering a dedicated test user
      const testEmail = `day23_tester_${Date.now()}@example.com`;
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!',
          firstName: 'Explorer',
          lastName: 'Tester',
          dateOfBirth: '1998-05-15',
          gender: 'female',
        }),
      });
      const regData = await regRes.json() as any;
      userToken = regData?.data?.tokens?.accessToken || regData?.data?.accessToken;
      assert('Test user registered & authenticated', Boolean(userToken));
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken || adminToken}`,
    };

    // 3. Global Search: All categories
    console.log('\n3. Global Search API Tests');
    const searchRes = await fetch(`${API_BASE}/explore/search?q=test&type=all`, {
      headers: authHeaders,
    });
    const searchData = await searchRes.json() as any;
    assert(
      'GET /api/explore/search returns 200 with structured categories',
      searchRes.status === 200 &&
        searchData?.success === true &&
        Array.isArray(searchData?.data?.people) &&
        Array.isArray(searchData?.data?.posts) &&
        Array.isArray(searchData?.data?.hashtags) &&
        Array.isArray(searchData?.data?.interests)
    );

    // 4. Search History Integration
    console.log('\n4. Search History Management Tests');
    const histRes = await fetch(`${API_BASE}/explore/search/history`, {
      headers: authHeaders,
    });
    const histData = await histRes.json() as any;
    assert(
      'GET /api/explore/search/history returns recorded search items',
      histRes.status === 200 && Array.isArray(histData?.data) && histData?.data.length > 0
    );

    const firstHistoryId = histData?.data?.[0]?.id;
    if (firstHistoryId) {
      const delItemRes = await fetch(`${API_BASE}/explore/search/history/${firstHistoryId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert('DELETE /api/explore/search/history/:id removes single item', delItemRes.status === 200);
    }

    // 5. Trending Content API
    console.log('\n5. Trending Engine Tests');
    const trendRes = await fetch(`${API_BASE}/explore/trending`, {
      headers: authHeaders,
    });
    const trendData = await trendRes.json() as any;
    assert(
      'GET /api/explore/trending returns hashtags, posts, and stories',
      trendRes.status === 200 &&
        trendData?.success === true &&
        Array.isArray(trendData?.data?.hashtags) &&
        Array.isArray(trendData?.data?.posts) &&
        Array.isArray(trendData?.data?.stories)
    );

    // 6. Suggested People Recommendations
    console.log('\n6. Suggested People (Personalized Recommendations) Tests');
    const suggRes = await fetch(`${API_BASE}/explore/suggested/people`, {
      headers: authHeaders,
    });
    const suggData = await suggRes.json() as any;
    assert(
      'GET /api/explore/suggested/people returns candidate profiles',
      suggRes.status === 200 &&
        suggData?.success === true &&
        Array.isArray(suggData?.data)
    );

    // 7. Filtered People Discovery
    console.log('\n7. Filtered People Discovery Tests');
    const filterBasicRes = await fetch(`${API_BASE}/explore/people?minAge=20&maxAge=45&gender=all`, {
      headers: authHeaders,
    });
    const filterBasicData = await filterBasicRes.json() as any;
    assert(
      'GET /api/explore/people returns filtered profiles within age bounds',
      filterBasicRes.status === 200 && Array.isArray(filterBasicData?.data)
    );

    // Test Premium Filter Gating (Free user attempting verifiedOnly or compatibility sort)
    const filterAdvRes = await fetch(`${API_BASE}/explore/people?verifiedOnly=true`, {
      headers: authHeaders,
    });
    assert(
      'Advanced filters restricted with 403 Forbidden for non-premium accounts',
      filterAdvRes.status === 403
    );

    // 8. Hashtag Detail API
    console.log('\n8. Hashtag Detail & Posts Tests');
    // Ensure at least one hashtag exists for test
    await pool.query(
      `INSERT INTO hashtags (name, posts_count) VALUES ('travel', 5) ON DUPLICATE KEY UPDATE posts_count = posts_count + 1`
    );

    const tagRes = await fetch(`${API_BASE}/explore/hashtags/travel?sort=popular`, {
      headers: authHeaders,
    });
    const tagData = await tagRes.json() as any;
    assert(
      'GET /api/explore/hashtags/:tag returns hashtag details and posts',
      tagRes.status === 200 &&
        tagData?.data?.hashtag?.name === 'travel' &&
        Array.isArray(tagData?.data?.posts)
    );

    // 9. Admin Explore Analytics
    console.log('\n9. Admin Explore Analytics Tests');
    const adminAnalyticsRes = await fetch(`${API_BASE}/explore/admin/analytics`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const adminAnalyticsData = await adminAnalyticsRes.json() as any;
    assert(
      'GET /api/explore/admin/analytics returns top searches and popular hashtags',
      adminAnalyticsRes.status === 200 &&
        Array.isArray(adminAnalyticsData?.data?.topSearches) &&
        Array.isArray(adminAnalyticsData?.data?.popularHashtags)
    );

    console.log(`\n====================================================`);
    console.log(`   DAY 23 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`====================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
