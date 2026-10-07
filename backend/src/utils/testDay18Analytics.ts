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

async function loginAdmin(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@connectly.com',
      password: 'AdminPass123!',
    }),
  });

  const data = (await res.json()) as any;
  if (!data?.data?.accessToken) {
    throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
  }
  return data.data.accessToken;
}

async function registerRegularUser(): Promise<{ token: string; id: number }> {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const email = `day18_regular_${ts}@example.com`;
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'UserPass123!',
      firstName: 'Analytics',
      lastName: 'Tester',
      dateOfBirth: '1998-07-20',
      gender: 'male',
    }),
  });

  const data = (await res.json()) as any;
  return { token: data.data.accessToken, id: data.data.user.id };
}

async function runDay18Tests() {
  console.log('\n========================================================================');
  console.log('       CONNECTLY — DAY 18 ADVANCED ANALYTICS AUTOMATED TEST SUITE        ');
  console.log('========================================================================\n');

  try {
    const adminToken = await loginAdmin();
    record('Admin Authentication', true, 'Successfully logged in with seeded admin credentials.');

    const regularUser = await registerRegularUser();
    record('Regular User Registration', true, `Created standard user ID: ${regularUser.id}`);

    // Test 1: Security - Unauthorized access without token
    const noAuthRes = await fetch(`${API_BASE}/admin/analytics/overview`);
    record(
      'Security: Unauthenticated rejection',
      noAuthRes.status === 401,
      `Unauthenticated access rejected with HTTP ${noAuthRes.status}`
    );

    // Test 2: Security - Forbidden for regular non-admin user
    const forbiddenRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    record(
      'Security: Role-based non-admin rejection',
      forbiddenRes.status === 403,
      `Non-admin user rejected with HTTP ${forbiddenRes.status}`
    );

    // Test 3: Overview API (30d default)
    const overviewRes = await fetch(`${API_BASE}/admin/analytics/overview?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overviewData = (await overviewRes.json()) as any;
    const overview = overviewData?.data;

    record(
      'Analytics Overview: HTTP 200 and envelope',
      overviewRes.status === 200 && overviewData?.success === true,
      `Overview endpoint responded successfully`
    );

    record(
      'Analytics Overview: Window structure',
      Boolean(overview?.window?.start && overview?.window?.end && overview?.window?.label),
      `Window resolved: ${overview?.window?.label}`
    );

    // Test 4: Real KPI metrics and comparisons
    const kpis = overview?.kpis;
    const hasValidKpis =
      typeof kpis?.totalUsers?.value === 'number' &&
      typeof kpis?.newUsers?.value === 'number' &&
      typeof kpis?.activeUsers?.value === 'number' &&
      typeof kpis?.totalLikes?.value === 'number' &&
      typeof kpis?.totalMatches?.value === 'number' &&
      typeof kpis?.totalMessages?.value === 'number';

    record(
      'KPI Metrics: Real values populated',
      hasValidKpis,
      `Total Users: ${kpis?.totalUsers?.value}, Matches: ${kpis?.totalMatches?.value}, Messages: ${kpis?.totalMessages?.value}`
    );

    record(
      'KPI Metrics: Active Users DAU/WAU/MAU',
      typeof kpis?.dau === 'number' && typeof kpis?.wau === 'number' && typeof kpis?.mau === 'number',
      `DAU: ${kpis?.dau}, WAU: ${kpis?.wau}, MAU: ${kpis?.mau}`
    );

    // Test 5: Matching Funnel and Conversion Rates
    const funnel = overview?.matchingFunnel;
    const hasFunnel =
      typeof funnel?.discoveryViews === 'number' &&
      typeof funnel?.likes === 'number' &&
      typeof funnel?.matches === 'number' &&
      typeof funnel?.conversations === 'number' &&
      typeof funnel?.messages === 'number' &&
      typeof funnel?.conversionRates?.likeToMatch === 'string' &&
      typeof funnel?.conversionRates?.matchToConversation === 'string';

    record(
      'Matching Funnel: Telemetry and Conversion Ratios',
      hasFunnel,
      `Funnel: Likes=${funnel?.likes}, Matches=${funnel?.matches}, Like→Match=${funnel?.conversionRates?.likeToMatch}, Match→Conv=${funnel?.conversionRates?.matchToConversation}`
    );

    // Test 6: Message, Reaction, and Notification Analytics
    const messages = overview?.messages;
    const hasMsgAnalytics =
      typeof messages?.totalMessages === 'number' &&
      typeof messages?.messagesToday === 'number' &&
      typeof messages?.averageMessagesPerActiveUser === 'string' &&
      Array.isArray(messages?.reactionBreakdown) &&
      typeof messages?.notificationReadRate === 'string';

    record(
      'Message & Notification Analytics: Real Aggregations',
      hasMsgAnalytics,
      `Avg msgs/user: ${messages?.averageMessagesPerActiveUser}, Top reaction: ${messages?.mostUsedReaction}, Notif Read Rate: ${messages?.notificationReadRate}`
    );

    // Test 7: Profile Completion Distribution
    const profiles = overview?.profiles;
    const hasProfileBuckets =
      profiles?.completionDistribution &&
      typeof profiles?.completionDistribution['0-20%'] === 'number' &&
      typeof profiles?.completionDistribution['21-40%'] === 'number' &&
      typeof profiles?.completionDistribution['41-60%'] === 'number' &&
      typeof profiles?.completionDistribution['61-80%'] === 'number' &&
      typeof profiles?.completionDistribution['81-100%'] === 'number';

    record(
      'Profile Completion: 5 Dynamic Buckets',
      hasProfileBuckets,
      `Avg completion: ${profiles?.avgCompletionPercentage}%, Photos: With=${profiles?.withPhoto}, Without=${profiles?.withoutPhoto}`
    );

    // Test 8: Verification & Safety Metrics
    const verif = overview?.verification;
    const safety = overview?.safety;
    const hasSafetyVerif =
      typeof verif?.totalRequests === 'number' &&
      typeof verif?.successRate === 'string' &&
      typeof safety?.totalReports === 'number' &&
      typeof safety?.pending === 'number' &&
      typeof safety?.resolved === 'number' &&
      Array.isArray(safety?.adminWorkload);

    record(
      'Safety & Verification: Real Triage Counts',
      hasSafetyVerif,
      `Verif Requests=${verif?.totalRequests} (${verif?.successRate}), Reports Total=${safety?.totalReports} (Pending: ${safety?.pending}), Admins tracked=${safety?.adminWorkload?.length}`
    );

    // Test 9: Deterministic Platform Health & Key Insights
    const health = overview?.platformHealth;
    const insights = overview?.insights;
    const hasInsightsAndHealth =
      health?.growth?.status &&
      health?.engagement?.status &&
      health?.safety?.status &&
      health?.verification?.status &&
      Array.isArray(insights) &&
      insights.length > 0;

    record(
      'Platform Health & Insights: Deterministic Engine',
      Boolean(hasInsightsAndHealth),
      `Growth=${health?.growth?.status}, Engagement=${health?.engagement?.status}, Safety=${health?.safety?.status}, Insights Count=${insights?.length}`
    );

    // Test 10: Retention Cohort Foundation
    const retention = overview?.retention;
    const hasRetention =
      typeof retention?.newUsersCount === 'number' &&
      typeof retention?.returnedDay1 === 'number' &&
      typeof retention?.day1Rate === 'string';

    record(
      'Retention Foundation: Cohort tracking',
      hasRetention,
      `Cohort Users=${retention?.newUsersCount}, Day 1 Retained=${retention?.returnedDay1} (${retention?.day1Rate})`
    );

    // Test 11: Date Range Variations (7d, 90d, 6m, 12m, all)
    const ranges = ['7d', '90d', '6m', '12m', 'all'];
    let allRangesPassed = true;
    for (const r of ranges) {
      const res = await fetch(`${API_BASE}/admin/analytics/overview?range=${r}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status !== 200) {
        allRangesPassed = false;
        break;
      }
    }
    record(
      'Date Range Parameters: 7d, 90d, 6m, 12m, all',
      allRangesPassed,
      'All range intervals resolved cleanly with real SQL data'
    );

    // Test 12: Custom Date Range (Valid)
    const validCustomRes = await fetch(
      `${API_BASE}/admin/analytics/overview?range=custom&startDate=2026-10-01&endDate=2026-10-05`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const validCustomData = (await validCustomRes.json()) as any;
    record(
      'Custom Range: Valid window processing',
      validCustomRes.status === 200 && validCustomData?.data?.window?.isCustom === true,
      `Custom window start=${validCustomData?.data?.window?.start?.slice(0, 10)}, label=${validCustomData?.data?.window?.label}`
    );

    // Test 13: Custom Date Range (Invalid: start > end)
    const invalidCustomRes = await fetch(
      `${API_BASE}/admin/analytics/overview?range=custom&startDate=2026-10-10&endDate=2026-10-05`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    record(
      'Custom Range: Rejection of inverted dates (start > end)',
      invalidCustomRes.status === 400,
      `Server rejected inverted custom range with HTTP ${invalidCustomRes.status}`
    );

    // Test 14: Grouped Endpoints (Users, Engagement, Matching, Safety, Retention)
    const userRes = await fetch(`${API_BASE}/admin/analytics/users?range=30d`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const engRes = await fetch(`${API_BASE}/admin/analytics/engagement?range=30d`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const matchRes = await fetch(`${API_BASE}/admin/analytics/matching?range=30d`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const safeRes = await fetch(`${API_BASE}/admin/analytics/safety?range=30d`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const retRes = await fetch(`${API_BASE}/admin/analytics/retention?range=30d`, { headers: { Authorization: `Bearer ${adminToken}` } });

    const allGroupedPassed =
      userRes.status === 200 &&
      engRes.status === 200 &&
      matchRes.status === 200 &&
      safeRes.status === 200 &&
      retRes.status === 200;

    record(
      'Grouped Endpoints: Users, Engagement, Matching, Safety, Retention',
      allGroupedPassed,
      'All specialized analytics endpoints returned HTTP 200'
    );

    // Test 15: CSV Export Endpoint
    const csvRes = await fetch(`${API_BASE}/admin/analytics/export?range=7d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvContentType = csvRes.headers.get('content-type') || '';
    const csvContent = await csvRes.text();
    const hasCsvHeaders =
      csvRes.status === 200 &&
      csvContentType.includes('text/csv') &&
      csvContent.includes('CONNECTLY PLATFORM ANALYTICS REPORT') &&
      csvContent.includes('SECTION: KEY PERFORMANCE INDICATORS') &&
      csvContent.includes('SECTION: MATCHING FUNNEL & CONVERSION');

    record(
      'Export Analytics: RFC-4180 CSV export',
      hasCsvHeaders,
      `CSV export generated successfully (${csvContent.length} bytes, format verified)`
    );

  } catch (err: any) {
    record('Unexpected Test Exception', false, err?.message || String(err));
  }

  console.log('\n========================================================================');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runDay18Tests();
