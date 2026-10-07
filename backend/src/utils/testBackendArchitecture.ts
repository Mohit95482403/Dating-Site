import config from '../config/env';
import { ApiResponse } from './apiResponse';
import { AppError } from './AppError';
import { JwtUtil } from './jwt';
import { PasswordUtil } from './password';
import { PaginationUtil } from './pagination';
import { SocketUserRegistry } from '../sockets/socketEvents';
import { validateRegisterInput } from '../validators/auth.validator';
import { InterestService } from '../services/interest.service';
import { pool } from '../config/database';

export async function runArchitectureTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('🧪 CONNECTLY DAY 3 - BACKEND ARCHITECTURE TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (description: string, condition: boolean) => {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // 1. Config Layer
    console.log('1. Testing Centralized Environment Configuration...');
    assert('config.env.port is configured', typeof config.env.port === 'number' && config.env.port > 0);
    assert('config.env.database is configured', !!config.env.database.name);
    assert('config.env.jwt has secrets', !!config.env.jwt.secret && !!config.env.jwt.refreshSecret);

    // 2. Custom AppError
    console.log('\n2. Testing Custom AppError Hierarchy...');
    const notFoundErr = AppError.notFound('Profile not found');
    assert('AppError.notFound sets 404', notFoundErr.statusCode === 404 && notFoundErr.isOperational);
    const unprocessableErr = AppError.unprocessable('Validation failed', ['Email invalid']);
    assert('AppError.unprocessable sets 422 with details', unprocessableErr.statusCode === 422 && Array.isArray(unprocessableErr.details));

    // 3. JWT Utility
    console.log('\n3. Testing JWT Utility (Access & Refresh Tokens)...');
    const testPayload = { userId: 42, email: 'alex@connectly.local', role: 'user' as const };
    const accessToken = JwtUtil.generateAccessToken(testPayload);
    const decodedAccess = JwtUtil.verifyAccessToken(accessToken);
    assert('JWT Access token verified with payload', decodedAccess.userId === 42 && decodedAccess.email === 'alex@connectly.local');

    const refreshToken = JwtUtil.generateRefreshToken(testPayload);
    const decodedRefresh = JwtUtil.verifyRefreshToken(refreshToken);
    assert('JWT Refresh token verified with payload', decodedRefresh.userId === 42);

    // 4. Password Utility (bcrypt)
    console.log('\n4. Testing Password Utility (bcrypt hashing & comparison)...');
    const plain = 'SuperSecretP@ssw0rd!123';
    const hash = await PasswordUtil.hashPassword(plain);
    assert('bcrypt hash generated', !!hash && hash.startsWith('$2b$'));
    const isMatch = await PasswordUtil.comparePassword(plain, hash);
    assert('bcrypt compare succeeds on correct password', isMatch === true);
    const isFalseMatch = await PasswordUtil.comparePassword('WrongPassword', hash);
    assert('bcrypt compare rejects wrong password', isFalseMatch === false);

    // 5. Pagination Utility
    console.log('\n5. Testing Pagination Calculation & Clamping...');
    const opts = PaginationUtil.getPaginationOptions({ page: '3', limit: '15' });
    assert('Pagination offset calculated correctly', opts.page === 3 && opts.limit === 15 && opts.offset === 30);
    const clamped = PaginationUtil.getPaginationOptions({ page: '-1', limit: '500' });
    assert('Pagination clamping enforces minimum page 1 and max limit 100', clamped.page === 1 && clamped.limit === 100);
    const meta = PaginationUtil.getMetadata(95, 3, 20);
    assert('Pagination metadata calculates totalPages, hasNext, hasPrev', meta.totalPages === 5 && meta.hasNext === true && meta.hasPrev === true);

    // 6. Validation Layer
    console.log('\n6. Testing Request Validation Layer...');
    const validResult = validateRegisterInput({
      email: 'test@example.com',
      password: 'SecurePassword123!',
      firstName: 'Alex',
      dateOfBirth: '2000-01-01',
      gender: 'female',
    });
    assert('Validator passes valid registration input', validResult === null);
    const invalidResult = validateRegisterInput({
      email: 'bad-email',
      password: 'short',
      firstName: 'Alex',
      dateOfBirth: '2000-01-01',
      gender: 'female',
    });
    assert('Validator catches invalid email and short password', Array.isArray(invalidResult) && invalidResult.length >= 2);

    // 7. Socket User Registry
    console.log('\n7. Testing Socket Multi-Device Registry...');
    SocketUserRegistry.addUser(101, 'socket-device-1');
    SocketUserRegistry.addUser(101, 'socket-device-2');
    assert('User 101 has 2 active sockets', SocketUserRegistry.getUserSockets(101).length === 2 && SocketUserRegistry.isUserOnline(101));
    const isStillOnline = !SocketUserRegistry.removeUser(101, 'socket-device-1');
    assert('User 101 remains online after 1 socket disconnects', isStillOnline && SocketUserRegistry.isUserOnline(101));
    const nowOffline = SocketUserRegistry.removeUser(101, 'socket-device-2');
    assert('User 101 goes completely offline after all sockets disconnect', nowOffline && !SocketUserRegistry.isUserOnline(101));

    // 8. Service -> Model -> Database Pattern
    console.log('\n8. Testing Controller -> Service -> Model -> Database Execution...');
    const interests = await InterestService.getAllInterests();
    assert('InterestService fetched interests through Model and MySQL pool', Array.isArray(interests) && interests.length >= 20);

    console.log('\n======================================================');
    console.log(`🏁 ARCHITECTURE TEST FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal architecture test error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module || process.argv[1].includes('testBackendArchitecture')) {
  runArchitectureTests().then(() => process.exit(0));
}
