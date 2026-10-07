// Connectly Day 25: Trust, Safety, Verification, Privacy & Anti-Abuse Test Script

import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { TrustModel } from '../models/trust.model';
import { TrustService } from '../services/trust.service';
import { AbuseRiskService } from '../services/abuseRisk.service';
import crypto from 'crypto';

async function runTests() {
  console.log('===============================================================');
  console.log('   CONNECTLY DAY 25: TRUST, SAFETY, PRIVACY & ANTI-ABUSE TEST  ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Database Tables Verification
    console.log('1. Database Tables & Columns Verification');
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND TABLE_NAME IN (
          'user_security_events',
          'account_restrictions',
          'verification_audit_logs',
          'verification_requests'
        )
    `);
    const tableNames = tables.map((t) => t.TABLE_NAME);
    assert('user_security_events exists', tableNames.includes('user_security_events'));
    assert('account_restrictions exists', tableNames.includes('account_restrictions'));
    assert('verification_audit_logs exists', tableNames.includes('verification_audit_logs'));
    assert('verification_requests exists', tableNames.includes('verification_requests'));

    // Check user columns
    const [userCols] = await pool.query<RowDataPacket[]>(`
      SELECT COLUMN_NAME FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'users' 
        AND COLUMN_NAME IN ('is_phone_verified', 'phone_number', 'two_factor_enabled', 'two_factor_secret', 'two_factor_recovery_codes')
    `);
    const userColNames = userCols.map((c) => c.COLUMN_NAME);
    assert('users.is_phone_verified exists', userColNames.includes('is_phone_verified'));
    assert('users.phone_number exists', userColNames.includes('phone_number'));
    assert('users.two_factor_enabled exists', userColNames.includes('two_factor_enabled'));
    assert('users.two_factor_secret exists', userColNames.includes('two_factor_secret'));
    assert('users.two_factor_recovery_codes exists', userColNames.includes('two_factor_recovery_codes'));

    // Check user_settings columns
    const [settingsCols] = await pool.query<RowDataPacket[]>(`
      SELECT COLUMN_NAME FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'user_settings' 
        AND COLUMN_NAME IN ('location_visibility', 'message_permissions', 'call_permissions', 'ai_data_processing', 'search_visibility')
    `);
    const settingsColNames = settingsCols.map((c) => c.COLUMN_NAME);
    assert('user_settings.location_visibility exists', settingsColNames.includes('location_visibility'));
    assert('user_settings.message_permissions exists', settingsColNames.includes('message_permissions'));
    assert('user_settings.call_permissions exists', settingsColNames.includes('call_permissions'));
    assert('user_settings.ai_data_processing exists', settingsColNames.includes('ai_data_processing'));
    assert('user_settings.search_visibility exists', settingsColNames.includes('search_visibility'));

    // 2. Fetch or create a test user
    console.log('\n2. Test User Setup & Trust Signals Verification');
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email FROM users WHERE role = 'admin' LIMIT 1`
    );
    const testAdmin = userRows[0] || { id: 1, email: 'admin@connectly.local' };
    const testUserId = testAdmin.id;

    const signals = await TrustModel.getUserTrustSignals(testUserId);
    assert('getUserTrustSignals returned valid signals', signals !== null && typeof signals === 'object');
    assert('signals contains completionPercentage number', typeof signals.completionPercentage === 'number');
    assert('signals contains standingTier', ['trusted', 'verified', 'standard', 'under_review', 'restricted'].includes(signals.trustTier));
    assert('signals contains accountAgeDays', typeof signals.accountAgeDays === 'number');

    // 3. Email Verification Flow
    console.log('\n3. Email Verification Flow');
    const emailRes = await TrustService.sendEmailVerification(testUserId, testAdmin.email);
    assert('sendEmailVerification dispatched token', typeof emailRes.devToken === 'string');

    if (emailRes.devToken) {
      await TrustService.verifyEmail(testUserId, emailRes.devToken);
      const [u] = await pool.query<RowDataPacket[]>(
        `SELECT is_email_verified FROM users WHERE id = ?`,
        [testUserId]
      );
      assert('User is marked is_email_verified = 1', Boolean(u[0]?.is_email_verified) === true);
    }

    // 4. Phone OTP Verification Flow
    console.log('\n4. Phone OTP Verification Flow');
    const testPhone = '+919988776655';
    const phoneRes = await TrustService.sendPhoneOtp(testUserId, testPhone);
    assert('sendPhoneOtp generated 6-digit OTP', typeof phoneRes.devOtp === 'string' && phoneRes.devOtp.length === 6);

    if (phoneRes.devOtp) {
      await TrustService.verifyPhoneOtp(testUserId, phoneRes.devOtp);
      const [u] = await pool.query<RowDataPacket[]>(
        `SELECT is_phone_verified, phone_number FROM users WHERE id = ?`,
        [testUserId]
      );
      assert('User is marked is_phone_verified = 1', Boolean(u[0]?.is_phone_verified) === true);
      assert('User phone_number saved accurately', u[0]?.phone_number === testPhone);
    }

    // 5. Two-Factor Authentication (TOTP RFC 6238) Setup & Validation
    console.log('\n5. Two-Factor Authentication (RFC 6238 TOTP)');
    const tfaSetup = await TrustService.setupTwoFactor(testUserId, testAdmin.email);
    assert('setupTwoFactor returned base32 secret', Boolean(tfaSetup.secret && tfaSetup.secret.length >= 16));
    assert('setupTwoFactor generated 8 recovery codes', tfaSetup.recoveryCodes.length === 8);
    assert('setupTwoFactor generated otpauthUrl', tfaSetup.otpauthUrl.startsWith('otpauth://totp/'));

    // Compute expected TOTP code directly
    // Helper to generate current TOTP code
    const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    function base32Decode(str: string): Buffer {
      let bits = 0;
      let value = 0;
      let index = 0;
      const clean = str.replace(/=+$/, '').toUpperCase();
      const output = Buffer.alloc(Math.floor((clean.length * 5) / 8));
      for (let i = 0; i < clean.length; i++) {
        const val = base32Alphabet.indexOf(clean[i]);
        if (val === -1) continue;
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
          output[index++] = (value >>> (bits - 8)) & 255;
          bits -= 8;
        }
      }
      return output;
    }
    const epochStep = Math.floor(Date.now() / 1000 / 30);
    const timeBuf = Buffer.alloc(8);
    timeBuf.writeBigInt64BE(BigInt(epochStep));
    const keyBuf = base32Decode(tfaSetup.secret);
    const hmac = crypto.createHmac('sha1', keyBuf).update(timeBuf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const totpCode = (binary % 1000000).toString().padStart(6, '0');

    // Test Enable 2FA
    await TrustService.enableTwoFactor(testUserId, totpCode);
    const [u2fa] = await pool.query<RowDataPacket[]>(
      `SELECT two_factor_enabled FROM users WHERE id = ?`,
      [testUserId]
    );
    assert('2FA enabled in database', Boolean(u2fa[0]?.two_factor_enabled) === true);

    // Test Disable 2FA using code
    await TrustService.disableTwoFactor(testUserId, totpCode);
    const [u2faDisabled] = await pool.query<RowDataPacket[]>(
      `SELECT two_factor_enabled FROM users WHERE id = ?`,
      [testUserId]
    );
    assert('2FA successfully disabled with code', Boolean(u2faDisabled[0]?.two_factor_enabled) === false);

    // 6. Abuse Risk Service & Account Restrictions Assertion
    console.log('\n6. Abuse Risk Service & Restriction Enforcement');
    // Before restriction: assertCanSendMessage should pass
    let passedInitial = false;
    try {
      await AbuseRiskService.assertCanSendMessage(testUserId);
      passedInitial = true;
    } catch {}
    assert('AbuseRiskService allows messaging when unrestricted', passedInitial);

    // Issue restriction
    const rstId = await TrustService.issueRestriction(
      testUserId,
      testUserId,
      'MESSAGE_RESTRICTED',
      'Test violation for Day 25 automated testing',
      2
    );
    assert('Restriction issued with ID', rstId > 0);

    // After restriction: assertCanSendMessage should fail with 403
    let restrictionBlocked = false;
    try {
      await AbuseRiskService.assertCanSendMessage(testUserId);
    } catch (err: any) {
      if (err.statusCode === 403 || err.message?.includes('restricted')) {
        restrictionBlocked = true;
      }
    }
    assert('AbuseRiskService intercepts and rejects messaging during active restriction', restrictionBlocked);

    // Revoke restriction
    await TrustService.revokeRestriction(testUserId, rstId);
    let passedAfterRevocation = false;
    try {
      await AbuseRiskService.assertCanSendMessage(testUserId);
      passedAfterRevocation = true;
    } catch {}
    assert('Messaging privileges restored immediately after restriction revocation', passedAfterRevocation);

    // 7. Security Audit Events
    console.log('\n7. Security Audit Logging');
    await TrustModel.logSecurityEvent(testUserId, 'LOGIN_SUCCESS', '127.0.0.1', 'Day25TestRunner', {
      test: true,
    });
    const events = await TrustModel.getUserSecurityEvents(testUserId, 10);
    assert('Security event recorded and retrievable', events.length > 0);
    assert('Event has correct type LOGIN_SUCCESS', events[0].eventType === 'LOGIN_SUCCESS');

    // 8. Admin Trust & Safety Telemetry Overview
    console.log('\n8. Admin Trust & Safety Overview');
    const adminOverview = await TrustService.getAdminTrustOverview();
    assert('Admin overview metrics object returned', adminOverview.metrics !== null && typeof adminOverview.metrics === 'object');
    assert('Admin overview verifiedUsers metric exists', typeof adminOverview.metrics.verifiedUsers === 'number');
    assert('Admin overview activeRestrictions array returned', Array.isArray(adminOverview.activeRestrictions));

    console.log('\n===============================================================');
    console.log(`DAY 25 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Day 25 Trust & Safety test execution encountered error:', err);
    process.exit(1);
  }
}

runTests();
