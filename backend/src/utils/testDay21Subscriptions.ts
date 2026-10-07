export {};
import { pool } from '../config/database';
import paymentProvider from '../services/payments/paymentProvider';

const API_BASE = 'http://127.0.0.1:5000/api';

async function api(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runDay21Tests() {
  console.log('\n========================================================================');
  console.log('CONNECTLY DAY 21 — SUBSCRIPTION, MONETIZATION & ENTITLEMENTS TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}${detail ? `: ${detail}` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();

    // --- Phase 1: Test Accounts Setup ---
    console.log('--- Phase 1: Account Creation & Authentication ---');

    // Register User 1 (Free user)
    const user1Email = `user1_d21_${timestamp}@example.com`;
    const user1Res = await api('/auth/register', {
      method: 'POST',
      body: {
        email: user1Email,
        password: 'Password123!',
        firstName: 'FreeUser',
        lastName: 'D21',
        dateOfBirth: '1998-05-15',
        gender: 'male',
      },
    });
    const user1Token = user1Res.data?.data?.accessToken;
    const user1Id = user1Res.data?.data?.user?.id;
    assert(!!user1Token, 'User 1 Registered', `ID: ${user1Id} (Free Tier)`);

    // Register User 2 (Candidate/Partner)
    const user2Email = `user2_d21_${timestamp}@example.com`;
    const user2Res = await api('/auth/register', {
      method: 'POST',
      body: {
        email: user2Email,
        password: 'Password123!',
        firstName: 'Candidate',
        lastName: 'D21',
        dateOfBirth: '1999-07-20',
        gender: 'female',
      },
    });
    const user2Token = user2Res.data?.data?.accessToken;
    const user2Id = user2Res.data?.data?.user?.id;
    assert(!!user2Token, 'User 2 Registered', `ID: ${user2Id}`);

    // Login Admin
    const adminRes = await api('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@connectly.com',
        password: 'AdminPass123!',
      },
    });
    const adminToken = adminRes.data?.data?.accessToken;
    assert(!!adminToken, 'Admin Login Verified');

    // --- Phase 2: Active Plans Retrieval ---
    console.log('\n--- Phase 2: Subscription Plans Architecture ---');
    const plansRes = await api('/subscriptions/plans');
    const plans = plansRes.data?.data;
    assert(Array.isArray(plans) && plans.length >= 3, 'Fetch Active Plans', `Found ${plans?.length} plans`);

    const freePlan = plans?.find((p: any) => p.code === 'FREE');
    const premPlan = plans?.find((p: any) => p.code === 'PREMIUM');
    const vipPlan = plans?.find((p: any) => p.code === 'PREMIUM_PLUS');
    assert(!!freePlan && freePlan.priceInr === 0, 'Free Plan Structure', 'Price: ₹0, duration: 0');
    assert(!!premPlan && premPlan.priceInr === 499, 'Premium Plan Structure', 'Price: ₹499/mo');
    assert(!!vipPlan && vipPlan.priceInr === 799, 'VIP Plan Structure', 'Price: ₹799/mo');

    // --- Phase 3: Free User Entitlements & Initial Status ---
    console.log('\n--- Phase 3: Free User Entitlements & Quotas ---');
    const freeEntRes = await api('/subscriptions/current', { token: user1Token });
    const freeEnt = freeEntRes.data?.data?.entitlements;
    assert(freeEnt?.planCode === 'FREE', 'Free User Effective Plan', freeEnt?.planCode);
    assert(freeEnt?.isPremium === false, 'Free User isPremium is false');
    assert(freeEnt?.limits?.dailyLikes === 25, 'Free User Daily Likes Quota', '25 likes/day');
    assert(freeEnt?.limits?.monthlyBoosts === 0, 'Free User Boost Quota', '0 boosts');

    // --- Phase 4: Feature Gating for Free Users ---
    console.log('\n--- Phase 4: Feature Gating & Entitlement Protection ---');

    // 1. "See Who Liked You" Gate
    const seeLikedRes = await api('/likes/received', { token: user1Token });
    assert(
      seeLikedRes.status === 403,
      'Gate: See Who Liked You Blocked for Free User',
      `HTTP ${seeLikedRes.status}`
    );

    // 2. Profile Boost Gate
    const boostGateRes = await api('/subscriptions/boost', { method: 'POST', token: user1Token });
    assert(
      boostGateRes.status === 403,
      'Gate: Profile Boost Blocked for Free User',
      `HTTP ${boostGateRes.status}`
    );

    // 3. Advanced Filters Gate
    const filterGateRes = await api('/discovery?verifiedOnly=true', { token: user1Token });
    assert(
      filterGateRes.status === 403,
      'Gate: Advanced Discovery Filters Blocked for Free User',
      `HTTP ${filterGateRes.status}`
    );

    // --- Phase 5: Payment Checkout & Cryptographic Verification ---
    console.log('\n--- Phase 5: Checkout Order & Cryptographic Signature Verification ---');

    // 1. Create Checkout Order
    const checkoutRes = await api('/subscriptions/checkout', {
      method: 'POST',
      token: user1Token,
      body: { planId: premPlan.id },
    });
    const checkout = checkoutRes.data?.data;
    assert(!!checkout?.orderId, 'Checkout Order Created', `OrderID: ${checkout?.orderId}`);
    assert(checkout?.amount === 499, 'Checkout Amount Verified', `₹${checkout?.amount}`);

    // 2. Tampered Signature Defense (Security Test)
    const tamperedRes = await api('/subscriptions/verify', {
      method: 'POST',
      token: user1Token,
      body: {
        orderId: checkout.orderId,
        paymentId: `pay_test_${timestamp}`,
        signature: 'forged_fake_signature_attempt_123',
      },
    });
    assert(
      tamperedRes.status === 400,
      'Security: Forged Payment Signature Rejected',
      `HTTP ${tamperedRes.status} Bad Request`
    );

    // 3. Legitimate Cryptographic Signature Verification & Activation
    const paymentId = `pay_valid_${timestamp}_987`;
    const validSignature = paymentProvider.generateTestSignature(checkout.orderId, paymentId);

    const verifyRes = await api('/subscriptions/verify', {
      method: 'POST',
      token: user1Token,
      body: {
        orderId: checkout.orderId,
        paymentId,
        signature: validSignature,
      },
    });
    const activeSub = verifyRes.data?.data?.subscription;
    assert(activeSub?.status === 'active', 'Payment Verification & Subscription Activation', `Status: ${activeSub?.status}`);

    // --- Phase 6: Premium Entitlements & Features Unlocked ---
    console.log('\n--- Phase 6: Premium Entitlements & Benefits Unlocked ---');
    const premEntRes = await api('/subscriptions/current', { token: user1Token });
    const premEnt = premEntRes.data?.data?.entitlements;
    assert(premEnt?.isPremium === true, 'Entitlement: isPremium Active', 'true');
    assert(premEnt?.badge === 'PRO', 'Entitlement: Premium Badge Assigned', 'PRO');
    assert(premEnt?.limits?.dailyLikes === -1, 'Entitlement: Unlimited Likes Active', 'Unlimited (-1)');
    assert(premEnt?.features?.includes('SEE_WHO_LIKED'), 'Entitlement: SEE_WHO_LIKED Feature Active');
    assert(premEnt?.features?.includes('PROFILE_BOOST'), 'Entitlement: PROFILE_BOOST Feature Active');

    // --- Phase 7: "See Who Liked You" Unlocked Flow ---
    console.log('\n--- Phase 7: See Who Liked You (Premium Feature) ---');
    // User 2 likes User 1
    const likeActionRes = await api(`/discovery/${user1Id}/like`, { method: 'POST', token: user2Token });
    assert(likeActionRes.ok, 'User 2 Liked User 1', `HTTP ${likeActionRes.status}`);

    // User 1 accesses /api/likes/received
    const recLikesRes = await api('/likes/received', { token: user1Token });
    const recLikes = recLikesRes.data?.data;
    assert(recLikes?.isPremium === true, 'See Who Liked You Accessed', `Found ${recLikes?.count} incoming likes`);
    assert(recLikes?.likes?.some((l: any) => l.userId === user2Id), 'Candidate Profile Visible', `Found Candidate ID ${user2Id}`);

    // --- Phase 8: Profile Boost Activation & Ranking ---
    console.log('\n--- Phase 8: Profile Boost Activation & Ranking ---');
    const boostRes = await api('/subscriptions/boost', { method: 'POST', token: user1Token });
    const boostInfo = boostRes.data?.data;
    assert(boostInfo?.isActive === true, 'Profile Boost Activated', `Remaining: ${boostInfo?.remainingSeconds}s`);

    // Verify duplicate boost is rejected
    const dupBoostRes = await api('/subscriptions/boost', { method: 'POST', token: user1Token });
    assert(dupBoostRes.status === 400, 'Duplicate Active Boost Blocked', `HTTP ${dupBoostRes.status}`);

    // --- Phase 9: Subscription Cancellation & End-of-Period Benefit Retention ---
    console.log('\n--- Phase 9: Subscription Cancellation Workflow ---');
    const cancelRes = await api('/subscriptions/cancel', { method: 'POST', token: user1Token });
    assert(cancelRes.data?.data?.cancelled === true, 'Subscription Cancelled', `ExpiresAt: ${cancelRes.data?.data?.expiresAt}`);

    // Check that benefits remain active during the paid window
    const postCancelEntRes = await api('/subscriptions/current', { token: user1Token });
    const postCancelEnt = postCancelEntRes.data?.data?.entitlements;
    assert(postCancelEnt?.isPremium === true, 'Benefits Retained Until Expiration Period', `Status: ${postCancelEnt?.status}`);

    // --- Phase 10: Automatic Expiration Handling ---
    console.log('\n--- Phase 10: Automatic Subscription Expiration Simulation ---');
    // Backdate subscription expiration to 1 hour ago in MySQL
    await pool.query(
      `UPDATE subscriptions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE user_id = ?`,
      [user1Id]
    );

    // Call current subscription -> triggers automatic status transition to expired
    const expiredRes = await api('/subscriptions/current', { token: user1Token });
    const expiredEnt = expiredRes.data?.data?.entitlements;
    assert(expiredEnt?.isPremium === false, 'Automatic Expiration: isPremium reverted to false');
    assert(expiredEnt?.planCode === 'FREE', 'Automatic Expiration: Plan reverted to FREE');

    // --- Phase 11: Admin Subscription Analytics & Management ---
    console.log('\n--- Phase 11: Admin Subscription Analytics & Telemetry ---');
    const adminAnalyticsRes = await api('/subscriptions/admin/analytics', { token: adminToken });
    const adminStats = adminAnalyticsRes.data?.data;
    assert(adminStats?.totalRevenueInr >= 499, 'Admin Analytics Revenue', `₹${adminStats?.totalRevenueInr}`);
    assert(adminStats?.totalSubscribers >= 1, 'Admin Analytics Subscribers Count', `${adminStats?.totalSubscribers} subscribers`);

    const adminSubscribersRes = await api('/subscriptions/admin/subscribers', { token: adminToken });
    assert(adminSubscribersRes.data?.data?.total >= 1, 'Admin Subscribers Directory', `Loaded ${adminSubscribersRes.data?.data?.total} records`);

    const adminTransactionsRes = await api('/subscriptions/admin/transactions', { token: adminToken });
    assert(adminTransactionsRes.data?.data?.total >= 1, 'Admin Transactions Directory', `Loaded ${adminTransactionsRes.data?.data?.total} transactions`);

    // --- Phase 12: Security & IDOR Protections ---
    console.log('\n--- Phase 12: Security & Access Control Boundaries ---');
    // Non-admin blocked from admin endpoints
    const nonAdminRes = await api('/subscriptions/admin/analytics', { token: user1Token });
    assert(nonAdminRes.status === 403, 'Security: Regular User Blocked from Admin Analytics', 'HTTP 403');

    // Unauthenticated blocked
    const unauthRes = await api('/subscriptions/current');
    assert(unauthRes.status === 401, 'Security: Unauthenticated Blocked from Subscription APIs', 'HTTP 401');

    console.log('\n========================================================================');
    console.log(`TEST RESULTS: ${passed} / ${passed + failed} PASSED`);
    if (failed === 0) {
      console.log('🎉 ALL DAY 21 PREMIUM SUBSCRIPTION & ENTITLEMENT TESTS PASSED PERFECTLY!');
    } else {
      console.log(`❌ ${failed} TESTS FAILED.`);
    }
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('Unhandled test suite exception:', err);
  } finally {
    process.exit(0);
  }
}

runDay21Tests();
