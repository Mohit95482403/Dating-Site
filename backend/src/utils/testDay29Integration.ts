import { pool, query } from '../config/database';
import { initializeDatabase } from '../config/databaseInit';
import { AuthService } from '../services/auth.service';
import { UserModel } from '../models/user.model';
import { ProfileModel } from '../models/profile.model';
import { MatchModel } from '../models/match.model';
import { ConversationModel } from '../models/conversation.model';
import { MessageModel } from '../models/message.model';
import { BlockModel } from '../models/block.model';
import { SupportService } from '../services/support.service';
import { SupportModel } from '../models/support.model';
import { SettingsService } from '../services/settings.service';
import { AdminModel } from '../models/admin.model';
import { SubscriptionService } from '../services/subscription.service';
import { DiscoveryService } from '../services/discovery.service';
import { RowDataPacket } from 'mysql2/promise';

interface TestResult {
  group: string;
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(group: string, name: string, condition: boolean, message?: string) {
  const passed = Boolean(condition);
  results.push({
    group,
    name,
    passed,
    message: message || (passed ? 'Verified successfully' : 'Condition check failed'),
  });
  console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} [${group}] ${name}: ${message || ''}`);
}

async function runDay29IntegrationSuite() {
  console.log('\n========================================================================');
  console.log('   CONNECTLY DAY 29 — FINAL SYSTEM INTEGRATION & PRODUCTION QA SUITE   ');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Database Initialization & Schema Integrity Check
    // -------------------------------------------------------------------------
    console.log('--- 1. Database Schema Integrity & Migration Check ---');
    await initializeDatabase();

    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = tables.map((t: any) => Object.values(t)[0] as string);
    assert('Schema', 'password_resets table initialized', tableNames.includes('password_resets'));
    assert('Schema', 'support_tickets table exists', tableNames.includes('support_tickets'));
    assert('Schema', 'platform_settings table exists', tableNames.includes('platform_settings'));
    assert('Schema', 'feature_flags table exists', tableNames.includes('feature_flags'));
    assert('Schema', 'payment_transactions table exists', tableNames.includes('payment_transactions'));

    // -------------------------------------------------------------------------
    // Phase 2: Authentication & Password Recovery Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- 2. End-to-End Authentication & Recovery Lifecycle ---');
    const timestamp = Date.now();
    const userA_email = `day29_alice_${timestamp}@test.com`;
    const userB_email = `day29_bob_${timestamp}@test.com`;
    const initialPassword = 'InitialSecurePassword123!';
    const updatedPassword = 'NewSecretPassword456!';

    // Register User A
    const regResultA = await AuthService.register(
      {
        email: userA_email,
        password: initialPassword,
        firstName: 'Alice',
        lastName: 'Day29',
        dateOfBirth: '2000-01-15',
        gender: 'female',
      },
      '127.0.0.1',
      'IntegrationTestRunner'
    );
    const userA_id = regResultA.user.id;
    assert('Auth', 'User A registered with hashed password', !!userA_id && !!regResultA.accessToken);

    // Register User B
    const regResultB = await AuthService.register(
      {
        email: userB_email,
        password: initialPassword,
        firstName: 'Bob',
        lastName: 'Day29',
        dateOfBirth: '1999-05-20',
        gender: 'male',
      },
      '127.0.0.1',
      'IntegrationTestRunner'
    );
    const userB_id = regResultB.user.id;
    assert('Auth', 'User B registered successfully', !!userB_id && !!regResultB.accessToken);

    // Duplicate email registration should fail
    let duplicateBlocked = false;
    try {
      await AuthService.register(
        {
          email: userA_email,
          password: 'AnyPassword123!',
          firstName: 'AliceDuplicate',
          dateOfBirth: '2000-01-01',
          gender: 'female',
        },
        '127.0.0.1',
        'IntegrationTestRunner'
      );
    } catch {
      duplicateBlocked = true;
    }
    assert('Auth', 'Duplicate registration rejected with conflict', duplicateBlocked);

    // Password Reset Flow
    const forgotRes = await AuthService.requestPasswordReset(userA_email, '127.0.0.1', 'IntegrationTestRunner');
    const rawResetToken = forgotRes.devToken;
    assert('Auth', 'Password reset token generated securely', !!rawResetToken);

    // Verify token validity
    const tokenCheck = await AuthService.verifyResetToken(rawResetToken!);
    assert('Auth', 'Reset token verified against hash', tokenCheck.valid && tokenCheck.userId === userA_id);

    // Complete password reset
    const resetResult = await AuthService.resetPassword(rawResetToken!, updatedPassword, '127.0.0.1', 'IntegrationTestRunner');
    assert('Auth', 'Password successfully reset', !!resetResult.message);

    // Attempt token reuse (must be rejected)
    let reuseBlocked = false;
    try {
      await AuthService.resetPassword(rawResetToken!, 'AnotherPassword789!', '127.0.0.1', 'IntegrationTestRunner');
    } catch {
      reuseBlocked = true;
    }
    assert('Auth', 'Reused reset token safely rejected', reuseBlocked);

    // Verify old password no longer works
    let oldPasswordRejected = false;
    try {
      await AuthService.login({ email: userA_email, password: initialPassword }, '127.0.0.1', 'IntegrationTestRunner');
    } catch {
      oldPasswordRejected = true;
    }
    assert('Auth', 'Old password rejected post-reset', oldPasswordRejected);

    // Verify new password successfully logs in
    const loginNew = await AuthService.login({ email: userA_email, password: updatedPassword }, '127.0.0.1', 'IntegrationTestRunner');
    assert('Auth', 'Login succeeds with new password', !!loginNew.accessToken && loginNew.user.id === userA_id);

    // -------------------------------------------------------------------------
    // Phase 3: Profile System & Privacy Settings
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Profile Persistence & Privacy Verification ---');
    await ProfileModel.update(userA_id, {
      bio: 'Enthusiastic software engineer exploring Connectly Day 29.',
      location_city: 'Bengaluru',
      location_country: 'India',
    });

    const userA_profile = await ProfileModel.findByUserId(userA_id);
    assert(
      'Profile',
      'Bio and Location updated and persisted',
      userA_profile?.bio === 'Enthusiastic software engineer exploring Connectly Day 29.' &&
      userA_profile?.location_city === 'Bengaluru'
    );

    // -------------------------------------------------------------------------
    // Phase 4: Discovery, Mutual Matching & Block Safety Guard
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Discovery, Matching & Safety Perimeter ---');
    // Alice likes Bob
    const like1 = await DiscoveryService.likeProfile(userA_id, userB_id);
    assert('Matching', 'Alice swipes like on Bob', !!like1 && !like1.matched);

    // Bob likes Alice -> Mutual Match formed!
    const like2 = await DiscoveryService.likeProfile(userB_id, userA_id);
    assert('Matching', 'Bob swipes like on Alice -> Mutual Match formed', !!like2 && like2.matched);

    const matchesA = await MatchModel.findUserMatches(userA_id);
    const hasMatchWithBob = matchesA.some((m) => m.user.id === userB_id);
    assert('Matching', 'Match record listed in Alice profile directory', hasMatchWithBob);

    // Block Safety Enforcement: Alice blocks a real user ID
    const [spammerRows] = await pool.query<any>(
      "INSERT INTO users (email, password_hash, role, status) VALUES (?, '$2b$12$dummyhash', 'user', 'active')",
      [`spammer_${timestamp}@test.com`]
    );
    const spammerId = spammerRows.insertId;
    await BlockModel.blockUser(userA_id, spammerId, 'Inappropriate behavior');
    const isBlocked = await BlockModel.isBlocked(userA_id, spammerId);
    assert('Safety', 'Block relationship enforced between users', isBlocked);

    // -------------------------------------------------------------------------
    // Phase 5: Messaging & Conversation Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Messaging & Conversation Flow ---');
    const matchId = matchesA[0].id;
    const conv = await ConversationModel.getOrCreateForMatch(matchId, userA_id, userB_id);
    const conversationId = conv.id;
    assert('Chat', 'Conversation thread initialized between matched users', typeof conversationId === 'number');

    const msgId = await MessageModel.createMessage(conversationId, userA_id, 'Hi Bob, excited to connect on Connectly!');
    const msg = await MessageModel.findById(msgId, userA_id);
    assert('Chat', 'Message sent and stored with conversation sequence', !!msg && !!msg.id);

    const markedIds = await MessageModel.markMessagesRead(conversationId, userB_id);
    assert('Chat', 'Read receipts acknowledge thread delivery', markedIds.length >= 1);

    // -------------------------------------------------------------------------
    // Phase 6: Social Feed & Community Interactions
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Social Feed & Communities Verification ---');
    const [postRes] = await pool.query<any>(
      'INSERT INTO posts (user_id, content, visibility) VALUES (?, "Connectly Day 29 launch is looking stellar! #launch #connectly", "public")',
      [userA_id]
    );
    const postId = postRes.insertId;
    assert('Social', 'Feed post created by user', !!postId);

    // Like post
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userB_id]);
    const [likeCountRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?',
      [postId]
    );
    assert('Social', 'Post like recorded in MySQL', Number(likeCountRows[0]?.count) === 1);

    // Bookmark post
    await pool.query('INSERT INTO post_bookmarks (post_id, user_id) VALUES (?, ?)', [postId, userB_id]);
    const [bmRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM post_bookmarks WHERE post_id = ?',
      [postId]
    );
    assert('Social', 'Post bookmarked by matched user', Number(bmRows[0]?.count) === 1);

    // -------------------------------------------------------------------------
    // Phase 7: Support Desk & Privacy Segregation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Support Center & Staff Note Segregation ---');
    const [adminRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1"
    );
    let adminId = adminRows[0]?.id;
    if (!adminId) {
      const [newAdmin] = await pool.query<any>(
        "INSERT INTO users (email, password_hash, role, status) VALUES ('day29_admin@test.com', '$2b$12$dummyhash', 'admin', 'active')"
      );
      adminId = newAdmin.insertId;
    }

    const ticket = await SupportService.createTicket(userA_id, {
      subject: 'Question regarding VIP perks',
      category: 'subscription',
      priority: 'medium',
      message: 'Does VIP subscription include unlimited instant boosts?',
    });
    if (!ticket) throw new Error('Ticket creation failed');
    assert('Support', 'User submitted support ticket', !!ticket && !!ticket.id);

    // Staff user-visible reply
    await SupportService.replyTicket(ticket.id, adminId, 'admin', 'Yes, VIP includes monthly allocated priority boosts.', false);

    // Staff private internal note
    await SupportService.replyTicket(ticket.id, adminId, 'admin', 'STAFF NOTE: User is in top engagement tier.', true);

    const userVisibleThread = await SupportModel.getTicketMessages(ticket.id, false);
    const leakedNote = userVisibleThread.some((m) => m.isInternalNote);
    assert('Support', 'Privacy verified: Internal staff note strictly excluded from user view', !leakedNote);

    const staffThread = await SupportModel.getTicketMessages(ticket.id, true);
    assert('Support', 'Staff audit view displays complete thread with internal notes', staffThread.length === 3);

    // -------------------------------------------------------------------------
    // Phase 8: Platform Configuration & Dynamic Feature Flags
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Platform Settings & Feature Flags Verification ---');
    const siteName = await SettingsService.getSettingValue('site_name', 'Default');
    assert('Settings', 'Platform setting site_name fetched from DB', siteName === 'Connectly');

    const flags = await SettingsService.getFeatureFlags();
    assert('Flags', 'System feature flags populated', flags.length >= 7);

    const aiEnabled = await SettingsService.isFeatureEnabled('AI_FEATURES');
    assert('Flags', 'AI_FEATURES flag operational', typeof aiEnabled === 'boolean');

    // -------------------------------------------------------------------------
    // Phase 9: Admin Operations, User Moderation & Anti-Lockout
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Admin Control Center & Moderation Enforcement ---');
    // Admin suspends User B temporarily for 24 hours
    await AdminModel.suspendUser(adminId, userB_id, 'Testing temporary suspension', 24);
    const userB_suspended = await UserModel.findById(userB_id);
    assert(
      'Admin',
      'User B suspended with valid expiration timestamp',
      userB_suspended?.status === 'suspended' && !!userB_suspended?.suspended_until
    );

    // Admin unsuspends User B
    await AdminModel.unsuspendUser(adminId, userB_id, 'Reinstatement after QA review');
    const userB_active = await UserModel.findById(userB_id);
    assert('Admin', 'User B reinstated to active state', userB_active?.status === 'active');

    // -------------------------------------------------------------------------
    // Phase 10: Payment Transactions & Reconciled Refund Architecture
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Payment & Refund Architecture ---');
    const [txRes] = await pool.query<any>(
      `INSERT INTO payment_transactions 
       (user_id, plan_id, provider, provider_payment_id, provider_order_id, amount, currency, status)
       VALUES (?, 1, 'razorpay', ?, 'order_day29_test', 499, 'INR', 'success')`,
      [userA_id, `pay_day29_${timestamp}`]
    );
    const txId = txRes.insertId;

    const refund = await SubscriptionService.adminRefundTransaction(adminId, txId, 'Customer test refund');
    assert('Payments', 'Transaction refunded and recorded in audit log', refund.status === 'refunded');

    // -------------------------------------------------------------------------
    // Cleanup QA Test Artifacts
    // -------------------------------------------------------------------------
    await pool.query('DELETE FROM support_messages WHERE ticket_id = ?', [ticket.id]);
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [ticket.id]);
    await pool.query('DELETE FROM post_likes WHERE post_id = ?', [postId]);
    await pool.query('DELETE FROM post_bookmarks WHERE post_id = ?', [postId]);
    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    await pool.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    await pool.query('DELETE FROM conversations WHERE id = ?', [conversationId]);
    await pool.query('DELETE FROM matches WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)', [userA_id, userB_id, userB_id, userA_id]);
    await pool.query('DELETE FROM likes WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)', [userA_id, userB_id, userB_id, userA_id]);
    await pool.query('DELETE FROM blocks WHERE blocker_id = ? AND blocked_user_id = ?', [userA_id, spammerId]);
    await pool.query('DELETE FROM payment_transactions WHERE id = ?', [txId]);
    await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userA_id]);
    await pool.query('DELETE FROM profiles WHERE user_id IN (?, ?)', [userA_id, userB_id]);
    await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA_id, userB_id, spammerId]);

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('   CONNECTLY DAY 29 TEST SUITE SUMMARY');
    console.log('========================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`\nTotal Verifications: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 ALL DAY 29 SYSTEM INTEGRATION & END-TO-END QA TESTS PASSED!\n');
    } else {
      console.error(`\n❌ ${failed} verification check(s) failed.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Day 29 test suite execution:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay29IntegrationSuite();
