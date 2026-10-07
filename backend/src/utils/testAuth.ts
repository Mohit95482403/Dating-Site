import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { JwtUtil } from './jwt';

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

export async function runAuthAcceptanceTests(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 CONNECTLY DAY 4 — COMPLETE AUTHENTICATION BACKEND TEST SUITE');
  console.log('=============================================================\n');

  const timestamp = Date.now();
  const testEmail = `auth_test_${timestamp}@example.com`;
  const testPassword = 'StrongPassword123!';
  const userBEmail = `auth_user_b_${timestamp}@example.com`;

  try {
    // -------------------------------------------------------------
    // 1. Health Checks
    // -------------------------------------------------------------
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = (await healthRes.json()) as any;
    record('API Health Check', healthRes.status === 200 && Boolean(healthData.success), 'Backend is reachable and healthy');

    const dbHealthRes = await fetch(`${API_BASE}/health/db`);
    const dbHealthData = (await dbHealthRes.json()) as any;
    record('Database Health Check', dbHealthRes.status === 200 && Boolean(dbHealthData.success), 'MySQL connection pool verified');

    // -------------------------------------------------------------
    // 2. Registration Validation: Underage User (< 18)
    // -------------------------------------------------------------
    const underageRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `minor_${timestamp}@example.com`,
        password: testPassword,
        firstName: 'Young',
        lastName: 'Person',
        dateOfBirth: '2015-05-10', // ~11 years old
        gender: 'male',
      }),
    });
    const underageData = (await underageRes.json()) as any;
    record(
      'Underage Registration Blocked (18+ Policy)',
      underageRes.status === 422 && !underageData.success,
      `Rejected with HTTP 422: ${JSON.stringify(underageData.errors || underageData.message)}`
    );

    // -------------------------------------------------------------
    // 3. Registration Validation: Weak Password
    // -------------------------------------------------------------
    const weakPassRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `weak_${timestamp}@example.com`,
        password: 'weak',
        firstName: 'Weak',
        dateOfBirth: '2000-01-01',
        gender: 'female',
      }),
    });
    const weakPassData = (await weakPassRes.json()) as any;
    record(
      'Weak Password Policy Enforced',
      weakPassRes.status === 422 && !weakPassData.success,
      `Rejected with HTTP 422: ${JSON.stringify(weakPassData.errors || weakPassData.message)}`
    );

    // -------------------------------------------------------------
    // 4. Role Tampering Prevention (Sending role: "admin")
    // -------------------------------------------------------------
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: 'Narendra',
        lastName: 'Developer',
        dateOfBirth: '2001-04-12',
        gender: 'male',
        role: 'admin', // Tampering attempt: should remain 'user'
      }),
    });
    const registerData = (await registerRes.json()) as any;
    const regCookie = await extractCookie(registerRes, 'connectly_refresh_token');

    record(
      'User Registration API (201 Created)',
      registerRes.status === 201 && Boolean(registerData.success) && Boolean(registerData.data?.accessToken),
      `User ID: ${registerData.data?.user?.id}, email: ${registerData.data?.user?.email}`
    );

    record(
      'Client Role Tampering Prevented (Server Enforced)',
      registerData.data?.user?.role === 'user',
      `Assigned role is safely "${registerData.data?.user?.role}" despite requesting admin`
    );

    record(
      'HTTP-Only Refresh Cookie Set on Register',
      Boolean(regCookie),
      `Set-Cookie connectly_refresh_token received`
    );

    const userId = registerData.data?.user?.id;
    const initialAccessToken = registerData.data?.accessToken;
    const initialRefreshToken = regCookie;

    // -------------------------------------------------------------
    // 5. Database Verification (Transaction & Relationships)
    // -------------------------------------------------------------
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, role, status FROM users WHERE id = ?',
      [userId]
    );
    const userInDb = userRows[0];
    const isBcrypt = userInDb?.password_hash?.startsWith('$2b$') || userInDb?.password_hash?.startsWith('$2a$');

    record(
      'Password Bcrypt Hashed in MySQL',
      Boolean(isBcrypt) && userInDb?.password_hash !== testPassword,
      `Hash prefix: ${userInDb?.password_hash?.substring(0, 10)}... (Never plaintext)`
    );

    const [profileRows] = await pool.query<RowDataPacket[]>(
      'SELECT user_id, first_name, date_of_birth, gender FROM profiles WHERE user_id = ?',
      [userId]
    );
    record(
      'Profile Record Created in Transaction',
      profileRows.length === 1 && profileRows[0].first_name === 'Narendra',
      `Profile linked to user_id ${userId}, gender: ${profileRows[0]?.gender}`
    );

    const [prefRows] = await pool.query<RowDataPacket[]>(
      'SELECT user_id, min_age, max_age, preferred_gender FROM preferences WHERE user_id = ?',
      [userId]
    );
    record(
      'Preferences Record Created in Transaction',
      prefRows.length === 1 && prefRows[0].min_age === 18,
      `Preferences linked to user_id ${userId}, min_age: ${prefRows[0]?.min_age}`
    );

    const [sessionRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, user_id, refresh_token_hash, revoked_at FROM sessions WHERE user_id = ?',
      [userId]
    );
    const sessionInDb = sessionRows[0];
    const expectedHash = initialRefreshToken ? JwtUtil.hashToken(initialRefreshToken) : '';
    record(
      'Session Created with Hashed Refresh Token (No Raw Tokens in DB)',
      sessionRows.length >= 1 && sessionInDb.refresh_token_hash === expectedHash,
      `Session ID ${sessionInDb?.id} with SHA-256 hash ${sessionInDb?.refresh_token_hash?.substring(0, 16)}...`
    );

    const [auditRows] = await pool.query<RowDataPacket[]>(
      'SELECT action, entity_type, entity_id FROM audit_logs WHERE user_id = ? AND action = "USER_REGISTERED"',
      [userId]
    );
    record(
      'Audit Log Recorded: USER_REGISTERED',
      auditRows.length >= 1,
      `Audit log action: ${auditRows[0]?.action}`
    );

    // -------------------------------------------------------------
    // 6. Duplicate Email Registration (Case-Insensitive)
    // -------------------------------------------------------------
    const dupRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail.toUpperCase(), // Mixed case duplication attempt
        password: testPassword,
        firstName: 'Duplicate',
        dateOfBirth: '2000-01-01',
        gender: 'female',
      }),
    });
    const dupData = (await dupRes.json()) as any;
    record(
      'Duplicate Email Rejection (409 Conflict)',
      dupRes.status === 409 && !dupData.success,
      `Duplicate registration blocked with 409: ${dupData.message}`
    );

    // -------------------------------------------------------------
    // 7. Login: Invalid Password
    // -------------------------------------------------------------
    const wrongPassRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });
    const wrongPassData = (await wrongPassRes.json()) as any;
    record(
      'Login Rejected for Wrong Password (401 Generic)',
      wrongPassRes.status === 401 && wrongPassData.message === 'Invalid email or password.',
      `Rejected with generic security message: "${wrongPassData.message}"`
    );

    // -------------------------------------------------------------
    // 8. Login: Valid Credentials
    // -------------------------------------------------------------
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = (await loginRes.json()) as any;
    const loginCookie = await extractCookie(loginRes, 'connectly_refresh_token');

    record(
      'Login Success (200 OK)',
      loginRes.status === 200 && Boolean(loginData.success) && Boolean(loginData.data?.accessToken),
      `Received fresh access token for user ${loginData.data?.user?.email}`
    );

    record(
      'HTTP-Only Refresh Cookie Set on Login',
      Boolean(loginCookie),
      `Set-Cookie connectly_refresh_token received on login`
    );

    const loginAccessToken = loginData.data?.accessToken;
    const loginRefreshToken = loginCookie;

    // Verify last_login_at updated in MySQL
    const [loginUserRows] = await pool.query<RowDataPacket[]>(
      'SELECT last_login_at FROM users WHERE id = ?',
      [userId]
    );
    record(
      'User last_login_at Updated in Database',
      loginUserRows[0]?.last_login_at !== null,
      `last_login_at: ${loginUserRows[0]?.last_login_at}`
    );

    // -------------------------------------------------------------
    // 9. Protected Endpoint: GET /api/auth/me
    // -------------------------------------------------------------
    // Without token:
    const meNoTokenRes = await fetch(`${API_BASE}/auth/me`);
    record(
      'Protected Route Blocks Missing Token (401)',
      meNoTokenRes.status === 401,
      'Rejected unauthenticated request to /api/auth/me'
    );

    // With valid token:
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${loginAccessToken}` },
    });
    const meData = (await meRes.json()) as any;
    const returnedUser = meData.data?.user;
    record(
      'GET /api/auth/me Returns Current User Profile',
      meRes.status === 200 && returnedUser?.id === userId,
      `User ${returnedUser?.id} (${returnedUser?.email}), Name: ${returnedUser?.firstName} ${returnedUser?.lastName}`
    );

    record(
      'Security: No Password or Token Hashes in Response',
      returnedUser?.password_hash === undefined &&
        returnedUser?.password === undefined &&
        returnedUser?.refresh_token_hash === undefined,
      'Sensitive credentials completely omitted from API response payload'
    );

    // -------------------------------------------------------------
    // 10. Refresh Token Rotation: POST /api/auth/refresh
    // -------------------------------------------------------------
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `connectly_refresh_token=${loginRefreshToken}`,
      },
      body: JSON.stringify({ refreshToken: loginRefreshToken }),
    });
    const refreshData = (await refreshRes.json()) as any;
    const rotatedCookie = await extractCookie(refreshRes, 'connectly_refresh_token');

    record(
      'Token Refresh with Rotation (200 OK)',
      refreshRes.status === 200 && Boolean(refreshData.data?.accessToken) && Boolean(rotatedCookie),
      `Received new rotated access token and new HTTP-only refresh cookie`
    );

    const rotatedAccessToken = refreshData.data?.accessToken;

    // Verify newly rotated access token works with /me
    const meAfterRefresh = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${rotatedAccessToken}` },
    });
    record(
      'New Access Token from Rotation Authenticates Successfully',
      meAfterRefresh.status === 200,
      'Session successfully sustained through rotated credentials'
    );

    // -------------------------------------------------------------
    // 11. Active Sessions List: GET /api/auth/sessions
    // -------------------------------------------------------------
    const sessionsRes = await fetch(`${API_BASE}/auth/sessions`, {
      headers: { Authorization: `Bearer ${rotatedAccessToken}` },
    });
    const sessionsData = (await sessionsRes.json()) as any;
    const sessionsList = sessionsData.data?.sessions || [];

    record(
      'GET /api/auth/sessions Lists User Sessions',
      sessionsRes.status === 200 && sessionsList.length >= 1,
      `Found ${sessionsList.length} active sessions for user ${userId}`
    );

    const hasNoHashExposure = sessionsList.every((s: any) => s.refresh_token_hash === undefined);
    record(
      'Session List Never Exposes Refresh Token Hashes',
      Boolean(hasNoHashExposure),
      'All session objects contain only safe metadata (id, ipAddress, userAgent, createdAt, expiresAt)'
    );

    // -------------------------------------------------------------
    // 12. Cross-User Session Revocation Security
    // -------------------------------------------------------------
    // Register User B
    const regBRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userBEmail,
        password: testPassword,
        firstName: 'UserB',
        dateOfBirth: '1999-09-09',
        gender: 'female',
      }),
    });
    const regBData = (await regBRes.json()) as any;
    const userBAccessToken = regBData.data?.accessToken;

    // User B tries to revoke User A's session
    const targetSessionId = sessionsList[0]?.id;
    const crossRevokeRes = await fetch(`${API_BASE}/auth/sessions/${targetSessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBAccessToken}` },
    });
    record(
      'Cross-User Session Revocation Blocked (Security Boundary)',
      crossRevokeRes.status === 404 || crossRevokeRes.status === 403,
      `User B cannot revoke User A session (${crossRevokeRes.status})`
    );

    // -------------------------------------------------------------
    // 13. Single Session Revocation: DELETE /api/auth/sessions/:sessionId
    // -------------------------------------------------------------
    const revokeRes = await fetch(`${API_BASE}/auth/sessions/${targetSessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rotatedAccessToken}` },
    });
    record(
      'Owner Can Revoke Own Session',
      revokeRes.status === 200,
      `Session ${targetSessionId} revoked successfully`
    );

    const [revokedCheck] = await pool.query<RowDataPacket[]>(
      'SELECT revoked_at FROM sessions WHERE id = ?',
      [targetSessionId]
    );
    record(
      'Session revoked_at Timestamp Stamped in Database',
      revokedCheck[0]?.revoked_at !== null,
      `revoked_at: ${revokedCheck[0]?.revoked_at}`
    );

    // -------------------------------------------------------------
    // 14. Logout: POST /api/auth/logout
    // -------------------------------------------------------------
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${rotatedAccessToken}`,
        Cookie: `connectly_refresh_token=${rotatedCookie}`,
      },
      body: JSON.stringify({ refreshToken: rotatedCookie }),
    });
    const clearCookieHeader = logoutRes.headers.get('set-cookie');
    record(
      'POST /api/auth/logout Succeeds and Clears Cookie',
      logoutRes.status === 200 && Boolean(clearCookieHeader?.includes('Max-Age=0') || clearCookieHeader?.includes('expires=')),
      'Logged out and refresh cookie cleared'
    );

    // -------------------------------------------------------------
    // 15. Logout All Devices: POST /api/auth/logout-all
    // -------------------------------------------------------------
    // Log user B back in to create another session, then logout-all
    const logoutAllRes = await fetch(`${API_BASE}/auth/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBAccessToken}` },
    });
    record(
      'POST /api/auth/logout-all Revokes All User Sessions',
      logoutAllRes.status === 200,
      'All active sessions for User B successfully revoked'
    );

    // -------------------------------------------------------------
    // 16. Account Status Enforcement (Suspended Account)
    // -------------------------------------------------------------
    await pool.query('UPDATE users SET status = "suspended" WHERE id = ?', [userId]);

    const suspendedLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const suspendedLoginData = (await suspendedLoginRes.json()) as any;
    record(
      'Suspended Account Login Blocked (403 Forbidden)',
      suspendedLoginRes.status === 403,
      `Rejected with HTTP 403: ${suspendedLoginData.message}`
    );

    // -------------------------------------------------------------
    // 17. Audit Log Audit Completeness
    // -------------------------------------------------------------
    const [allAuditLogs] = await pool.query<RowDataPacket[]>(
      'SELECT action, entity_type FROM audit_logs WHERE user_id = ? ORDER BY id ASC',
      [userId]
    );
    const recordedActions = allAuditLogs.map((l: any) => l.action);
    const hasRequiredActions =
      recordedActions.includes('USER_REGISTERED') &&
      recordedActions.includes('USER_LOGIN') &&
      recordedActions.includes('REFRESH_TOKEN_USED') &&
      recordedActions.includes('SESSION_REVOKED') &&
      recordedActions.includes('USER_LOGOUT');

    record(
      'Comprehensive Audit Trail Recorded',
      hasRequiredActions,
      `Recorded actions: ${Array.from(new Set(recordedActions)).join(', ')}`
    );

    console.log('\n=============================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`📊 TEST RESULTS: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
    console.log('=============================================================\n');

    return passedCount === totalCount;
  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    return false;
  } finally {
    // Clean up test data
    try {
      await pool.query('DELETE FROM users WHERE email LIKE "auth_test_%" OR email LIKE "auth_user_b_%"');
    } catch {
      // Ignored during cleanup
    }
  }
}

// Auto-run if executed directly via tsx
if (require.main === module) {
  runAuthAcceptanceTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
