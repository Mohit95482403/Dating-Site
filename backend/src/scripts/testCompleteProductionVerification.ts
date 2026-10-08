import { pool } from '../config/database';
import { UserModel } from '../models/user.model';
import { ProfileModel } from '../models/profile.model';
import { FeedModel } from '../models/feed.model';
import { MatchModel } from '../models/match.model';
import { ConversationModel } from '../models/conversation.model';
import { NotificationModel } from '../models/notification.model';
import { ExploreModel } from '../models/explore.model';
import { DiscoveryModel } from '../models/discovery.model';
import { CommunityModel } from '../models/community.model';
import { AdminModel } from '../models/admin.model';

// Simulated frontend media resolver (matching frontend/src/utils/media.ts)
const PROD_BACKEND_URL = 'https://connectly-backend-j7wp.onrender.com';

function resolveMediaUrlProd(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
      const pathPart = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
      const cleanOrigin = PROD_BACKEND_URL.replace(/\/+$/, '');
      const cleanPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
      return `${cleanOrigin}${cleanPath}`;
    }
    return trimmed;
  }
  const normalizedPath = trimmed.replace(/\\/g, '/');
  const cleanOrigin = PROD_BACKEND_URL.replace(/\/+$/, '');
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${cleanOrigin}${cleanPath}`;
}

async function runProductionQA() {
  console.log('========================================================================');
  console.log('   CONNECTLY COMPLETE PRODUCTION PROFILE IMAGE QA VERIFICATION SUITE   ');
  console.log('========================================================================\n');

  const ts = Date.now();
  const emailA = `verify_usera_${ts}@test.com`;
  const emailB = `verify_userb_${ts}@test.com`;

  let userAId = 0;
  let userBId = 0;
  let photoAUrl = '';
  let matchId = 0;
  let conversationId = 0;
  let postId = 0;
  let communityId = 0;

  const results: { name: string; passed: boolean; details: string }[] = [];

  function record(name: string, passed: boolean, details: string) {
    results.push({ name, passed, details });
    console.log(`${passed ? '✅' : '❌'} [${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
    if (!passed) {
      throw new Error(`QA check failed on: ${name} -> ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. REGISTER USERS IN DATABASE
    // -------------------------------------------------------------
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Create User A
      const [resA]: any = await conn.execute(
        'INSERT INTO users (email, password_hash, role, status, is_email_verified) VALUES (?, ?, ?, ?, ?)',
        [emailA, 'hashedpassword123', 'user', 'active', true]
      );
      userAId = resA.insertId;

      await conn.execute(
        'INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, bio, is_profile_complete) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userAId, 'Alice', 'QA', '1996-04-12', 'female', 'Testing production photo visibility', true]
      );

      // Create User B
      const [resB]: any = await conn.execute(
        'INSERT INTO users (email, password_hash, role, status, is_email_verified) VALUES (?, ?, ?, ?, ?)',
        [emailB, 'hashedpassword123', 'user', 'active', true]
      );
      userBId = resB.insertId;

      await conn.execute(
        'INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, bio, is_profile_complete) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userBId, 'Bob', 'Observer', '1995-09-22', 'male', 'Observing Alice across all features', true]
      );

      // Add Primary Photo for User A
      photoAUrl = `/uploads/profiles/user-${userAId}/user-${userAId}-${ts}-avatar.jpg`;
      await conn.execute(
        'INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userAId, photoAUrl, 'avatar.jpg', 'image/jpeg', 24500, 0, true]
      );

      await conn.commit();
    } finally {
      conn.release();
    }

    record('Database Registration & Photo Storage', Boolean(userAId && userBId), `Created User A (#${userAId}) with primary photo: ${photoAUrl} and User B (#${userBId})`);

    // -------------------------------------------------------------
    // 2. USER A SELF-VIEW (/api/auth/me)
    // -------------------------------------------------------------
    const userAAuth = await UserModel.findUserWithProfile(userAId);
    record('User A Self-View (Auth/Me)', userAAuth?.avatarUrl === photoAUrl, `UserModel.findUserWithProfile returned avatarUrl: ${userAAuth?.avatarUrl}`);

    const userAAccount = await UserModel.findAccountInfo(userAId);
    record('User A Account Info', (userAAccount as any)?.avatarUrl === photoAUrl, `UserModel.findAccountInfo returned avatarUrl: ${(userAAccount as any)?.avatarUrl}`);

    // -------------------------------------------------------------
    // 3. USER B VIEWS USER A PUBLIC PROFILE (/api/profile/:id)
    // -------------------------------------------------------------
    const userAPublicProfile = await ProfileModel.getPublicProfile(userAId, userBId);
    record('User B Viewing User A Profile', userAPublicProfile?.avatarUrl === photoAUrl, `ProfileModel.getPublicProfile returned avatarUrl: ${userAPublicProfile?.avatarUrl}`);

    // -------------------------------------------------------------
    // 4. USER B SEARCHES FOR USER A (/api/explore/search)
    // -------------------------------------------------------------
    const searchPeopleList = await ExploreModel.searchPeople(userBId, 'Alice', 10, 0);
    const foundUserAInSearch = searchPeopleList.find((u: any) => u.userId === userAId);
    record('Explore Search Results', Boolean(foundUserAInSearch && foundUserAInSearch.avatarUrl === photoAUrl), `Search returned User A with avatarUrl: ${foundUserAInSearch?.avatarUrl}`);

    // -------------------------------------------------------------
    // 5. USER A CREATES FEED POST -> USER B VIEWS FEED (/api/feed)
    // -------------------------------------------------------------
    postId = await FeedModel.createPost(
      userAId,
      'Hello Connectly world! My profile picture should be visible to everyone everywhere!',
      null,
      null,
      'public'
    );

    const feedResult = await FeedModel.getFeed(userBId, 1, 10, []);
    const postInFeed = feedResult.posts.find((p: any) => p.id === postId);
    record('Feed Post Author Photo/Avatar', Boolean(postInFeed && (postInFeed.photo_url === photoAUrl || postInFeed.avatarUrl === photoAUrl)), `Feed post author photo_url: ${postInFeed?.photo_url}`);

    // -------------------------------------------------------------
    // 6. USER A COMMENTS ON POST -> USER B VIEWS COMMENTS
    // -------------------------------------------------------------
    const commentId = await FeedModel.createComment(
      postId,
      userAId,
      'Commenting on my own post to check comment avatar visibility!'
    );
    const commentsList = await FeedModel.getComments(postId, userBId, 1, 10);
    const commentInList = commentsList.comments.find((c: any) => c.id === commentId);
    record('Post Comment Author Photo/Avatar', Boolean(commentInList && (commentInList.photo_url === photoAUrl || commentInList.avatarUrl === photoAUrl)), `Comment author photo_url: ${commentInList?.photo_url}`);

    // -------------------------------------------------------------
    // 7. DISCOVERY & CANDIDATE FEED (/api/discovery/feed)
    // (Tested BEFORE matching so Alice is eligible for Bob's discovery)
    // -------------------------------------------------------------
    const discoveryCandidates = await DiscoveryModel.findCandidateProfiles(userBId, { limit: 20 });
    const aInDiscovery = discoveryCandidates.profiles.find((c: any) => c.id === userAId || c.userId === userAId);
    record('Discovery Feed Candidate Avatar', Boolean(aInDiscovery && (aInDiscovery.avatarUrl === photoAUrl || aInDiscovery.photoUrl === photoAUrl)), `Discovery candidate avatar: ${aInDiscovery?.avatarUrl}`);

    // -------------------------------------------------------------
    // 8. MATCHING & LIKES (/api/matches, /api/likes)
    // -------------------------------------------------------------
    matchId = await MatchModel.createMatch(userAId, userBId);
    const bMatches = await MatchModel.findUserMatches(userBId);
    const aMatchWithB = bMatches.find((m: any) => m.user.id === userAId);
    record('Matches List Partner Avatar', Boolean(aMatchWithB && (aMatchWithB.user.avatarUrl === photoAUrl || aMatchWithB.user.primaryPhoto?.fileUrl === photoAUrl)), `Match list partner avatarUrl: ${aMatchWithB?.user?.avatarUrl}`);

    // -------------------------------------------------------------
    // 9. MESSAGES & CONVERSATION LIST (/api/messages)
    // -------------------------------------------------------------
    const conv = await ConversationModel.getOrCreateForMatch(matchId, userAId, userBId);
    conversationId = conv.id;

    const bConversations = await ConversationModel.findUserConversations(userBId);
    const aConv = bConversations.find((c: any) => c.otherUser.id === userAId);
    record('Conversations List Partner Avatar', Boolean(aConv && (aConv.otherUser.avatarUrl === photoAUrl || aConv.otherUser.primaryPhoto?.fileUrl === photoAUrl)), `Conversation item partner avatarUrl: ${aConv?.otherUser?.avatarUrl}`);

    // -------------------------------------------------------------
    // 10. NOTIFICATIONS (/api/notifications)
    // -------------------------------------------------------------
    await NotificationModel.createNotification({
      userId: userBId,
      actorId: userAId,
      type: 'new_match',
      title: 'New Match!',
      message: 'You have a new match with Alice!',
      referenceId: matchId,
      referenceType: 'match',
    });

    const bNotifications = await NotificationModel.findByUserId(userBId, { page: 1, limit: 10 });
    const matchNotification = bNotifications.notifications.find((n: any) => n.actorId === userAId);
    record('Notification Actor Avatar', Boolean(matchNotification && matchNotification.actor?.avatarUrl === photoAUrl), `Notification actor avatarUrl: ${matchNotification?.actor?.avatarUrl}`);

    // -------------------------------------------------------------
    // 11. COMMUNITIES (/api/communities)
    // -------------------------------------------------------------
    const [cRes]: any = await pool.execute(
      'INSERT INTO communities (name, slug, description, category_id, creator_id) VALUES (?, ?, ?, ?, ?)',
      [`QA Comm ${ts}`, `qa-comm-${ts}`, 'QA Community description', 1, userAId]
    );
    communityId = cRes.insertId;

    await pool.execute(
      'INSERT INTO community_members (community_id, user_id, role, status) VALUES (?, ?, ?, ?)',
      [communityId, userAId, 'owner', 'active']
    );

    const commMembers = await CommunityModel.getMembers(communityId);
    const commMemberItem = commMembers.members.find((m: any) => m.userId === userAId);
    record('Community Member Avatar', Boolean(commMemberItem && commMemberItem.user?.photoUrl === photoAUrl), `Community member photoUrl: ${commMemberItem?.user?.photoUrl}`);

    // -------------------------------------------------------------
    // 12. ADMIN USER MANAGEMENT (/api/admin/users)
    // -------------------------------------------------------------
    const adminUserList = await AdminModel.getUsers({ page: 1, limit: 100, search: 'Alice' });
    const aInAdmin = adminUserList.users.find((u: any) => u.id === userAId);
    record('Admin User Directory Avatar', Boolean(aInAdmin && aInAdmin.avatarUrl === photoAUrl), `Admin user item avatarUrl: ${aInAdmin?.avatarUrl}`);

    // -------------------------------------------------------------
    // 13. FRONTEND PRODUCTION URL RESOLVER
    // -------------------------------------------------------------
    const resolvedUrl = resolveMediaUrlProd(photoAUrl);
    const expectedResolved = `${PROD_BACKEND_URL}${photoAUrl}`;
    record('Frontend Media URL Resolver (Relative)', resolvedUrl === expectedResolved, `Input: ${photoAUrl} -> Output: ${resolvedUrl}`);

    const localhostInput = `http://localhost:5000${photoAUrl}`;
    const resolvedLocalhost = resolveMediaUrlProd(localhostInput);
    record('Frontend Media URL Resolver (Sanitize Localhost)', resolvedLocalhost === expectedResolved, `Input: ${localhostInput} -> Output: ${resolvedLocalhost}`);

    const externalUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';
    const resolvedExternal = resolveMediaUrlProd(externalUrl);
    record('Frontend Media URL Resolver (External URL)', resolvedExternal === externalUrl, `Input: ${externalUrl} -> Output: ${resolvedExternal}`);

    // -------------------------------------------------------------
    // 14. REFRESH & PERSISTENCE TEST
    // -------------------------------------------------------------
    // Query again simulating page refresh & re-login
    const refreshedUserA = await UserModel.findUserWithProfile(userAId);
    const refreshedUserAPublic = await ProfileModel.getPublicProfile(userAId, userBId);
    record('Profile Refresh & Session Persistence', refreshedUserA?.avatarUrl === photoAUrl && refreshedUserAPublic?.avatarUrl === photoAUrl, `Refreshed avatarUrl intact: ${refreshedUserA?.avatarUrl}`);

    console.log('\n========================================================================');
    console.log(`🎉 ALL ${results.length}/${results.length} PRODUCTION PROFILE IMAGE QA CHECKS PASSED PERFECTLY!`);
    console.log('========================================================================\n');
  } finally {
    // Clean up test data safely
    if (communityId) {
      await pool.execute('DELETE FROM community_posts WHERE community_id = ?', [communityId]).catch(() => {});
      await pool.execute('DELETE FROM communities WHERE id = ?', [communityId]).catch(() => {});
    }
    if (postId) {
      await pool.execute('DELETE FROM comments WHERE post_id = ?', [postId]).catch(() => {});
      await pool.execute('DELETE FROM posts WHERE id = ?', [postId]).catch(() => {});
    }
    if (conversationId) {
      await pool.execute('DELETE FROM messages WHERE conversation_id = ?', [conversationId]).catch(() => {});
      await pool.execute('DELETE FROM conversations WHERE id = ?', [conversationId]).catch(() => {});
    }
    if (matchId) {
      await pool.execute('DELETE FROM matches WHERE id = ?', [matchId]).catch(() => {});
    }
    if (userBId) {
      await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userBId]).catch(() => {});
      await pool.execute('DELETE FROM profiles WHERE user_id = ?', [userBId]).catch(() => {});
      await pool.execute('DELETE FROM users WHERE id = ?', [userBId]).catch(() => {});
    }
    if (userAId) {
      await pool.execute('DELETE FROM photos WHERE user_id = ?', [userAId]).catch(() => {});
      await pool.execute('DELETE FROM profiles WHERE user_id = ?', [userAId]).catch(() => {});
      await pool.execute('DELETE FROM users WHERE id = ?', [userAId]).catch(() => {});
    }
    console.log('Cleaned up all temporary QA test artifacts from MySQL.\n');
    process.exit(0);
  }
}

runProductionQA().catch((err) => {
  console.error('QA Test execution failed:', err);
  process.exit(1);
});
