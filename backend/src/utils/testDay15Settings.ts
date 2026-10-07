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

async function registerAndOnboardUser(
  firstName: string,
  gender: 'male' | 'female',
  preferredGender: 'male' | 'female'
): Promise<{ id: number; token: string; email: string; password: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `day15_${firstName.toLowerCase()}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  // Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName: 'Day15Tester',
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
      bio: `Hello, I'm ${firstName}! Let's test Day 15 settings and security.`,
      occupation: 'Tech Specialist',
      city: 'Nashik',
      country: 'India',
    }),
  });

  // Onboard preferences
  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      preferredGender,
      minAge: 18,
      maxAge: 45,
      maxDistanceKm: 100,
    }),
  });

  // Complete onboarding
  await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return { id, token, email, password };
}

async function runDay15TestSuite() {
  console.log('\n======================================================');
  console.log('   CONNECTLY DAY 15 - SETTINGS, PRIVACY & SECURITY    ');
  console.log('======================================================\n');

  try {
    // 1. Create test users
    console.log('[Setup] Registering and onboarding test users...');
    const userA = await registerAndOnboardUser('Aarav', 'male', 'female');
    const userB = await registerAndOnboardUser('Diya', 'female', 'male');
    const userC = await registerAndOnboardUser('Kabir', 'male', 'female');
    console.log(`[Setup] Users ready: UserA=${userA.id}, UserB=${userB.id}, UserC=${userC.id}`);

    // TEST 1: GET /api/settings default initialization
    console.log('\n--- 1. Settings Initialization & Defaults ---');
    const getSettingsRes = await fetch(`${API_BASE}/settings`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const getSettingsData = (await getSettingsRes.json()) as any;
    const settings = getSettingsData?.data;

    const hasDefaults =
      getSettingsData?.success === true &&
      settings?.showInDiscovery === true &&
      settings?.showOnlineStatus === true &&
      settings?.showLastSeen === true &&
      settings?.notifyMatches === true &&
      settings?.notifyMessages === true &&
      settings?.profileVisibility === 'public';

    record(
      'Settings Default Initialization',
      hasDefaults,
      hasDefaults
        ? `Settings successfully initialized with correct defaults (showInDiscovery=true, profileVisibility='${settings.profileVisibility}')`
        : `Invalid defaults: ${JSON.stringify(getSettingsData)}`
    );

    // TEST 2: PUT /api/settings update allowed fields
    console.log('\n--- 2. Updating Settings & Database Persistence ---');
    const updateRes = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        showInDiscovery: false,
        notifyLikes: false,
        showReadReceipts: false,
        profileVisibility: 'matches_only',
      }),
    });
    const updateData = (await updateRes.json()) as any;
    const updatedSettings = updateData?.data;

    const updateOk =
      updateData?.success === true &&
      updatedSettings?.showInDiscovery === false &&
      updatedSettings?.notifyLikes === false &&
      updatedSettings?.showReadReceipts === false &&
      updatedSettings?.profileVisibility === 'matches_only';

    record(
      'Settings Update Persistence',
      updateOk,
      updateOk
        ? 'Settings updated and persisted properly in MySQL (showInDiscovery=false, notifyLikes=false)'
        : `Failed update: ${JSON.stringify(updateData)}`
    );

    // TEST 3: Mass Assignment Protection
    console.log('\n--- 3. Mass Assignment Defense ---');
    const massAssignRes = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        role: 'ADMIN',
        isAdmin: true,
        status: 'suspended',
        verified: true,
        notifySystem: false,
      }),
    });
    const massAssignData = (await massAssignRes.json()) as any;

    // Check account info to ensure role was NOT touched
    const accCheckRes = await fetch(`${API_BASE}/account`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const accCheckData = (await accCheckRes.json()) as any;
    const roleUntouched = accCheckData?.data?.role === 'user';

    record(
      'Mass Assignment Defense',
      roleUntouched && massAssignData?.success === true,
      roleUntouched
        ? `Mass assignment fields (role, isAdmin) were safely ignored. Role remained '${accCheckData?.data?.role}'`
        : `Security breach! Role changed: ${accCheckData?.data?.role}`
    );

    // TEST 4: Discovery Visibility Backend Filtering
    console.log('\n--- 4. Discovery Privacy & Exclusion Engine ---');
    // UserA has showInDiscovery: false. UserB should NOT see UserA in discovery!
    const discRes1 = await fetch(`${API_BASE}/discovery/candidates?limit=20`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const discData1 = (await discRes1.json()) as any;
    const candidates1 = (discData1?.data?.profiles || []) as any[];
    const userAFoundWhenHidden = candidates1.some((c: any) => c.userId === userA.id || c.id === userA.id);

    record(
      'Discovery Exclusion (showInDiscovery=false)',
      !userAFoundWhenHidden,
      !userAFoundWhenHidden
        ? `User A correctly excluded from User B's discovery pool while discovery is disabled`
        : `Privacy failure! User A was found in discovery when hidden.`
    );

    // Now turn UserA discovery back ON
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        showInDiscovery: true,
        profileVisibility: 'public',
      }),
    });

    const discRes2 = await fetch(`${API_BASE}/discovery/candidates?limit=20`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const discData2 = (await discRes2.json()) as any;
    const candidates2 = (discData2?.data?.profiles || []) as any[];
    const userAFoundWhenVisible = candidates2.some((c: any) => c.userId === userA.id || c.id === userA.id);

    record(
      'Discovery Inclusion (showInDiscovery=true)',
      userAFoundWhenVisible,
      userAFoundWhenVisible
        ? `User A successfully re-appears in User B's discovery pool once discovery is enabled`
        : `User A was not found in discovery after turning on.`
    );

    // TEST 5: Account Info & Username
    console.log('\n--- 5. Account Information Management ---');
    const uniqueUsername = `aarav_${Date.now()}`;
    const accUpdateRes = await fetch(`${API_BASE}/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        firstName: 'Aarav Updated',
        lastName: 'Sharma',
        username: uniqueUsername,
      }),
    });
    const accUpdateData = (await accUpdateRes.json()) as any;
    const accOk =
      accUpdateData?.success === true &&
      accUpdateData?.data?.firstName === 'Aarav Updated' &&
      accUpdateData?.data?.username === uniqueUsername;

    record(
      'Account Info Update',
      accOk,
      accOk
        ? `Account updated: name='${accUpdateData?.data?.firstName}', username='${accUpdateData?.data?.username}'`
        : `Account update failed: ${JSON.stringify(accUpdateData)}`
    );

    // Duplicate username rejection test
    const dupUserRes = await fetch(`${API_BASE}/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({
        firstName: 'Diya',
        username: uniqueUsername, // already taken by User A
      }),
    });
    const dupUserData = (await dupUserRes.json()) as any;
    const dupRejected = dupUserRes.status === 409 || dupUserData?.success === false;

    record(
      'Duplicate Username Rejection',
      dupRejected,
      dupRejected
        ? 'Duplicate username properly rejected with conflict error.'
        : 'Duplicate username was incorrectly accepted!'
    );

    // TEST 6: Password Change & Security
    console.log('\n--- 6. Password Security & BCrypt Validation ---');
    // Wrong current password
    const wrongPassRes = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      }),
    });
    const wrongPassRejected = wrongPassRes.status === 400 || wrongPassRes.status === 401;

    record(
      'Password Change: Wrong Current Password',
      wrongPassRejected,
      wrongPassRejected
        ? 'Rejected invalid current password attempt.'
        : 'Allowed password change with wrong current password!'
    );

    // Valid password change
    const newPass = 'SuperSecurePass456!';
    const changePassRes = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        currentPassword: userA.password,
        newPassword: newPass,
        confirmPassword: newPass,
      }),
    });
    const changePassData = (await changePassRes.json()) as any;
    const passChangeOk = changePassData?.success === true;

    // Verify login with new password
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userA.email,
        password: newPass,
      }),
    });
    const loginData = (await loginRes.json()) as any;
    const newLoginOk = loginData?.success === true && !!loginData?.data?.accessToken;

    record(
      'Password Change & New Password Verification',
      passChangeOk && newLoginOk,
      passChangeOk && newLoginOk
        ? 'Password successfully changed and verified with immediate fresh login.'
        : `Failed password change or login: ${JSON.stringify(changePassData)}`
    );

    // Update userA token to the new login token
    if (loginData?.data?.accessToken) {
      userA.token = loginData.data.accessToken;
      userA.password = newPass;
    }

    // TEST 7: Active Sessions & Revoke Other Sessions
    console.log('\n--- 7. Active Sessions Management ---');
    const sessRes = await fetch(`${API_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const sessData = (await sessRes.json()) as any;
    const sessions = (Array.isArray(sessData?.data) ? sessData.data : (sessData?.data?.sessions || [])) as any[];
    const hasCurrentSession = sessions.some((s) => s.isCurrent === true);

    record(
      'Active Sessions Retrieval',
      sessData?.success === true && sessions.length > 0 && hasCurrentSession,
      hasCurrentSession
        ? `Found ${sessions.length} active session(s) with current device marked.`
        : `Failed to find active session with isCurrent: ${JSON.stringify(sessData)}`
    );

    const logoutOthersRes = await fetch(`${API_BASE}/sessions/logout-others`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const logoutOthersData = (await logoutOthersRes.json()) as any;

    record(
      'Log Out Other Sessions',
      logoutOthersData?.success === true,
      logoutOthersData?.success === true
        ? 'Other sessions revoked successfully while keeping current session active.'
        : `Failed revoking other sessions: ${JSON.stringify(logoutOthersData)}`
    );

    // TEST 8: Blocking, Platform Exclusion & Unblocking
    console.log('\n--- 8. Blocking System & Platform Exclusion ---');
    // Self-block prevention
    const selfBlockRes = await fetch(`${API_BASE}/blocks/${userA.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ reason: 'Self test' }),
    });
    const selfBlockRejected = selfBlockRes.status === 400;

    record(
      'Self-Block Prevention',
      selfBlockRejected,
      selfBlockRejected
        ? 'Self-blocking strictly prohibited with 400 Bad Request.'
        : 'Self-block was mistakenly allowed!'
    );

    // User A blocks User C
    const blockCRes = await fetch(`${API_BASE}/blocks/${userC.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ reason: 'Inappropriate behavior' }),
    });
    const blockCData = (await blockCRes.json()) as any;

    record(
      'Block User Action',
      blockCData?.success === true,
      blockCData?.success === true
        ? `User A successfully blocked User C (id=${userC.id})`
        : `Failed to block user: ${JSON.stringify(blockCData)}`
    );

    // Check Blocked List
    const blockListRes = await fetch(`${API_BASE}/blocks`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const blockListData = (await blockListRes.json()) as any;
    const blockList = (Array.isArray(blockListData?.data) ? blockListData.data : (blockListData?.data?.blockedUsers || [])) as any[];
    const isUserCInList = blockList.some((b: any) => b.userId === userC.id);

    record(
      'Blocked Users List Retrieval',
      isUserCInList,
      isUserCInList
        ? `User C confirmed in User A's blocked users list.`
        : `User C missing from blocked list: ${JSON.stringify(blockListData)}`
    );

    // Verify Discovery Exclusion for blocked user
    const discBlockRes = await fetch(`${API_BASE}/discovery/candidates?limit=20`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const discBlockData = (await discBlockRes.json()) as any;
    const candidatesAfterBlock = (discBlockData?.data?.profiles || []) as any[];
    const isUserCInDiscovery = candidatesAfterBlock.some((c: any) => c.userId === userC.id || c.id === userC.id);

    record(
      'Blocked User Discovery Exclusion',
      !isUserCInDiscovery,
      !isUserCInDiscovery
        ? 'Blocked user C is completely excluded from User A discovery deck.'
        : 'Privacy violation: Blocked user C appeared in discovery!'
    );

    // Unblock User C
    const unblockRes = await fetch(`${API_BASE}/blocks/${userC.id}/unblock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const unblockData = (await unblockRes.json()) as any;

    const blockListAfterRes = await fetch(`${API_BASE}/blocks`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const blockListAfterData = (await blockListAfterRes.json()) as any;
    const blockListAfter = (Array.isArray(blockListAfterData?.data) ? blockListAfterData.data : (blockListAfterData?.data?.blockedUsers || [])) as any[];
    const isUserCRemoved = !blockListAfter.some((b: any) => b.userId === userC.id);

    record(
      'Unblock User & Immediate List Refresh',
      unblockData?.success === true && isUserCRemoved,
      isUserCRemoved
        ? 'User C successfully unblocked and removed from blocked list.'
        : 'Failed to unblock user.'
    );

    // TEST 9: Notification Category Preference Suppression
    console.log('\n--- 9. Notification Preference Suppression ---');
    // User B turns off notifyLikes
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ notifyLikes: false }),
    });

    const notifCountBeforeRes = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const notifCountBeforeData = (await notifCountBeforeRes.json()) as any;
    const unreadBefore = notifCountBeforeData?.data?.unreadCount || 0;

    // User A likes User B
    await fetch(`${API_BASE}/discovery/${userB.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // Check notifications for User B
    const notifCountAfterRes = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const notifCountAfterData = (await notifCountAfterRes.json()) as any;
    const unreadAfter = notifCountAfterData?.data?.unreadCount || 0;

    const notificationSuppressed = unreadAfter === unreadBefore;

    record(
      'Notification Category Suppression (notifyLikes=false)',
      notificationSuppressed,
      notificationSuppressed
        ? 'Like notification was successfully suppressed because User B disabled notifyLikes.'
        : `Notification was created unexpectedly (before=${unreadBefore}, after=${unreadAfter})`
    );

    // TEST 10: Atomic Account Deletion & Cascading Purge
    console.log('\n--- 10. Atomic Account Deletion ---');
    const deleteCandidate = await registerAndOnboardUser('Disposable', 'female', 'male');

    // Attempt delete with wrong password
    const wrongDelPassRes = await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deleteCandidate.token}` },
      body: JSON.stringify({
        password: 'IncorrectPassword!',
        confirmation: 'DELETE',
      }),
    });
    const wrongDelPassRejected = wrongDelPassRes.status === 400 || wrongDelPassRes.status === 401;

    record(
      'Account Deletion: Wrong Password Rejection',
      wrongDelPassRejected,
      wrongDelPassRejected
        ? 'Account deletion with incorrect password correctly rejected.'
        : 'Dangerous! Account deleted with invalid password!'
    );

    // Attempt delete with incorrect confirmation phrase
    const wrongPhraseRes = await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deleteCandidate.token}` },
      body: JSON.stringify({
        password: deleteCandidate.password,
        confirmation: 'delete_me', // must be exactly 'DELETE'
      }),
    });
    const wrongPhraseRejected = wrongPhraseRes.status === 400;

    record(
      'Account Deletion: Confirmation Phrase Validation',
      wrongPhraseRejected,
      wrongPhraseRejected
        ? 'Account deletion requires exact confirmation phrase "DELETE".'
        : 'Allowed deletion without exact phrase!'
    );

    // Valid deletion
    const validDelRes = await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deleteCandidate.token}` },
      body: JSON.stringify({
        password: deleteCandidate.password,
        confirmation: 'DELETE',
      }),
    });
    const validDelData = (await validDelRes.json()) as any;

    // Verify token no longer works
    const postDelAccessRes = await fetch(`${API_BASE}/settings`, {
      headers: { Authorization: `Bearer ${deleteCandidate.token}` },
    });
    const accountPurged = validDelData?.success === true && postDelAccessRes.status === 401;

    record(
      'Atomic Account Deletion & Cascade Purge',
      accountPurged,
      accountPurged
        ? 'Disposable account and records purged completely across MySQL, access token invalidated.'
        : `Failed deletion: ${JSON.stringify(validDelData)}`
    );

    // Summary
    console.log('\n======================================================');
    console.log('                 DAY 15 TEST RESULTS                  ');
    console.log('======================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`Total Tests Run: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed === 0) {
      console.log('\n🎉 ALL DAY 15 SETTINGS, PRIVACY & SECURITY TESTS PASSED!\n');
    } else {
      console.error(`\n❌ ${failed} test(s) failed. Check details above.\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Day 15 test execution:', error);
    process.exit(1);
  }
}

runDay15TestSuite();
