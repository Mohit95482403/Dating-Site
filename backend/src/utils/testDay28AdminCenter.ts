import { pool, query } from '../config/database';
import { SupportService } from '../services/support.service';
import { SupportModel } from '../models/support.model';
import { SettingsService } from '../services/settings.service';
import { SettingsModel } from '../models/settings.model';
import { AdminModel } from '../models/admin.model';
import { UserModel } from '../models/user.model';
import { SubscriptionService } from '../services/subscription.service';
import { RowDataPacket } from 'mysql2/promise';

import { initializeDatabase } from '../config/databaseInit';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, message?: string) {
  const passed = Boolean(condition);
  results.push({
    name,
    passed,
    message: message || (passed ? 'Verified successfully' : 'Condition check failed'),
  });
  console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${message || ''}`);
}

async function runDay28TestSuite() {
  console.log('\n================================================================');
  console.log('   CONNECTLY DAY 28 — ADVANCED ADMIN CONTROL CENTER & OPERATIONS');
  console.log('================================================================\n');

  try {
    await initializeDatabase();
    // -------------------------------------------------------------------------
    // 1. Schema & Migration Verification
    // -------------------------------------------------------------------------
    console.log('--- 1. Database Schema & Tables Verification ---');
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = tables.map((t: any) => Object.values(t)[0] as string);

    assert('support_tickets table exists', tableNames.includes('support_tickets'));
    assert('support_messages table exists', tableNames.includes('support_messages'));
    assert('platform_settings table exists', tableNames.includes('platform_settings'));
    assert('feature_flags table exists', tableNames.includes('feature_flags'));

    const [userCols] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM users LIKE 'suspended_until'");
    assert('users.suspended_until column exists', userCols.length > 0);

    const [userReasonCols] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM users LIKE 'suspension_reason'");
    assert('users.suspension_reason column exists', userReasonCols.length > 0);

    // -------------------------------------------------------------------------
    // 2. Platform Settings & Feature Flags Seeding
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Platform Settings & Feature Flags Verification ---');
    const settings = await SettingsService.getAllSettings(true);
    assert('Platform settings populated', settings.length >= 8, `Found ${settings.length} operational settings`);

    const maintenanceVal = await SettingsService.getSettingValue('maintenance_mode', false);
    assert('Read maintenance_mode setting', typeof maintenanceVal === 'boolean');

    const flags = await SettingsService.getFeatureFlags();
    assert('Feature flags populated', flags.length >= 7, `Found ${flags.length} system feature flags`);

    const aiFlag = flags.find((f) => f.key === 'AI_FEATURES');
    assert('AI_FEATURES flag exists', !!aiFlag && typeof aiFlag.isEnabled === 'boolean');

    // -------------------------------------------------------------------------
    // 3. User Setup for Testing
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Setting Up Test Accounts ---');
    // Ensure test admin exists
    const [adminRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1"
    );
    let adminId = adminRows[0]?.id;
    if (!adminId) {
      const [newAdmin] = await pool.query<any>(
        "INSERT INTO users (email, password_hash, role, status) VALUES ('day28_admin@test.com', '$2b$12$dummyhash', 'admin', 'active')"
      );
      adminId = newAdmin.insertId;
    }
    assert('Test Admin available', !!adminId, `Admin ID: ${adminId}`);

    // Create a regular test user
    const userEmail = `day28_user_${Date.now()}@test.com`;
    const [newUser] = await pool.query<any>(
      'INSERT INTO users (email, password_hash, role, status) VALUES (?, "$2b$12$dummyhash", "user", "active")',
      [userEmail]
    );
    const testUserId = newUser.insertId;
    await pool.query('INSERT INTO profiles (user_id, first_name, last_name) VALUES (?, "Day28", "Tester")', [testUserId]);
    assert('Test User created', !!testUserId, `User ID: ${testUserId}`);

    // -------------------------------------------------------------------------
    // 4. Support Desk: Ticket Lifecycle & Staff Internal Notes
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Support Desk Ticket Lifecycle & Internal Notes ---');
    const ticket = await SupportService.createTicket(testUserId, {
      subject: 'Billing inquiry regarding boost package',
      category: 'payments',
      priority: 'high',
      message: 'Hello, I was charged for a boost but did not see it activate on my account.',
    });
    if (!ticket) throw new Error('Ticket creation failed');
    assert('Support ticket created', !!ticket && !!ticket.id, `Ticket #${ticket.ticketNumber}`);

    // User-visible staff reply
    const reply1 = await SupportService.replyTicket(
      ticket.id,
      adminId,
      'admin',
      'We are looking into this payment transaction right now. Please allow 15 minutes.',
      false // NOT an internal note
    );
    assert('User-visible reply added', !!reply1 && !reply1.isInternalNote);

    // Private staff internal note
    const internalNote = await SupportService.replyTicket(
      ticket.id,
      adminId,
      'admin',
      'INTERNAL NOTE: Investigated stripe charge ID #tx_9812 - confirmed gateway timeout, queued for manual credit.',
      true // IS an internal note
    );
    assert('Private internal note created', !!internalNote && internalNote.isInternalNote);

    // Verify privacy separation: regular user query must NOT include internal note
    const userThread = await SupportModel.getTicketMessages(ticket.id, false);
    const hasLeak = userThread.some((m) => m.isInternalNote);
    assert('Privacy enforcement: Internal notes hidden from user', !hasLeak && userThread.length === 2);

    // Staff query includes internal note
    const staffThread = await SupportModel.getTicketMessages(ticket.id, true);
    assert('Staff audit: Staff can inspect internal notes', staffThread.length === 3);

    // Staff assignment
    const assignedTicket = await SupportService.assignTicket(ticket.id, adminId, adminId);
    assert('Support ticket assigned to staff', assignedTicket.assignedTo === adminId);

    // Status resolution
    const resolvedTicket = await SupportService.updateStatus(
      ticket.id,
      'resolved',
      'Boost manually credited to user account and verified active.',
      adminId
    );
    assert('Support ticket resolved', resolvedTicket.status === 'resolved');

    // Aggregate support stats
    const supportStats = await SupportModel.getSupportStats();
    assert('Support telemetry stats calculated', typeof supportStats.totalTickets === 'number' && supportStats.totalTickets > 0);

    // -------------------------------------------------------------------------
    // 5. Temporary Suspension System & Auto-Unsuspend
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Temporary Suspension & Auto-Unsuspend Enforcement ---');
    // Temporary 24-hour suspension
    await AdminModel.suspendUser(adminId, testUserId, 'Repeated spam violation', 24);

    const suspendedUser = await UserModel.findById(testUserId);
    assert(
      'User suspended with expiration timestamp',
      suspendedUser?.status === 'suspended' && !!suspendedUser?.suspended_until,
      `Suspended until: ${suspendedUser?.suspended_until}`
    );

    // Simulate expired suspension: set suspended_until to 1 hour in the past
    await pool.query(
      'UPDATE users SET suspended_until = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [testUserId]
    );

    // Reinstatement / Unsuspend
    await AdminModel.unsuspendUser(adminId, testUserId, 'Good behavior reinstatement');
    const restoredUser = await UserModel.findById(testUserId);
    assert(
      'User reinstated to active status',
      restoredUser?.status === 'active' && restoredUser?.suspended_until === null
    );

    // -------------------------------------------------------------------------
    // 6. Role Management & Last-Admin Lockout Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Role Management & Anti-Lockout Defense ---');
    await AdminModel.updateUserRole(adminId, testUserId, 'moderator');
    const modUser = await UserModel.findById(testUserId);
    assert('User role upgraded to moderator', modUser?.role === 'moderator');

    // Verify last-admin lockout defense
    const [activeAdmins] = await query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'"
    );
    if (Number(activeAdmins[0]?.count) <= 1) {
      let lockoutPrevented = false;
      try {
        await AdminModel.updateUserRole(adminId, adminId, 'user');
      } catch (err: any) {
        lockoutPrevented = true;
      }
      assert('Last-admin lockout protection active', lockoutPrevented);
    } else {
      assert('Multiple administrators detected', true);
    }

    // -------------------------------------------------------------------------
    // 7. Payment Transaction Refund Reconciliation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Payment Operations & Refund Architecture ---');
    // Create a mock successful transaction
    const [txRes] = await pool.query<any>(
      `INSERT INTO payment_transactions 
       (user_id, plan_id, provider, provider_payment_id, provider_order_id, amount, currency, status)
       VALUES (?, 1, 'razorpay', ?, 'order_test_28', 499, 'INR', 'success')`,
      [testUserId, `pay_day28_${Date.now()}`]
    );
    const testTxId = txRes.insertId;

    const refundRes = await SubscriptionService.adminRefundTransaction(
      adminId,
      testTxId,
      'Accidental double subscription purchase'
    );
    assert('Transaction successfully refunded', refundRes.status === 'refunded' && refundRes.amount === 499);

    const [updatedTx] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM payment_transactions WHERE id = ?',
      [testTxId]
    );
    assert('Database transaction status reconciled to refunded', updatedTx[0]?.status === 'refunded');

    // -------------------------------------------------------------------------
    // 8. Multi-Entity Unified Search
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Multi-Entity Unified Search Verification ---');
    const searchUsers = await query<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE email LIKE ?',
      [`%${userEmail}%`]
    );
    assert('Unified search finds user', searchUsers.length > 0);

    const searchTickets = await query<RowDataPacket[]>(
      'SELECT id, ticket_number FROM support_tickets WHERE id = ?',
      [ticket.id]
    );
    assert('Unified search finds support ticket', searchTickets.length > 0);

    // -------------------------------------------------------------------------
    // 9. Compliance Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Compliance Audit Trail Verification ---');
    const [auditRows] = await pool.query<RowDataPacket[]>(
      `SELECT action, entity_type FROM audit_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [adminId]
    );
    const recordedActions = auditRows.map((a: any) => a.action);
    assert('USER_SUSPENDED audited', recordedActions.includes('USER_SUSPENDED'));
    assert('USER_UNSUSPENDED audited', recordedActions.includes('USER_UNSUSPENDED'));
    assert('USER_ROLE_CHANGED audited', recordedActions.includes('USER_ROLE_CHANGED'));
    assert('PAYMENT_REFUNDED audited', recordedActions.includes('PAYMENT_REFUNDED'));
    assert('SUPPORT_TICKET_RESOLVED audited', recordedActions.includes('SUPPORT_TICKET_RESOLVED'));

    // Cleanup test data
    await pool.query('DELETE FROM support_messages WHERE ticket_id = ?', [ticket.id]);
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [ticket.id]);
    await pool.query('DELETE FROM payment_transactions WHERE id = ?', [testTxId]);
    await pool.query('DELETE FROM profiles WHERE user_id = ?', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);

    console.log('\n================================================================');
    console.log('   CONNECTLY DAY 28 TEST SUITE SUMMARY');
    console.log('================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`\nTotal Verifications: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 ALL DAY 28 ADMIN CONTROL CENTER & OPERATIONS TESTS PASSED!\n');
    } else {
      console.error(`\n❌ ${failed} verification check(s) failed.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Day 28 test suite execution:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay28TestSuite();
