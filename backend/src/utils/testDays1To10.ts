import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

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

async function extractCookie(response: Response, cookieName: string): Promise<string | null> {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

export async function runComprehensiveAudit(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 CONNECTLY DAYS 1–10 COMPREHENSIVE END-TO-END AUDIT SUITE');
  console.log('=============================================================\n');

  const ts = Date.now();
  const userAEmail = `audit_user_a_${ts}@example.com`;
  const userBEmail = `audit_user_b_${ts}@example.com`;
  const userCEmail = `audit_user_c_${ts}@example.com`;
  const password = 'StrongPassword123!';

  let userAToken = '';
  let userBToken = '';
  let userCToken = '';
  let userAId = 0;
  let userBId = 0;
  let userCId = 0;
  let userARefreshCookie = '';

  try {
    // -------------------------------------------------------------------------
    // 1. HEALTH CHECKS (Day 1 & Day 2)
    // -------------------------------------------------------------------------
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = (await healthRes.json()) as any;
    record('API Health Check', healthRes.status === 200 && healthData.success, 'Express API server is healthy');

    const dbHealthRes = await fetch(`${API_BASE}/health/db`);
    const dbHealthData = (await dbHealthRes.json()) as any;
    record('Database Health Check', dbHealthRes.status === 200 && dbHealthData.success, 'MySQL database pool is responsive');

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION & SECURITY (Day 4)
    // -------------------------------------------------------------------------
    // Register User A (Male, looking for female)
    const regARes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        password,
        firstName: 'Alex',
        lastName: 'Dev',
        dateOfBirth: '1998-05-15',
        gender: 'male',
      }),
    });
    const regAData = (await regARes.json()) as any;
    userAId = regAData?.data?.user?.id;
    userAToken = regAData?.data?.accessToken;
    userARefreshCookie = (await extractCookie(regARes, 'connectly_refresh_token')) || '';
    record('Auth: User A Registration', regARes.status === 201 && !!userAToken, `User A registered with ID ${userAId}`);

    // Register User B (Female, looking for male)
    const regBRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userBEmail,
        password,
        firstName: 'Maya',
        lastName: 'Designer',
        dateOfBirth: '1999-08-20',
        gender: 'female',
      }),
    });
    const regBData = (await regBRes.json()) as any;
    userBId = regBData?.data?.user?.id;
    userBToken = regBData?.data?.accessToken;
    record('Auth: User B Registration', regBRes.status === 201 && !!userBToken, `User B registered with ID ${userBId}`);

    // Register User C (Female, looking for male)
    const regCRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userCEmail,
        password,
        firstName: 'Sarah',
        lastName: 'Photographer',
        dateOfBirth: '2000-02-14',
        gender: 'female',
      }),
    });
    const regCData = (await regCRes.json()) as any;
    userCId = regCData?.data?.user?.id;
    userCToken = regCData?.data?.accessToken;
    record('Auth: User C Registration', regCRes.status === 201 && !!userCToken, `User C registered with ID ${userCId}`);

    // Verify GET /api/auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const meData = (await meRes.json()) as any;
    record(
      'Auth: Current User Verification',
      meRes.status === 200 && meData.data?.user?.email === userAEmail,
      `Token validates to user ${meData.data?.user?.firstName}`
    );

    // Verify Token Refresh with Rotation
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `connectly_refresh_token=${userARefreshCookie}`,
      },
    });
    const refreshData = (await refreshRes.json()) as any;
    const newAToken = refreshData?.data?.accessToken;
    record('Auth: Token Refresh & Rotation', refreshRes.status === 200 && !!newAToken, 'Received rotated access token');
    if (newAToken) userAToken = newAToken;

    // -------------------------------------------------------------------------
    // 3. ONBOARDING SYSTEM (Day 6)
    // -------------------------------------------------------------------------
    // User A Step 1: Basic Info
    const basicRes = await fetch(`${API_BASE}/onboarding/basic-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Alexander',
        lastName: 'Dev',
        dateOfBirth: '1998-05-15',
        gender: 'male',
      }),
    });
    record('Onboarding: Basic Info Update', basicRes.status === 200, 'Basic information persisted');

    // User A Step 2: About You
    const aboutRes = await fetch(`${API_BASE}/onboarding/about`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        bio: 'Passionate full-stack developer who loves building things and traveling!',
        occupation: 'Software Engineer',
        education: 'Master of Computer Applications',
        city: 'San Francisco',
        country: 'USA',
      }),
    });
    record('Onboarding: About Info Update', aboutRes.status === 200, 'Bio, occupation, and location persisted');

    // User A Step 3: Interests (Travel=1, Music=2, Photography=3)
    const interestRes = await fetch(`${API_BASE}/onboarding/interests`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        interestIds: [1, 2, 3],
      }),
    });
    record('Onboarding: Interests Update', interestRes.status === 200, 'User interests attached');

    // User A Step 4: Dating Preferences
    const prefRes = await fetch(`${API_BASE}/onboarding/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        minAge: 20,
        maxAge: 35,
        preferredGender: 'female',
        maxDistanceKm: 100,
        relationshipGoal: 'long_term',
      }),
    });
    record('Onboarding: Preferences Update', prefRes.status === 200, 'Discovery preferences persisted');

    // Insert photos for User A, B, C into MySQL
    const [insA1] = await pool.query<any>(
      `INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userAId, '/uploads/profiles/alex_1.jpg', 'alex_1.jpg', 'image/jpeg', 102400, 0, 1]
    );
    const photoA1Id = insA1.insertId;

    const [insA2] = await pool.query<any>(
      `INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userAId, '/uploads/profiles/alex_2.jpg', 'alex_2.jpg', 'image/jpeg', 204800, 1, 0]
    );
    const photoA2Id = insA2.insertId;

    await pool.query<any>(
      `INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userBId, '/uploads/profiles/maya_1.jpg', 'maya_1.jpg', 'image/jpeg', 150000, 0, 1]
    );

    await pool.query<any>(
      `INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userCId, '/uploads/profiles/sarah_1.jpg', 'sarah_1.jpg', 'image/jpeg', 160000, 0, 1]
    );

    // Onboarding Status check
    const statusRes = await fetch(`${API_BASE}/onboarding/status`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const statusData = (await statusRes.json()) as any;
    record(
      'Onboarding: Progress Calculation',
      statusRes.status === 200 && statusData.data?.completionPercentage === 100,
      `Calculated completion: ${statusData.data?.completionPercentage}%`
    );

    // Onboarding Complete call
    const compRes = await fetch(`${API_BASE}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    record('Onboarding: Profile Completion Flag', compRes.status === 200, 'Marked profile as complete');

    // Also complete User B onboarding so they have compatible preferences and interests
    await fetch(`${API_BASE}/onboarding/basic-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({ firstName: 'Maya', lastName: 'Designer', dateOfBirth: '1999-08-20', gender: 'female' }),
    });
    await fetch(`${API_BASE}/onboarding/about`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({
        bio: 'Creative product designer who loves art galleries, coffee, and live music.',
        occupation: 'Product Designer',
        education: 'Fine Arts & UX',
        city: 'San Francisco',
        country: 'USA',
      }),
    });
    await fetch(`${API_BASE}/onboarding/interests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({ interestIds: [1, 2, 10] }), // Shares 2 interests (Travel & Music) with User A!
    });
    await fetch(`${API_BASE}/onboarding/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({ minAge: 20, maxAge: 35, preferredGender: 'male', maxDistanceKm: 100, relationshipGoal: 'dating' }),
    });
    await fetch(`${API_BASE}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
    });

    // Also complete User C onboarding
    await fetch(`${API_BASE}/onboarding/basic-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userCToken}` },
      body: JSON.stringify({ firstName: 'Sarah', lastName: 'Photographer', dateOfBirth: '2000-02-14', gender: 'female' }),
    });
    await fetch(`${API_BASE}/onboarding/about`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userCToken}` },
      body: JSON.stringify({
        bio: 'Landscape and portrait photographer capturing candid moments.',
        occupation: 'Photographer',
        city: 'San Francisco',
        country: 'USA',
      }),
    });
    await fetch(`${API_BASE}/onboarding/interests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userCToken}` },
      body: JSON.stringify({ interestIds: [3, 1] }),
    });
    await fetch(`${API_BASE}/onboarding/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userCToken}` },
      body: JSON.stringify({ minAge: 20, maxAge: 35, preferredGender: 'male', maxDistanceKm: 100, relationshipGoal: 'dating' }),
    });
    await fetch(`${API_BASE}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userCToken}` },
    });

    // -------------------------------------------------------------------------
    // 4. PROFILE & PHOTOS SYSTEM (Day 7, Day 8, Day 9)
    // -------------------------------------------------------------------------
    // GET /api/profile
    const profileRes = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const profileData = (await profileRes.json()) as any;
    record(
      'Profile: Fetch Complete Profile',
      profileRes.status === 200 && profileData.data?.profile?.firstName === 'Alexander',
      'Returned profile object matches database'
    );

    // PUT /api/profile update
    const updateProfRes = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        occupation: 'Principal Architect',
        bio: 'Updated bio for audit verification testing.',
      }),
    });
    record('Profile: Update Profile Attributes', updateProfRes.status === 200, 'Profile bio and occupation updated');

    // Test Photo: Set Primary Photo (PUT /api/profile/photos/:id/primary)
    const setPrimaryRes = await fetch(`${API_BASE}/profile/photos/${photoA2Id}/primary`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    record('Photos: Set Primary Photo', setPrimaryRes.status === 200, `Photo ${photoA2Id} promoted to primary`);

    // Verify ownership security: User B attempts to delete User A's photo
    const unauthorizedDelRes = await fetch(`${API_BASE}/profile/photos/${photoA2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    record(
      'Photos: Cross-User Deletion Blocked (Security)',
      unauthorizedDelRes.status === 404,
      'User B cannot delete User A photo (HTTP 404)'
    );

    // Reorder photos
    const reorderRes = await fetch(`${API_BASE}/profile/photos/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        photoIds: [photoA2Id, photoA1Id],
      }),
    });
    record('Photos: Reorder Photos', reorderRes.status === 200, 'Photos order successfully updated');

    // Delete photoA1
    const delRes = await fetch(`${API_BASE}/profile/photos/${photoA1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    record('Photos: Owner Delete Photo', delRes.status === 200, `Owner successfully deleted photo ${photoA1Id}`);

    // -------------------------------------------------------------------------
    // 5. DISCOVERY ENGINE (Day 10)
    // -------------------------------------------------------------------------
    // User A requests discovery candidates
    const discRes = await fetch(`${API_BASE}/discovery?limit=10`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const discData = (await discRes.json()) as any;
    const candidates = discData?.data?.profiles || [];
    
    // Check self exclusion
    const containsSelf = candidates.some((c: any) => c.userId === userAId);
    record('Discovery: User Self-Exclusion', !containsSelf, 'Current user never appears in own discovery feed');

    // Check candidate match
    const containsMaya = candidates.some((c: any) => c.userId === userBId);
    record('Discovery: Candidate Discovery', containsMaya, 'Compatible candidate Maya appears in discovery feed');

    // Check shared interests scoring
    const mayaCandidate = candidates.find((c: any) => c.userId === userBId);
    record(
      'Discovery: Shared Interests & Score',
      mayaCandidate && mayaCandidate.sharedInterestsCount >= 1 && mayaCandidate.compatibilityScore > 0,
      `Calculated score: ${mayaCandidate?.compatibilityScore}%, Shared: ${mayaCandidate?.sharedInterests?.join(', ')}`
    );

    // Interaction 1: User A SUPER LIKES Maya
    const superLikeRes = await fetch(`${API_BASE}/discovery/${userBId}/super-like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const superLikeData = (await superLikeRes.json()) as any;
    record(
      'Discovery: Super Like Profile',
      superLikeRes.status === 200 && superLikeData.data?.superLiked,
      'Recorded super like interaction'
    );

    // Check that Maya's discovery feed now shows User A with has_super_liked_you = true
    const mayaDiscRes = await fetch(`${API_BASE}/discovery?limit=10`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const mayaDiscData = (await mayaDiscRes.json()) as any;
    const alexInMayaFeed = (mayaDiscData?.data?.profiles || []).find((c: any) => c.userId === userAId);
    record(
      'Discovery: Super Like Badge Visibility',
      alexInMayaFeed && Boolean(alexInMayaFeed.hasSuperLikedYou),
      'User A hasSuperLikedYou flag is TRUE in Maya feed'
    );

    // Interaction 2: Maya LIKES User A back -> Reciprocal Match!
    const mayaLikeAlexRes = await fetch(`${API_BASE}/discovery/${userAId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const mayaLikeData = (await mayaLikeAlexRes.json()) as any;
    record(
      'Discovery: Mutual Match Detection',
      mayaLikeAlexRes.status === 200 && Boolean(mayaLikeData.data?.matched),
      `Mutual match triggered! Match ID: ${mayaLikeData.data?.matchId}`
    );

    // Verify matched candidates are excluded from future discovery feed
    const postMatchAlexFeedRes = await fetch(`${API_BASE}/discovery?limit=10`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const postMatchAlexFeedData = (await postMatchAlexFeedRes.json()) as any;
    const mayaStillInAlexFeed = (postMatchAlexFeedData?.data?.profiles || []).some((c: any) => c.userId === userBId);
    record(
      'Discovery: Matched User Exclusion',
      !mayaStillInAlexFeed,
      'Matched candidate Maya removed from Alex discovery feed'
    );

    // Interaction 3: User A PASSES User C
    const passSarahRes = await fetch(`${API_BASE}/discovery/${userCId}/pass`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const passData = (await passSarahRes.json()) as any;
    record(
      'Discovery: Pass Profile',
      passSarahRes.status === 200 && Boolean(passData.data?.passed),
      'Recorded pass interaction'
    );

    // Verify passed candidate is excluded from discovery feed
    const postPassFeedRes = await fetch(`${API_BASE}/discovery?limit=10`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const postPassFeedData = (await postPassFeedRes.json()) as any;
    const sarahStillInFeed = (postPassFeedData?.data?.profiles || []).some((c: any) => c.userId === userCId);
    record(
      'Discovery: Passed Candidate Exclusion',
      !sarahStillInFeed,
      'Passed candidate Sarah removed from Alex discovery feed'
    );

  } catch (error: any) {
    record('Fatal Execution Error', false, error.message || String(error));
  }

  console.log('\n=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`📊 AUDIT RESULTS: ${passedCount}/${results.length} tests passed (${Math.round((passedCount / results.length) * 100)}%)`);
  if (failedCount > 0) {
    console.log(`❌ ${failedCount} tests failed.`);
  } else {
    console.log('🎉 ALL INTEGRATION AND SECURITY BOUNDARY TESTS PASSED!');
  }
  console.log('=============================================================\n');

  return failedCount === 0;
}

runComprehensiveAudit().then((success) => {
  process.exit(success ? 0 : 1);
});
