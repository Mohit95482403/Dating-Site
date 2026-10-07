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
  const email = `day17_${prefix}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: prefix,
      lastName: 'Day17Test',
      dateOfBirth: '1996-05-15',
      gender: 'female',
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
      bio: `Profile for user ${prefix} Day 17 administration testing.`,
      occupation: 'Product Specialist',
      city: 'Bangalore',
      country: 'India',
    }),
  });

  return { id, token, email };
}

async function runDay17Tests() {
  console.log('\n========================================================================');
  console.log('   CONNECTLY DAY 17 — ADMIN PANEL & USER MODERATION TEST SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Admin Authentication & Role Enforcement
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Admin Authentication & Security Perimeter ---');

    // 1a. Log in as default seeded administrator
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@connectly.com',
        password: 'AdminPass123!',
      }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData?.data?.accessToken;
    const adminUser = adminLoginData?.data?.user;

    record(
      'Admin Login',
      adminLoginRes.status === 200 && adminUser?.role === 'admin' && !!adminToken,
      `Admin logged in successfully (role: ${adminUser?.role}, email: ${adminUser?.email})`
    );

    // 1b. Create regular member
    const regularUser = await registerTestUser('normal');

    // 1c. Non-admin attempts to access admin endpoint -> MUST fail with 403 Forbidden
    const forbiddenRes = await fetch(`${API_BASE}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    record(
      'Non-Admin 403 Blocked',
      forbiddenRes.status === 403,
      `Non-admin request rejected with HTTP ${forbiddenRes.status} (Forbidden)`
    );

    // 1d. Unauthenticated request -> MUST fail with 401 Unauthorized
    const unauthRes = await fetch(`${API_BASE}/admin/dashboard/stats`);
    record(
      'Unauthenticated 401 Blocked',
      unauthRes.status === 401,
      `Unauthenticated access blocked with HTTP ${unauthRes.status} (Unauthorized)`
    );

    // 1e. Authenticated Admin request -> MUST succeed with HTTP 200
    const adminAccessRes = await fetch(`${API_BASE}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = (await adminAccessRes.json()) as any;
    record(
      'Admin Authorization Verified',
      adminAccessRes.status === 200 && statsData?.data?.totalUsers !== undefined,
      `Admin access granted with HTTP 200: totalUsers=${statsData?.data?.totalUsers}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Dashboard Statistics & Range Filter Testing
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Real Database Statistics & Trend Filtering ---');

    for (const r of ['7d', '30d', '90d', 'all'] as const) {
      const rRes = await fetch(`${API_BASE}/admin/dashboard/stats?range=${r}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const rData = (await rRes.json()) as any;
      const charts = rData?.data?.charts;
      const valid = rRes.status === 200 && charts?.labels?.length > 0 && Array.isArray(charts?.userGrowth);
      record(
        `Dashboard Stats Range: ${r}`,
        valid,
        `Retrieved ${charts?.labels?.length} data points for range ${r} (newUsers: ${rData?.data?.newUsers})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: User Directory, Search, Filtering & Pagination
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: User Management Directory & Search ---');

    // 3a. Paginated query
    const usersRes = await fetch(`${API_BASE}/admin/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = (await usersRes.json()) as any;
    const userList = usersData?.data?.users;
    record(
      'Paginated Users Directory',
      usersRes.status === 200 && Array.isArray(userList) && userList.length <= 5,
      `Loaded ${userList?.length} users (total: ${usersData?.data?.total}, totalPages: ${usersData?.data?.totalPages})`
    );

    // 3b. Search by email
    const searchRes = await fetch(`${API_BASE}/admin/users?search=${encodeURIComponent(regularUser.email)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = (await searchRes.json()) as any;
    const foundUser = searchData?.data?.users?.[0];
    record(
      'User Search by Email',
      searchRes.status === 200 && foundUser?.email === regularUser.email,
      `Located user #${foundUser?.id} by exact email query`
    );

    // 3c. Filter by status 'active'
    const activeFilterRes = await fetch(`${API_BASE}/admin/users?status=active`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeData = (await activeFilterRes.json()) as any;
    const allActive = activeData?.data?.users?.every((u: any) => u.status === 'active');
    record(
      'User Filter by Active Status',
      activeFilterRes.status === 200 && allActive,
      `Active filter returned ${activeData?.data?.users?.length} strictly active users`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Full User Inspection Detail
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Comprehensive User Inspection Detail ---');

    const detailRes = await fetch(`${API_BASE}/admin/users/${regularUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = (await detailRes.json()) as any;
    const d = detailData?.data;

    const hasAccount = d?.account?.email === regularUser.email;
    const hasProfile = d?.profile?.occupation === 'Product Specialist';
    const hasSafety = d?.safety?.reportsReceived !== undefined;
    const hasActivity = d?.activity?.matchesCount !== undefined;

    record(
      'User Detailed Inspection',
      detailRes.status === 200 && hasAccount && hasProfile && hasSafety && hasActivity,
      `Loaded details for #${regularUser.id}: completion=${d?.profile?.completionPercentage}%, city=${d?.profile?.locationCity}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: User Moderation Lifecycle & Self-Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: User Moderation Actions & Self-Protection ---');

    // 5a. Admin self-suspension protection
    const selfSuspendRes = await fetch(`${API_BASE}/admin/users/${adminUser.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Self testing' }),
    });
    record(
      'Admin Self-Suspension Blocked',
      selfSuspendRes.status === 400,
      `Self-suspension attempt rejected with HTTP ${selfSuspendRes.status} (Administrative self-protection)`
    );

    // 5b. Suspend target user
    const suspendRes = await fetch(`${API_BASE}/admin/users/${regularUser.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Terms of service violation - test suspension' }),
    });
    record(
      'Suspend User Account',
      suspendRes.status === 200,
      `User #${regularUser.id} suspended successfully`
    );

    // 5c. Suspended user attempts to make API request -> MUST fail with 403
    const suspendedReqRes = await fetch(`${API_BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    record(
      'Suspended User Request Blocked',
      suspendedReqRes.status === 403,
      `Suspended user denied access with HTTP ${suspendedReqRes.status} (Account is suspended)`
    );

    // 5d. Unsuspend target user
    const unsuspendRes = await fetch(`${API_BASE}/admin/users/${regularUser.id}/unsuspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Administrative pardon' }),
    });
    record(
      'Unsuspend User Account',
      unsuspendRes.status === 200,
      `User #${regularUser.id} suspension lifted successfully`
    );

    // 5e. Ban target user
    const banRes = await fetch(`${API_BASE}/admin/users/${regularUser.id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Severe harassment violation - permanent ban test' }),
    });
    record(
      'Ban User Account',
      banRes.status === 200,
      `User #${regularUser.id} permanently banned`
    );

    // 5f. Banned user attempt -> MUST fail with 403
    const bannedReqRes = await fetch(`${API_BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    record(
      'Banned User Request Blocked',
      bannedReqRes.status === 403,
      `Banned user blocked with HTTP ${bannedReqRes.status} (Account is banned)`
    );

    // 5g. Unban user
    const unbanRes = await fetch(`${API_BASE}/admin/users/${regularUser.id}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Ban removed by admin' }),
    });
    record(
      'Unban User Account',
      unbanRes.status === 200,
      `User #${regularUser.id} ban removed and status restored to active`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Report Management & Resolution Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Report Management & Triage Resolution ---');

    // 6a. Create a second test user to report
    const reportedUser = await registerTestUser('badactor');

    // 6b. Reporter files a report
    const submitReportRes = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularUser.token}` },
      body: JSON.stringify({
        reportedUserId: reportedUser.id,
        reason: 'Inappropriate content',
        description: 'User uploaded offensive profile prompts and imagery.',
      }),
    });
    const submitReportData = (await submitReportRes.json()) as any;
    const testReportId = submitReportData?.data?.reportId;
    record(
      'Submit Member Report',
      submitReportRes.status === 201 && !!testReportId,
      `Created report #${testReportId} against user #${reportedUser.id}`
    );

    // 6c. Admin queries reports
    const adminReportsRes = await fetch(`${API_BASE}/admin/reports?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminReportsData = (await adminReportsRes.json()) as any;
    const foundReport = adminReportsData?.data?.reports?.find((r: any) => r.id === testReportId);
    record(
      'Admin Lists Pending Reports',
      adminReportsRes.status === 200 && !!foundReport,
      `Admin retrieved pending reports list containing report #${testReportId}`
    );

    // 6d. Admin updates status to under_review
    const statusUpdateRes = await fetch(`${API_BASE}/admin/reports/${testReportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'under_review' }),
    });
    record(
      'Update Report Status (Under Review)',
      statusUpdateRes.status === 200,
      `Report #${testReportId} transitioned to under_review`
    );

    // 6e. Admin resolves report with warning
    const resolveReportRes = await fetch(`${API_BASE}/admin/reports/${testReportId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'warn',
        resolutionNotes: 'Reviewed profile content. Issued formal policy warning to member.',
        warningMessage: 'Please remove offensive prompt answers to maintain account standing.',
      }),
    });
    record(
      'Resolve Report (Warning Issued)',
      resolveReportRes.status === 200,
      `Report #${testReportId} resolved with disciplinary warning`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Identity Verification Review Desk
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Verification Review & Approval Transaction ---');

    // 7a. User submits verification request
    const verifSubmitRes = await fetch(`${API_BASE}/profile/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularUser.token}` },
      body: JSON.stringify({
        fileUrl: `/uploads/verifications/user-${regularUser.id}/passport_scan.jpg`,
      }),
    });
    record(
      'User Submits Verification Doc',
      verifSubmitRes.status === 201 || verifSubmitRes.status === 200,
      `Verification document registered for user #${regularUser.id}`
    );

    // 7b. Admin retrieves verification requests
    const adminVerifsRes = await fetch(`${API_BASE}/admin/verifications?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminVerifsData = (await adminVerifsRes.json()) as any;
    const targetVerif = adminVerifsData?.data?.verifications?.find((v: any) => v.userId === regularUser.id);
    record(
      'Admin Fetches Pending Verifications',
      adminVerifsRes.status === 200 && !!targetVerif,
      `Located pending verification #${targetVerif?.id} for user #${regularUser.id}`
    );

    // 7c. Admin approves verification in atomic transaction
    if (targetVerif) {
      const approveRes = await fetch(`${API_BASE}/admin/verifications/${targetVerif.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ adminNotes: 'Government passport verified by security staff' }),
      });
      record(
        'Approve Verification (Transaction)',
        approveRes.status === 200,
        `Verification #${targetVerif.id} approved`
      );

      // Verify profile is now verified
      const checkProfileRes = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${regularUser.token}` },
      });
      const checkProfileData = (await checkProfileRes.json()) as any;
      const verifiedProfile = checkProfileData?.data?.profile;
      const isVerified = verifiedProfile?.isVerified === true || verifiedProfile?.verificationStatus === 'verified';
      record(
        'Profile Verified Badge Active',
        isVerified,
        `User profile.isVerified flag transitioned to true in MySQL (status: ${verifiedProfile?.verificationStatus})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 8: Administrative Broadcast Announcements
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Administrative Announcement Dispatch ---');

    const broadcastRes = await fetch(`${API_BASE}/admin/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Day 17 Safety & Moderation Active',
        message: 'Connectly administration has officially activated enhanced community safety guidelines.',
        audience: 'active',
      }),
    });
    const broadcastData = (await broadcastRes.json()) as any;
    record(
      'Broadcast Announcement to Active Users',
      broadcastRes.status === 201 && broadcastData?.data?.deliveredCount > 0,
      `Delivered broadcast announcement to ${broadcastData?.data?.deliveredCount} active users`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Compliance Audit Logs & Platform Analytics
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Audit Logs & Platform Analytics Overview ---');

    // 9a. Audit logs
    const auditRes = await fetch(`${API_BASE}/admin/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = (await auditRes.json()) as any;
    const auditLogs = auditData?.data?.logs;
    record(
      'Audit Logs Inspection',
      auditRes.status === 200 && Array.isArray(auditLogs) && auditLogs.length > 0,
      `Retrieved ${auditLogs?.length} recorded audit events (total: ${auditData?.data?.total})`
    );

    // 9b. Analytics overview
    const analyticsRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = (await analyticsRes.json()) as any;
    const an = analyticsData?.data;
    const hasDemographics = Array.isArray(an?.demographics);
    const hasVerifStats = an?.verificationStats?.verified !== undefined;
    record(
      'Analytics Overview Metrics',
      analyticsRes.status === 200 && hasDemographics && hasVerifStats,
      `Analytics returned real demographics (${an?.demographics?.length} segments) and verification ratios`
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    record('Execution Error', false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`DAY 17 RESULTS: ${passedCount} / ${totalCount} TESTS PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runDay17Tests();
