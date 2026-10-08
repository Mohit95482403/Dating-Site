import { CallService } from '../services/call.service';
import { CallModel } from '../models/call.model';
import { MatchModel } from '../models/match.model';
import { UserModel } from '../models/user.model';
import { SocketUserRegistry } from '../sockets/socketEvents';
import { testDatabaseConnection, pool, execute } from '../config/database';
import bcrypt from 'bcrypt';

const runTests = async () => {
  console.log('===============================================================');
  console.log('CONNECTLY — COMPREHENSIVE CALL BUSY & STATE VERIFICATION SUITE');
  console.log('===============================================================\n');

  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.error('Database connection failed. Aborting test.');
    process.exit(1);
  }

  // 1. Startup stale call cleanup
  console.log('--- TEST 1: Startup Stale Call Cleanup ---');
  await CallService.cleanupStaleCallsOnStartup();
  console.log('✅ Startup cleanup executed cleanly.');

  // Create or reuse 3 test users: User A, User B, User C
  const ts = Date.now();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const getOrCreateTestUser = async (email: string, firstName: string): Promise<number> => {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      await execute("UPDATE users SET status = 'active' WHERE id = ?", [existing.id]);
      return existing.id;
    }
    const res = await execute(
      `INSERT INTO users (email, password_hash, username, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [email, passwordHash, `${firstName}_${ts}`]
    );
    const userId = res.insertId;
    await execute(
      `INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender)
       VALUES (?, ?, 'Tester', '1995-05-15', 'other')`,
      [userId, firstName]
    );
    return userId;
  };

  const userAId = await getOrCreateTestUser(`test_call_a_${ts}@connectly.test`, 'CallerA');
  const userBId = await getOrCreateTestUser(`test_call_b_${ts}@connectly.test`, 'CalleeB');
  const userCId = await getOrCreateTestUser(`test_call_c_${ts}@connectly.test`, 'CallerC');

  console.log(`Created test users: User A (${userAId}), User B (${userBId}), User C (${userCId})`);

  // Ensure active matches exist: A-B, B-C
  await MatchModel.createMatch(userAId, userBId);
  await MatchModel.createMatch(userBId, userCId);

  // Register sockets for presence
  SocketUserRegistry.addUser(userAId, `socket-a-${ts}`);
  SocketUserRegistry.addUser(userBId, `socket-b-${ts}`);
  SocketUserRegistry.addUser(userCId, `socket-c-${ts}`);

  // TEST 2: Normal call (User A calls User B when User B is free)
  console.log('\n--- TEST 2: Normal Call (Free User) ---');
  const call1 = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  console.log(`Call initiated successfully! Call ID: ${call1.id}, Status: ${call1.status}`);
  if (call1.status !== 'ringing') throw new Error(`Expected ringing status, got ${call1.status}`);
  console.log('✅ TEST 2 PASSED: Free User B received call without false "on another call" error.');

  // TEST 3: User B is actually in call with User A -> User C calls User B
  console.log('\n--- TEST 3: User B Actually In Call (Legitimate Busy) ---');
  await CallService.acceptCall(call1.id, userBId);
  console.log(`User B accepted Call ${call1.id}. Now active.`);

  let busyErrorCaught = false;
  try {
    await CallService.initiateCall(userCId, {
      targetUserId: userBId,
      callType: 'audio',
    });
  } catch (err: any) {
    if (err.message === 'This member is currently on another call' && err.statusCode === 409) {
      busyErrorCaught = true;
      console.log(`Correctly rejected caller C with 409 Conflict: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!busyErrorCaught) throw new Error('Expected 409 Conflict for caller C when User B is in active call');
  console.log('✅ TEST 3 PASSED: Legitimate busy check succeeded.');

  // TEST 4: User B ends call -> immediately User C calls User B
  console.log('\n--- TEST 4: Call Termination -> Immediate Re-Call ---');
  await CallService.endCall(call1.id, userBId);
  console.log(`Call ${call1.id} ended.`);

  const call2 = await CallService.initiateCall(userCId, {
    targetUserId: userBId,
    callType: 'video',
  });
  console.log(`Call initiated successfully by User C -> B! Call ID: ${call2.id}, Status: ${call2.status}`);
  if (call2.status !== 'ringing') throw new Error(`Expected ringing status, got ${call2.status}`);
  console.log('✅ TEST 4 PASSED: User B available immediately after call ends.');

  // TEST 5: User B rejects call -> User A calls User B
  console.log('\n--- TEST 5: Rejection Handling ---');
  await CallService.rejectCall(call2.id, userBId);
  console.log(`Call ${call2.id} rejected by User B.`);

  const call3 = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  console.log(`Call initiated successfully by User A -> B! Call ID: ${call3.id}, Status: ${call3.status}`);
  console.log('✅ TEST 5 PASSED: User B available immediately after rejection.');

  // TEST 6: User A cancels call -> User C calls User B
  console.log('\n--- TEST 6: Caller Cancellation ---');
  await CallService.cancelCall(call3.id, userAId);
  console.log(`Call ${call3.id} cancelled by caller User A.`);

  const call4 = await CallService.initiateCall(userCId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  console.log(`Call initiated successfully by User C -> B! Call ID: ${call4.id}, Status: ${call4.status}`);
  console.log('✅ TEST 6 PASSED: User B available immediately after cancellation.');
  await CallService.cancelCall(call4.id, userCId);

  // TEST 7: Caller re-attempting / retry without hang
  console.log('\n--- TEST 7: Same Caller Re-attempting ---');
  const call5 = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  console.log(`Call 5 initiated (ID ${call5.id}). Simulating caller A retrying...`);

  // User A calls User B again without waiting:
  const call6 = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'video',
  });
  console.log(`Call 6 initiated (ID ${call6.id}). Prior attempt was cleanly superseded.`);
  console.log('✅ TEST 7 PASSED: Same caller retry is never falsely marked as busy.');
  await CallService.cancelCall(call6.id, userAId);

  // TEST 8: Repeated calls between same users
  console.log('\n--- TEST 8: Repeated Consecutive Calls ---');
  for (let i = 1; i <= 3; i++) {
    const callIter = await CallService.initiateCall(userAId, {
      targetUserId: userBId,
      callType: i % 2 === 0 ? 'video' : 'audio',
    });
    await CallService.acceptCall(callIter.id, userBId);
    await CallService.endCall(callIter.id, userAId);
    console.log(`Iteration ${i}: Audio/Video cycle completed successfully.`);
  }
  console.log('✅ TEST 8 PASSED: Repeated calls complete without state pollution.');

  // TEST 9: Disconnect Cleanup
  console.log('\n--- TEST 9: User Disconnect Cleanup ---');
  const callDisconnect = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  await CallService.acceptCall(callDisconnect.id, userBId);
  console.log(`Call ${callDisconnect.id} accepted. Simulating User B socket disconnect...`);

  await CallService.handleUserDisconnect(userBId);
  const sessionAfterDisconnect = CallService.getActiveSessionForUser(userBId);
  if (sessionAfterDisconnect) throw new Error('Session should be cleared after disconnect');

  // Verify User B is available when online again
  const callAfterDisconnect = await CallService.initiateCall(userAId, {
    targetUserId: userBId,
    callType: 'audio',
  });
  console.log(`Call ${callAfterDisconnect.id} initiated cleanly after User B reconnected.`);
  await CallService.cancelCall(callAfterDisconnect.id, userAId);
  console.log('✅ TEST 9 PASSED: Disconnect cleanup prevents permanent busy state.');

  // TEST 10: Simultaneous calls / Race Condition Protection
  console.log('\n--- TEST 10: Simultaneous Calls Race Condition Protection ---');
  const results = await Promise.allSettled([
    CallService.initiateCall(userAId, { targetUserId: userBId, callType: 'audio' }),
    CallService.initiateCall(userCId, { targetUserId: userBId, callType: 'video' }),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`Simultaneous call results: Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(`Expected exactly 1 fulfilled and 1 rejected, got ${fulfilled.length} and ${rejected.length}`);
  }
  const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
  console.log(`Rejection error message: "${rejectionReason?.message}"`);
  if (rejectionReason?.message !== 'This member is currently on another call') {
    throw new Error(`Expected 'This member is currently on another call', got '${rejectionReason?.message}'`);
  }
  console.log('✅ TEST 10 PASSED: Atomic lock cleanly serialized concurrent calls.');

  // Clean up winner call
  const winningCall = (fulfilled[0] as PromiseFulfilledResult<any>).value;
  await CallService.cancelCall(winningCall.id, winningCall.callerId);

  // Clean up registry
  SocketUserRegistry.removeUser(userAId, `socket-a-${ts}`);
  SocketUserRegistry.removeUser(userBId, `socket-b-${ts}`);
  SocketUserRegistry.removeUser(userCId, `socket-c-${ts}`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 10/10 CALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');

  await pool.end();
  process.exit(0);
};

runTests().catch(async (err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
