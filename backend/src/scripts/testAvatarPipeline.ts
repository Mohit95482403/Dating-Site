import { pool } from '../config/database';
import { UserModel } from '../models/user.model';
import { ProfileModel } from '../models/profile.model';
import { PhotoModel } from '../models/photo.model';

async function runAvatarPipelineTest() {
  console.log('--- START AVATAR PIPELINE LIVE VERIFICATION ---');

  // 1. Check a recent user who has photos in the DB
  const [rows]: any = await pool.execute(`
    SELECT u.id, u.email, p.first_name, ph.file_url, ph.is_primary
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    JOIN photos ph ON ph.user_id = u.id
    WHERE ph.is_primary = TRUE
    LIMIT 5
  `);

  console.log(`Found ${rows.length} users with primary photos:`);
  for (const r of rows) {
    console.log(`  User #${r.id} (${r.email}): name=${r.first_name}, primary_photo=${r.file_url}`);
    
    // Check findUserWithProfile
    const userWithProfile = await UserModel.findUserWithProfile(r.id);
    console.log(`    UserModel.findUserWithProfile -> avatarUrl:`, userWithProfile?.avatarUrl);

    // Check findAccountInfo
    const accountInfo = await UserModel.findAccountInfo(r.id);
    console.log(`    UserModel.findAccountInfo -> avatarUrl:`, (accountInfo as any)?.avatarUrl);

    // Check Public Profile
    const publicProfile = await ProfileModel.getPublicProfile(r.id, 999999);
    console.log(`    ProfileModel.getPublicProfile -> avatarUrl:`, publicProfile?.avatarUrl, `primaryPhoto:`, publicProfile?.primaryPhoto?.fileUrl);
  }

  // 2. Test registration simulation
  const testEmail = `avatartest_${Date.now()}@connectly.test`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [uRes]: any = await conn.execute(
      'INSERT INTO users (email, password_hash, role, status, is_email_verified) VALUES (?, ?, ?, ?, ?)',
      [testEmail, 'testhash', 'user', 'active', true]
    );
    const testUserId = uRes.insertId;

    await conn.execute(
      'INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, is_profile_complete) VALUES (?, ?, ?, ?, ?, ?)',
      [testUserId, 'AvatarTest', 'User', '1995-05-15', 'other', true]
    );

    // Insert a primary photo
    const photoPath = `/uploads/profiles/user-${testUserId}/avatar.jpg`;
    await conn.execute(
      'INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testUserId, photoPath, 'avatar.jpg', 'image/jpeg', 12345, 0, true]
    );
    await conn.commit();

    console.log(`\nCreated temporary test user #${testUserId} with photo: ${photoPath}`);

    // Verify UserModel.findUserWithProfile
    const testUserAuth = await UserModel.findUserWithProfile(testUserId);
    console.log(`  Test user /api/auth/me avatarUrl:`, testUserAuth?.avatarUrl);
    if (testUserAuth?.avatarUrl !== photoPath) {
      throw new Error(`Expected avatarUrl to be ${photoPath}, got ${testUserAuth?.avatarUrl}`);
    }

    // Verify PublicProfile for User B viewing User A
    const testPublicProfile = await ProfileModel.getPublicProfile(testUserId, 1);
    console.log(`  Test user public profile avatarUrl:`, testPublicProfile?.avatarUrl);
    if (testPublicProfile?.avatarUrl !== photoPath) {
      throw new Error(`Expected publicProfile avatarUrl to be ${photoPath}, got ${testPublicProfile?.avatarUrl}`);
    }

    // Clean up test user
    await pool.execute('DELETE FROM photos WHERE user_id = ?', [testUserId]);
    await pool.execute('DELETE FROM profiles WHERE user_id = ?', [testUserId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [testUserId]);
    console.log(`Cleaned up test user #${testUserId}`);
  } finally {
    conn.release();
  }

  console.log('\n--- ALL DB & MODEL AVATAR PIPELINE TESTS PASSED SUCCESSFULLY ---');
  process.exit(0);
}

runAvatarPipelineTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
