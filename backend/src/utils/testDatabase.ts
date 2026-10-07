import { pool, query, execute, transaction, testDatabaseConnection } from '../config/database';
import { initializeDatabase } from '../config/databaseInit';
import { RowDataPacket } from 'mysql2/promise';

/**
 * Connectly Day 2 Complete Database Acceptance Test Runner
 * Validates:
 * 1. Connection check
 * 2. Database schema initialization
 * 3. All 20 required tables existence
 * 4. Seed data completeness (20 default interests)
 * 5. Parameterized query safety
 * 6. Transaction commit functionality
 * 7. Transaction rollback functionality
 * 8. Foreign key cascade integrity
 */
export async function runDatabaseTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('🧪 CONNECTLY DAY 2 - DATABASE ACCEPTANCE TEST SUITE');
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
    // Test 1: Connectivity
    console.log('1. Testing MySQL Connectivity...');
    const connected = await testDatabaseConnection();
    assert('MySQL server connection established', connected);

    // Test 2: Database Initialization Runner
    console.log('\n2. Testing Schema Initialization & Idempotency...');
    await initializeDatabase();
    assert('initializeDatabase() executed without exceptions', true);

    // Test 3: Verify All 20 Tables
    console.log('\n3. Verifying All 20 Required Relational Tables...');
    const requiredTables = [
      'users',
      'profiles',
      'preferences',
      'interests',
      'user_interests',
      'photos',
      'likes',
      'passes',
      'super_likes',
      'matches',
      'conversations',
      'conversation_members',
      'messages',
      'message_reactions',
      'notifications',
      'blocks',
      'reports',
      'verification_requests',
      'sessions',
      'audit_logs'
    ];

    const existingTablesResult = await query<RowDataPacket[]>('SHOW TABLES');
    const dbName = process.env.DB_NAME || 'connectly';
    const existingTableNames = existingTablesResult.map(
      (row) => row[`Tables_in_${dbName}`] || Object.values(row)[0]
    ) as string[];

    for (const table of requiredTables) {
      assert(`Table "${table}" exists`, existingTableNames.includes(table));
    }

    // Test 4: Verify Seed Data
    console.log('\n4. Verifying Seed Data (Interests)...');
    const interests = await query<RowDataPacket[]>('SELECT id, name, slug FROM interests ORDER BY id ASC');
    assert('Interests table contains at least 20 seeded interests', interests.length >= 20);
    const sampleInterest = interests.find((i) => i.slug === 'technology');
    assert('Interest "Technology" exists in seed data', !!sampleInterest);

    // Test 5: Parameterized Query Verification
    console.log('\n5. Verifying Parameterized Query Protection...');
    const paramResults = await query<RowDataPacket[]>(
      'SELECT id, name, slug FROM interests WHERE slug = ?',
      ['photography']
    );
    assert('Parameterized SELECT returned matching interest safely', paramResults.length === 1 && paramResults[0].slug === 'photography');

    // Test 6: Transaction Commit Test
    console.log('\n6. Testing Atomic Transaction (Commit)...');
    const testEmail = `test_tx_commit_${Date.now()}@connectly.local`;
    let insertedUserId = 0;

    await transaction(async (conn) => {
      const [userRes] = await conn.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [testEmail, '$2b$10$FakeHashedPasswordForTestOnly999', 'user']
      );
      insertedUserId = (userRes as any).insertId;

      await conn.execute(
        'INSERT INTO profiles (user_id, first_name, last_name) VALUES (?, ?, ?)',
        [insertedUserId, 'Transaction', 'Tester']
      );
    });

    const [committedUser] = await query<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE id = ?',
      [insertedUserId]
    );
    const [committedProfile] = await query<RowDataPacket[]>(
      'SELECT user_id, first_name FROM profiles WHERE user_id = ?',
      [insertedUserId]
    );
    assert('Transaction commit persisted user and profile', !!committedUser && committedProfile?.first_name === 'Transaction');

    // Test 7: Transaction Rollback Test
    console.log('\n7. Testing Atomic Transaction (Rollback on Error)...');
    const rollbackEmail = `test_tx_rollback_${Date.now()}@connectly.local`;
    let rollbackAttempted = false;

    try {
      await transaction(async (conn) => {
        await conn.execute(
          'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
          [rollbackEmail, '$2b$10$FakeHashForRollback', 'user']
        );
        rollbackAttempted = true;
        // Intentionally trigger a foreign key or syntax error to force rollback
        await conn.execute('INSERT INTO invalid_table_that_does_not_exist (id) VALUES (1)');
      });
    } catch {
      // Expected failure
    }

    const [ghostUser] = await query<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE email = ?',
      [rollbackEmail]
    );
    assert('Transaction rollback prevented user creation on failure', rollbackAttempted && !ghostUser);

    // Test 8: Foreign Key Cascade Test (Cleanup)
    console.log('\n8. Testing Foreign Key Cascade Integrity...');
    await execute('DELETE FROM users WHERE id = ?', [insertedUserId]);
    const [orphanProfile] = await query<RowDataPacket[]>(
      'SELECT id FROM profiles WHERE user_id = ?',
      [insertedUserId]
    );
    assert('Deleting user cascaded to profile (no orphan record)', !orphanProfile);

    console.log('\n======================================================');
    console.log(`🏁 TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test runner error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute tests if invoked directly
if (require.main === module || process.argv[1].includes('testDatabase')) {
  runDatabaseTests().then(() => process.exit(0));
}
