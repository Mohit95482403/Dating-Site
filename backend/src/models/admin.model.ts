import { query, execute, pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  AdminDashboardStats,
  AdminDateRange,
  AdminUserListItem,
  AdminUserDetail,
  AdminReportListItem,
  AdminVerificationListItem,
  AdminAuditLogItem,
} from '../types/admin.types';

export class AdminModel {
  /**
   * Fetch real aggregate database statistics and chart trend data
   */
  public static async getDashboardStats(range: AdminDateRange = '30d'): Promise<AdminDashboardStats> {
    // Determine days back for trend calculations
    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;
    else if (range === 'all') days = 365;

    // Parallel aggregate queries for max throughput
    const [
      [[userCounts]],
      [[matchCounts]],
      [[messageCounts]],
      [[reportCounts]],
      [[verifCounts]],
      [[verifiedUserCounts]],
      [[newUserCounts]],
      [userDaily],
      [matchDaily],
      [messageDaily],
      [reportDaily],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT 
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeUsers,
          SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspendedUsers,
          SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) AS bannedUsers
        FROM users
        WHERE status != 'deleted'
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS totalMatches FROM matches WHERE status = 'active'
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS totalMessages FROM messages
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS pendingReports FROM reports WHERE status IN ('pending', 'under_review', 'reviewing')
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS pendingVerifications FROM verification_requests WHERE status = 'pending'
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS verifiedUsers FROM profiles WHERE is_verified = TRUE
      `),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS newUsers 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]),
      pool.query<RowDataPacket[]>(`
        SELECT DATE(created_at) AS date_val, COUNT(*) AS count_val
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date_val ASC
      `, [days]),
      pool.query<RowDataPacket[]>(`
        SELECT DATE(matched_at) AS date_val, COUNT(*) AS count_val
        FROM matches
        WHERE matched_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(matched_at)
        ORDER BY date_val ASC
      `, [days]),
      pool.query<RowDataPacket[]>(`
        SELECT DATE(created_at) AS date_val, COUNT(*) AS count_val
        FROM messages
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date_val ASC
      `, [days]),
      pool.query<RowDataPacket[]>(`
        SELECT DATE(created_at) AS date_val, COUNT(*) AS count_val
        FROM reports
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date_val ASC
      `, [days]),
    ]);

    // 2. Trend chart data: date-grouped by day
    // Generate dates array for the past N days
    const labels: string[] = [];
    const userGrowth: number[] = [];
    const matchGrowth: number[] = [];
    const messageGrowth: number[] = [];
    const reportGrowth: number[] = [];

    const userMap = new Map<string, number>();
    for (const r of userDaily) userMap.set(new Date(r.date_val).toISOString().split('T')[0], Number(r.count_val));

    const matchMap = new Map<string, number>();
    for (const r of matchDaily) matchMap.set(new Date(r.date_val).toISOString().split('T')[0], Number(r.count_val));

    const msgMap = new Map<string, number>();
    for (const r of messageDaily) msgMap.set(new Date(r.date_val).toISOString().split('T')[0], Number(r.count_val));

    const repMap = new Map<string, number>();
    for (const r of reportDaily) repMap.set(new Date(r.date_val).toISOString().split('T')[0], Number(r.count_val));

    // Fill points chronologically
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      labels.push(monthDay);
      userGrowth.push(userMap.get(dateKey) || 0);
      matchGrowth.push(matchMap.get(dateKey) || 0);
      messageGrowth.push(msgMap.get(dateKey) || 0);
      reportGrowth.push(repMap.get(dateKey) || 0);
    }

    // 3. Real recent activity feed
    const [recentUsers] = await pool.query<RowDataPacket[]>(`
      SELECT u.id, u.email, p.first_name, u.created_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT 4
    `);

    const [recentReports] = await pool.query<RowDataPacket[]>(`
      SELECT r.id, r.reason, r.status, r.created_at, p.first_name AS reporter_name
      FROM reports r
      LEFT JOIN profiles p ON r.reporter_id = p.user_id
      ORDER BY r.created_at DESC
      LIMIT 3
    `);

    const [recentVerifs] = await pool.query<RowDataPacket[]>(`
      SELECT v.id, v.status, v.created_at, p.first_name
      FROM verification_requests v
      LEFT JOIN profiles p ON v.user_id = p.user_id
      ORDER BY v.created_at DESC
      LIMIT 3
    `);

    const [recentMods] = await pool.query<RowDataPacket[]>(`
      SELECT m.id, m.action, m.reason, m.created_at, p.first_name AS admin_name
      FROM moderation_actions m
      LEFT JOIN profiles p ON m.admin_id = p.user_id
      ORDER BY m.created_at DESC
      LIMIT 4
    `);

    const activities: AdminDashboardStats['recentActivity'] = [];

    for (const u of recentUsers) {
      activities.push({
        id: u.id,
        type: 'user_registered',
        title: 'New User Registered',
        description: `${u.first_name || 'User'} (${u.email}) joined Connectly`,
        timestamp: new Date(u.created_at).toISOString(),
      });
    }

    for (const r of recentReports) {
      activities.push({
        id: r.id,
        type: 'report_submitted',
        title: 'User Report Submitted',
        description: `${r.reporter_name || 'Member'} filed a report: ${r.reason} (${r.status})`,
        timestamp: new Date(r.created_at).toISOString(),
      });
    }

    for (const v of recentVerifs) {
      activities.push({
        id: v.id,
        type: 'verification_submitted',
        title: 'Verification Request',
        description: `${v.first_name || 'User'} submitted identity documents (${v.status})`,
        timestamp: new Date(v.created_at).toISOString(),
      });
    }

    for (const m of recentMods) {
      activities.push({
        id: m.id,
        type: 'user_moderated',
        title: `Moderation: ${m.action}`,
        description: `Action taken by ${m.admin_name || 'Admin'}: ${m.reason}`,
        timestamp: new Date(m.created_at).toISOString(),
      });
    }

    // Sort combined activities by timestamp descending and take top 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const topActivities = activities.slice(0, 10);

    return {
      totalUsers: Number(userCounts?.totalUsers || 0),
      activeUsers: Number(userCounts?.activeUsers || 0),
      suspendedUsers: Number(userCounts?.suspendedUsers || 0),
      bannedUsers: Number(userCounts?.bannedUsers || 0),
      newUsers: Number(newUserCounts?.newUsers || 0),
      totalMatches: Number(matchCounts?.totalMatches || 0),
      totalMessages: Number(messageCounts?.totalMessages || 0),
      pendingReports: Number(reportCounts?.pendingReports || 0),
      pendingVerifications: Number(verifCounts?.pendingVerifications || 0),
      verifiedUsers: Number(verifiedUserCounts?.verifiedUsers || 0),
      dateRange: range,
      charts: {
        labels,
        userGrowth,
        matchGrowth,
        messageGrowth,
        reportGrowth,
      },
      recentActivity: topActivities,
    };
  }

  /**
   * Search and filter users with server-side pagination
   */
  public static async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    verification?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ users: AdminUserListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ["u.status != 'deleted'"];
    const queryParams: any[] = [];

    // Search filter
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      const searchId = Number(params.search.trim());
      if (!isNaN(searchId) && searchId > 0) {
        whereClauses.push('(u.id = ? OR u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
        queryParams.push(searchId, term, term, term);
      } else {
        whereClauses.push('(u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
        queryParams.push(term, term, term);
      }
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      whereClauses.push('u.status = ?');
      queryParams.push(params.status);
    }

    // Verification filter
    if (params.verification === 'verified') {
      whereClauses.push('p.is_verified = TRUE');
    } else if (params.verification === 'unverified') {
      whereClauses.push('(p.is_verified IS NULL OR p.is_verified = FALSE)');
    } else if (params.verification === 'pending') {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM verification_requests vr WHERE vr.user_id = u.id AND vr.status = 'pending'
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching
    const countSql = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    // Sorting
    let sortColumn = 'u.created_at';
    if (params.sortBy === 'id') sortColumn = 'u.id';
    else if (params.sortBy === 'last_login_at') sortColumn = 'u.last_login_at';
    else if (params.sortBy === 'status') sortColumn = 'u.status';

    const order = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Query paginated users
    const usersSql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.status,
        u.is_email_verified,
        u.created_at,
        u.last_login_at,
        u.last_seen_at,
        p.first_name,
        p.last_name,
        p.gender,
        p.location_city,
        p.location_country,
        p.is_verified,
        (
          SELECT ph.file_url 
          FROM photos ph 
          WHERE ph.user_id = u.id 
          ORDER BY ph.is_primary DESC, ph.display_order ASC 
          LIMIT 1
        ) AS avatar_url,
        (
          SELECT COUNT(*) 
          FROM reports rep 
          WHERE rep.reported_user_id = u.id
        ) AS reports_received_count
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    const userRows = await query<RowDataPacket[]>(usersSql, [...queryParams, limit, offset]);

    const users: AdminUserListItem[] = userRows.map((r) => ({
      id: Number(r.id),
      email: r.email,
      role: r.role,
      status: r.status,
      isEmailVerified: Boolean(r.is_email_verified),
      isVerified: Boolean(r.is_verified),
      firstName: r.first_name || null,
      lastName: r.last_name || null,
      avatarUrl: r.avatar_url || null,
      gender: r.gender || null,
      locationCity: r.location_city || null,
      locationCountry: r.location_country || null,
      createdAt: new Date(r.created_at).toISOString(),
      lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
      lastSeenAt: r.last_seen_at ? new Date(r.last_seen_at).toISOString() : null,
      reportsReceivedCount: Number(r.reports_received_count || 0),
    }));

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get detailed profile, safety, activity, and moderation info for an individual user
   */
  public static async getUserDetail(userId: number): Promise<AdminUserDetail | null> {
    // 1. Account & profile details
    const userRows = await query<RowDataPacket[]>(`
      SELECT 
        u.id, u.email, u.role, u.status, u.is_email_verified, u.created_at, u.last_login_at, u.last_seen_at,
        p.first_name, p.last_name, p.date_of_birth, p.gender, p.bio, p.occupation, p.education,
        p.location_city, p.location_state, p.location_country, p.is_profile_complete, p.is_verified
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);

    if (!userRows[0]) return null;
    const u = userRows[0];

    // 2. Photos
    const photos = await query<RowDataPacket[]>(`
      SELECT id, file_url, is_primary, display_order
      FROM photos
      WHERE user_id = ?
      ORDER BY is_primary DESC, display_order ASC
    `, [userId]);

    // 3. Interests
    const interests = await query<RowDataPacket[]>(`
      SELECT i.id, i.name, i.slug
      FROM user_interests ui
      JOIN interests i ON ui.interest_id = i.id
      WHERE ui.user_id = ?
    `, [userId]);

    // 4. Prompts
    const prompts = await query<RowDataPacket[]>(`
      SELECT upp.id, pp.prompt_text, upp.answer AS answer_text, pp.category
      FROM user_profile_prompts upp
      JOIN profile_prompts pp ON upp.prompt_id = pp.id
      WHERE upp.user_id = ?
    `, [userId]);

    // 5. Safety counts
    const [[reportCounts]] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM reports WHERE reported_user_id = ?) AS reportsReceived,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = ?) AS reportsSubmitted,
        (SELECT COUNT(*) FROM blocks WHERE blocker_id = ? OR blocked_user_id = ?) AS blocksCount
    `, [userId, userId, userId, userId]);

    // Recent reports received
    const recentReports = await query<RowDataPacket[]>(`
      SELECT r.id, r.reporter_id, p.first_name AS reporter_name, r.reason, r.status, r.created_at
      FROM reports r
      LEFT JOIN profiles p ON r.reporter_id = p.user_id
      WHERE r.reported_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [userId]);

    // Verification request
    const verifRows = await query<RowDataPacket[]>(`
      SELECT status, document_url, selfie_url
      FROM verification_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    let verifStatus: 'not_verified' | 'pending' | 'verified' | 'rejected' = 'not_verified';
    if (u.is_verified) {
      verifStatus = 'verified';
    } else if (verifRows[0]) {
      const s = String(verifRows[0].status).toLowerCase();
      if (s === 'pending') verifStatus = 'pending';
      else if (s === 'approved') verifStatus = 'verified';
      else if (s === 'rejected') verifStatus = 'rejected';
    }

    // 6. Activity counts
    const [[activityCounts]] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM matches WHERE (user_one_id = ? OR user_two_id = ?) AND status = 'active') AS matchesCount,
        (SELECT COUNT(*) FROM messages WHERE sender_id = ?) AS messagesSentCount
    `, [userId, userId, userId]);

    // 7. Moderation history
    const modRows = await query<RowDataPacket[]>(`
      SELECT m.id, m.admin_id, p.first_name AS admin_name, m.action, m.reason, m.created_at
      FROM moderation_actions m
      LEFT JOIN profiles p ON m.admin_id = p.user_id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `, [userId]);

    // Calculate completion percentage
    let completedFields = 0;
    if (u.first_name) completedFields++;
    if (u.date_of_birth) completedFields++;
    if (u.gender) completedFields++;
    if (u.bio) completedFields++;
    if (photos.length > 0) completedFields += 2;
    if (interests.length >= 3) completedFields++;
    if (prompts.length >= 1) completedFields++;
    const completionPercentage = Math.min(100, Math.round((completedFields / 8) * 100));

    return {
      account: {
        id: Number(u.id),
        email: u.email,
        role: u.role,
        status: u.status,
        isEmailVerified: Boolean(u.is_email_verified),
        createdAt: new Date(u.created_at).toISOString(),
        lastLoginAt: u.last_login_at ? new Date(u.last_login_at).toISOString() : null,
        lastSeenAt: u.last_seen_at ? new Date(u.last_seen_at).toISOString() : null,
      },
      profile: {
        firstName: u.first_name || null,
        lastName: u.last_name || null,
        dateOfBirth: u.date_of_birth ? new Date(u.date_of_birth).toISOString().split('T')[0] : null,
        gender: u.gender || null,
        bio: u.bio || null,
        occupation: u.occupation || null,
        education: u.education || null,
        locationCity: u.location_city || null,
        locationState: u.location_state || null,
        locationCountry: u.location_country || null,
        isProfileComplete: Boolean(u.is_profile_complete),
        isVerified: Boolean(u.is_verified),
        completionPercentage,
        photos: photos.map((p) => ({
          id: Number(p.id),
          fileUrl: p.file_url,
          isPrimary: Boolean(p.is_primary),
          displayOrder: Number(p.display_order),
        })),
        interests: interests.map((i) => ({
          id: Number(i.id),
          name: i.name,
          slug: i.slug,
        })),
        prompts: prompts.map((pr) => ({
          id: Number(pr.id),
          promptText: pr.prompt_text,
          answerText: pr.answer_text,
          category: pr.category,
        })),
      },
      safety: {
        reportsReceived: Number(reportCounts?.reportsReceived || 0),
        reportsSubmitted: Number(reportCounts?.reportsSubmitted || 0),
        blocksCount: Number(reportCounts?.blocksCount || 0),
        verificationStatus: verifStatus,
        verificationDocumentUrl: verifRows[0]?.document_url || verifRows[0]?.selfie_url || null,
        recentReports: recentReports.map((r) => ({
          id: Number(r.id),
          reporterId: Number(r.reporter_id),
          reporterName: r.reporter_name || 'Anonymous User',
          reason: r.reason,
          status: r.status,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      },
      activity: {
        matchesCount: Number(activityCounts?.matchesCount || 0),
        messagesSentCount: Number(activityCounts?.messagesSentCount || 0),
      },
      moderationHistory: modRows.map((m) => ({
        id: Number(m.id),
        adminId: Number(m.admin_id),
        adminName: m.admin_name || 'Admin',
        action: m.action,
        reason: m.reason,
        createdAt: new Date(m.created_at).toISOString(),
      })),
    };
  }

  /**
   * Suspend a user account with moderation tracking, optional duration, and session invalidation
   */
  public static async suspendUser(
    adminId: number,
    userId: number,
    reason: string,
    durationHours?: number | null
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let suspendedUntilSql: Date | null = null;
      if (durationHours && durationHours > 0) {
        suspendedUntilSql = new Date(Date.now() + durationHours * 60 * 60 * 1000);
      }

      // 1. Update user status and temporary suspension expiry
      await conn.execute(
        'UPDATE users SET status = "suspended", suspended_until = ?, suspension_reason = ? WHERE id = ?',
        [suspendedUntilSql, reason.trim(), userId]
      );

      // 2. Invalidate sessions
      await conn.execute('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ?', [userId]);

      // 3. Record moderation action
      const durationDesc = durationHours ? ` (for ${durationHours}h)` : ' (indefinite)';
      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason)
         VALUES (?, ?, 'SUSPEND', ?)`,
        [adminId, userId, `${reason}${durationDesc}`]
      );

      // 4. Record audit log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'USER_SUSPENDED', 'user', ?, ?)`,
        [adminId, userId, `Suspended account${durationDesc} for reason: ${reason}`]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Unsuspend a user account
   */
  public static async unsuspendUser(
    adminId: number,
    userId: number,
    reason: string = 'Account reinstated by administrator'
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE users SET status = "active", suspended_until = NULL, suspension_reason = NULL WHERE id = ?',
        [userId]
      );

      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason)
         VALUES (?, ?, 'UNSUSPEND', ?)`,
        [adminId, userId, reason]
      );

      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'USER_UNSUSPENDED', 'user', ?, ?)`,
        [adminId, userId, `Reinstated account: ${reason}`]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Permanently ban a user account with moderation tracking and session invalidation
   */
  public static async banUser(
    adminId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update user status
      await conn.execute("UPDATE users SET status = 'banned' WHERE id = ?", [userId]);

      // 2. Invalidate all sessions
      await conn.execute('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ?', [userId]);

      // 3. Record moderation action
      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason)
         VALUES (?, ?, 'BAN', ?)`,
        [adminId, userId, reason]
      );

      // 4. Record audit log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'USER_BANNED', 'user', ?, ?)`,
        [adminId, userId, `Banned user from platform: ${reason}`]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Unban a previously banned user
   */
  public static async unbanUser(
    adminId: number,
    userId: number,
    reason: string = 'Ban removed by administrator'
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute("UPDATE users SET status = 'active' WHERE id = ?", [userId]);

      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason)
         VALUES (?, ?, 'UNBAN', ?)`,
        [adminId, userId, reason]
      );

      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'USER_UNBANNED', 'user', ?, ?)`,
        [adminId, userId, `Removed ban for user: ${reason}`]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Reset / invalidate all sessions for a user
   */
  public static async resetSessions(adminId: number, userId: number, reason: string): Promise<void> {
    await execute('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ?', [userId]);
    await execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES (?, 'SESSIONS_RESET', 'user', ?, ?)`,
      [adminId, userId, `Invalidated active sessions: ${reason}`]
    );
  }

  /**
   * Update a user's platform authorization role with safety against last-admin lockout
   */
  public static async updateUserRole(adminId: number, userId: number, newRole: string): Promise<void> {
    if (!['user', 'moderator', 'admin'].includes(newRole)) {
      throw new Error("Invalid role specified. Allowed values: 'user', 'moderator', 'admin'.");
    }

    if (newRole !== 'admin') {
      const [userRows] = await pool.query<RowDataPacket[]>('SELECT role FROM users WHERE id = ?', [userId]);
      if (userRows[0]?.role === 'admin') {
        const [adminCountRows] = await pool.query<RowDataPacket[]>(
          "SELECT COUNT(*) AS totalAdmins FROM users WHERE role = 'admin' AND status = 'active'"
        );
        const totalAdmins = Number(adminCountRows[0]?.totalAdmins || 0);
        if (totalAdmins <= 1) {
          throw new Error('Administrative protection: Cannot revoke the last active administrator on the platform.');
        }
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);

      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'USER_ROLE_CHANGED', 'user', ?, ?)`,
        [adminId, userId, `Role changed to ${newRole.toUpperCase()}`]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Query reports with pagination and filtering
   */
  public static async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ reports: AdminReportListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.status && params.status !== 'all') {
      whereClauses.push('r.status = ?');
      queryParams.push(params.status);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      const searchId = Number(params.search.trim());
      if (!isNaN(searchId) && searchId > 0) {
        whereClauses.push('(r.id = ? OR r.reason LIKE ? OR rp.first_name LIKE ? OR target_p.first_name LIKE ?)');
        queryParams.push(searchId, term, term, term);
      } else {
        whereClauses.push('(r.reason LIKE ? OR rp.first_name LIKE ? OR target_p.first_name LIKE ?)');
        queryParams.push(term, term, term);
      }
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM reports r
      LEFT JOIN profiles rp ON r.reporter_id = rp.user_id
      LEFT JOIN profiles target_p ON r.reported_user_id = target_p.user_id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    const reportsSql = `
      SELECT 
        r.id,
        r.reporter_id,
        ru.email AS reporter_email,
        rp.first_name AS reporter_name,
        (
          SELECT ph.file_url FROM photos ph WHERE ph.user_id = r.reporter_id 
          ORDER BY ph.is_primary DESC, ph.display_order ASC LIMIT 1
        ) AS reporter_avatar,
        r.reported_user_id,
        target_u.email AS reported_email,
        target_u.status AS reported_status,
        target_p.first_name AS reported_name,
        target_p.is_verified AS reported_is_verified,
        (
          SELECT ph.file_url FROM photos ph WHERE ph.user_id = r.reported_user_id 
          ORDER BY ph.is_primary DESC, ph.display_order ASC LIMIT 1
        ) AS reported_avatar,
        r.reason,
        r.description,
        r.status,
        r.admin_notes,
        r.resolved_by,
        admin_p.first_name AS resolved_by_name,
        r.resolved_at,
        r.created_at
      FROM reports r
      JOIN users ru ON r.reporter_id = ru.id
      LEFT JOIN profiles rp ON r.reporter_id = rp.user_id
      JOIN users target_u ON r.reported_user_id = target_u.id
      LEFT JOIN profiles target_p ON r.reported_user_id = target_p.user_id
      LEFT JOIN users admin_u ON r.resolved_by = admin_u.id
      LEFT JOIN profiles admin_p ON r.resolved_by = admin_p.user_id
      ${whereSql}
      ORDER BY FIELD(r.status, 'pending', 'under_review', 'reviewing', 'resolved', 'dismissed'), r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query<RowDataPacket[]>(reportsSql, [...queryParams, limit, offset]);

    const reports: AdminReportListItem[] = rows.map((r) => ({
      id: Number(r.id),
      reporterId: Number(r.reporter_id),
      reporterEmail: r.reporter_email,
      reporterName: r.reporter_name || 'Reporter',
      reporterAvatar: r.reporter_avatar || null,
      reportedUserId: Number(r.reported_user_id),
      reportedEmail: r.reported_email,
      reportedName: r.reported_name || 'Reported User',
      reportedAvatar: r.reported_avatar || null,
      reportedStatus: r.reported_status,
      reportedIsVerified: Boolean(r.reported_is_verified),
      reason: r.reason,
      description: r.description || null,
      status: r.status,
      adminNotes: r.admin_notes || null,
      resolvedBy: r.resolved_by ? Number(r.resolved_by) : null,
      resolvedByName: r.resolved_by_name || null,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single report detail with comprehensive profile context
   */
  public static async getReportById(reportId: number): Promise<any | null> {
    const rows = await query<RowDataPacket[]>(`
      SELECT 
        r.id, r.reporter_id, ru.email AS reporter_email, rp.first_name AS reporter_name,
        r.reported_user_id, tu.email AS reported_email, tu.status AS reported_status,
        tp.first_name AS reported_name, tp.bio AS reported_bio, tp.is_verified AS reported_is_verified,
        r.reason, r.description, r.status, r.admin_notes, r.resolved_by, r.resolved_at, r.created_at,
        ap.first_name AS resolved_by_name
      FROM reports r
      JOIN users ru ON r.reporter_id = ru.id
      LEFT JOIN profiles rp ON r.reporter_id = rp.user_id
      JOIN users tu ON r.reported_user_id = tu.id
      LEFT JOIN profiles tp ON r.reported_user_id = tp.user_id
      LEFT JOIN users au ON r.resolved_by = au.id
      LEFT JOIN profiles ap ON r.resolved_by = ap.user_id
      WHERE r.id = ?
      LIMIT 1
    `, [reportId]);

    if (!rows[0]) return null;
    const r = rows[0];

    // Reported user photos
    const photos = await query<RowDataPacket[]>(`
      SELECT id, file_url, is_primary FROM photos WHERE user_id = ? ORDER BY is_primary DESC, display_order ASC
    `, [r.reported_user_id]);

    // Prior reports against this same user
    const priorReports = await query<RowDataPacket[]>(`
      SELECT r2.id, r2.reason, r2.status, r2.created_at
      FROM reports r2
      WHERE r2.reported_user_id = ? AND r2.id != ?
      ORDER BY r2.created_at DESC
      LIMIT 5
    `, [r.reported_user_id, reportId]);

    return {
      ...r,
      reportedPhotos: photos,
      priorReports: priorReports.map((pr) => ({
        id: Number(pr.id),
        reason: pr.reason,
        status: pr.status,
        createdAt: new Date(pr.created_at).toISOString(),
      })),
    };
  }

  /**
   * Update report status to under_review or pending
   */
  public static async updateReportStatus(
    reportId: number,
    status: 'pending' | 'under_review'
  ): Promise<void> {
    await execute('UPDATE reports SET status = ? WHERE id = ?', [status, reportId]);
  }

  /**
   * Resolve report with action (dismiss, warn, suspend, ban) in a single transaction
   */
  public static async resolveReport(params: {
    reportId: number;
    adminId: number;
    action: 'dismiss' | 'warn' | 'suspend' | 'ban';
    resolutionNotes: string;
    warningMessage?: string;
  }): Promise<{ reportedUserId: number; action: string }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Fetch report details
      const [reportRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, reported_user_id, reason FROM reports WHERE id = ? FOR UPDATE',
        [params.reportId]
      );
      if (!reportRows[0]) {
        throw new Error('Report not found');
      }

      const reportedUserId = Number(reportRows[0].reported_user_id);
      const reportReason = reportRows[0].reason;

      // 2. Determine report new status
      const newStatus = params.action === 'dismiss' ? 'dismissed' : 'resolved';

      // 3. Update report record
      await conn.execute(
        `UPDATE reports 
         SET status = ?, resolved_by = ?, resolved_at = NOW(), admin_notes = ?
         WHERE id = ?`,
        [newStatus, params.adminId, params.resolutionNotes, params.reportId]
      );

      // 4. Perform moderation action if required
      if (params.action === 'suspend') {
        await conn.execute("UPDATE users SET status = 'suspended' WHERE id = ?", [reportedUserId]);
        await conn.execute('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ?', [reportedUserId]);
        await conn.execute(
          `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
           VALUES (?, ?, 'SUSPEND', ?, ?)`,
          [params.adminId, reportedUserId, `Report #${params.reportId}: ${reportReason}`, JSON.stringify({ reportId: params.reportId })]
        );
      } else if (params.action === 'ban') {
        await conn.execute("UPDATE users SET status = 'banned' WHERE id = ?", [reportedUserId]);
        await conn.execute('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ?', [reportedUserId]);
        await conn.execute(
          `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
           VALUES (?, ?, 'BAN', ?, ?)`,
          [params.adminId, reportedUserId, `Report #${params.reportId}: ${reportReason}`, JSON.stringify({ reportId: params.reportId })]
        );
      } else if (params.action === 'warn') {
        const warnMsg = params.warningMessage || `Warning regarding content violation: ${reportReason}`;
        await conn.execute(
          `INSERT INTO notifications (user_id, actor_id, type, title, message)
           VALUES (?, ?, 'system_warning', 'Safety Warning from Connectly Moderation', ?)`,
          [reportedUserId, params.adminId, warnMsg]
        );
        await conn.execute(
          `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
           VALUES (?, ?, 'WARN', ?, ?)`,
          [params.adminId, reportedUserId, warnMsg, JSON.stringify({ reportId: params.reportId })]
        );
      } else if (params.action === 'dismiss') {
        await conn.execute(
          `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
           VALUES (?, ?, 'DISMISS_REPORT', ?, ?)`,
          [params.adminId, reportedUserId, `Report #${params.reportId} dismissed: ${params.resolutionNotes}`, JSON.stringify({ reportId: params.reportId })]
        );
      }

      // 5. Audit log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'REPORT_RESOLVED', 'report', ?, ?)`,
        [params.adminId, params.reportId, `Action: ${params.action.toUpperCase()}. Note: ${params.resolutionNotes}`]
      );

      await conn.commit();
      return { reportedUserId, action: params.action };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Query verification requests with pagination and filters
   */
  public static async getVerifications(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ verifications: AdminVerificationListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.status && params.status !== 'all') {
      whereClauses.push('vr.status = ?');
      queryParams.push(params.status);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      whereClauses.push('(u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
      queryParams.push(term, term, term);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM verification_requests vr
      JOIN users u ON vr.user_id = u.id
      LEFT JOIN profiles p ON vr.user_id = p.user_id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    const verifSql = `
      SELECT 
        vr.id,
        vr.user_id,
        u.email,
        p.first_name,
        p.last_name,
        (
          SELECT ph.file_url FROM photos ph WHERE ph.user_id = vr.user_id 
          ORDER BY ph.is_primary DESC, ph.display_order ASC LIMIT 1
        ) AS avatar_url,
        vr.document_url,
        vr.selfie_url,
        vr.status,
        vr.rejection_reason,
        vr.admin_notes,
        vr.reviewed_by,
        admin_p.first_name AS reviewed_by_name,
        vr.reviewed_at,
        vr.created_at
      FROM verification_requests vr
      JOIN users u ON vr.user_id = u.id
      LEFT JOIN profiles p ON vr.user_id = p.user_id
      LEFT JOIN users admin_u ON vr.reviewed_by = admin_u.id
      LEFT JOIN profiles admin_p ON vr.reviewed_by = admin_p.user_id
      ${whereSql}
      ORDER BY FIELD(vr.status, 'pending', 'rejected', 'approved'), vr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query<RowDataPacket[]>(verifSql, [...queryParams, limit, offset]);

    const verifications: AdminVerificationListItem[] = rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      email: r.email,
      firstName: r.first_name || 'User',
      lastName: r.last_name || null,
      avatarUrl: r.avatar_url || null,
      documentUrl: r.document_url || r.selfie_url,
      selfieUrl: r.selfie_url || r.document_url,
      status: r.status,
      rejectionReason: r.rejection_reason || null,
      adminNotes: r.admin_notes || null,
      reviewedBy: r.reviewed_by ? Number(r.reviewed_by) : null,
      reviewedByName: r.reviewed_by_name || null,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return {
      verifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single verification request detail with photos
   */
  public static async getVerificationById(verificationId: number): Promise<any | null> {
    const rows = await query<RowDataPacket[]>(`
      SELECT 
        vr.id, vr.user_id, u.email, p.first_name, p.last_name, p.gender, p.bio, p.is_verified,
        vr.document_url, vr.selfie_url, vr.status, vr.rejection_reason, vr.admin_notes,
        vr.reviewed_by, vr.reviewed_at, vr.created_at, ap.first_name AS reviewed_by_name
      FROM verification_requests vr
      JOIN users u ON vr.user_id = u.id
      LEFT JOIN profiles p ON vr.user_id = p.user_id
      LEFT JOIN users au ON vr.reviewed_by = au.id
      LEFT JOIN profiles ap ON vr.reviewed_by = ap.user_id
      WHERE vr.id = ?
      LIMIT 1
    `, [verificationId]);

    if (!rows[0]) return null;
    const v = rows[0];

    // User profile photos for visual comparison
    const photos = await query<RowDataPacket[]>(`
      SELECT id, file_url, is_primary FROM photos WHERE user_id = ? ORDER BY is_primary DESC, display_order ASC
    `, [v.user_id]);

    return {
      ...v,
      documentUrl: v.document_url || v.selfie_url,
      selfieUrl: v.selfie_url || v.document_url,
      profilePhotos: photos,
    };
  }

  /**
   * Approve verification request in a transactional block
   */
  public static async approveVerification(
    adminId: number,
    verificationId: number,
    adminNotes?: string
  ): Promise<{ userId: number }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Fetch verification request
      const [verRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, user_id, status FROM verification_requests WHERE id = ? FOR UPDATE',
        [verificationId]
      );
      if (!verRows[0]) throw new Error('Verification request not found');

      const userId = Number(verRows[0].user_id);

      // 2. Update verification record
      await conn.execute(
        `UPDATE verification_requests 
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), admin_notes = ?
         WHERE id = ?`,
        [adminId, adminNotes || 'Approved by administrator', verificationId]
      );

      // 3. Mark user profile verified
      await conn.execute('UPDATE profiles SET is_verified = TRUE WHERE user_id = ?', [userId]);

      // 4. Record moderation action
      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
         VALUES (?, ?, 'VERIFY', 'Identity documents verified', ?)`,
        [adminId, userId, JSON.stringify({ verificationId })]
      );

      // 5. Create user notification
      await conn.execute(
        `INSERT INTO notifications (user_id, actor_id, type, title, message)
         VALUES (?, ?, 'verification_update', 'Profile Verified!', 'Congratulations! Your profile identity has been verified.')`,
        [userId, adminId]
      );

      // 6. Record audit log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'VERIFICATION_APPROVED', 'verification_request', ?, 'Verified user identity badge')`,
        [adminId, verificationId]
      );

      await conn.commit();
      return { userId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Reject verification request with reason
   */
  public static async rejectVerification(
    adminId: number,
    verificationId: number,
    reason: string,
    adminNotes?: string
  ): Promise<{ userId: number }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [verRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, user_id FROM verification_requests WHERE id = ? FOR UPDATE',
        [verificationId]
      );
      if (!verRows[0]) throw new Error('Verification request not found');

      const userId = Number(verRows[0].user_id);

      // Update verification record
      await conn.execute(
        `UPDATE verification_requests 
         SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?, admin_notes = ?
         WHERE id = ?`,
        [adminId, reason, adminNotes || null, verificationId]
      );

      // Mark profile unverified
      await conn.execute('UPDATE profiles SET is_verified = FALSE WHERE user_id = ?', [userId]);

      // Record moderation action
      await conn.execute(
        `INSERT INTO moderation_actions (admin_id, user_id, action, reason, metadata)
         VALUES (?, ?, 'REJECT_VERIFICATION', ?, ?)`,
        [adminId, userId, reason, JSON.stringify({ verificationId })]
      );

      // Create notification
      await conn.execute(
        `INSERT INTO notifications (user_id, actor_id, type, title, message)
         VALUES (?, ?, 'verification_update', 'Verification Needs Attention', ?)`,
        [userId, adminId, `Your verification was not approved: ${reason}`]
      );

      // Record audit log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES (?, 'VERIFICATION_REJECTED', 'verification_request', ?, ?)`,
        [adminId, verificationId, `Reason: ${reason}`]
      );

      await conn.commit();
      return { userId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Broadcast system announcement to selected audience
   */
  public static async broadcastAnnouncement(
    adminId: number,
    title: string,
    message: string,
    audience: 'all' | 'active' | 'verified'
  ): Promise<{ recipientIds: number[]; count: number }> {
    let sql = "SELECT id FROM users WHERE status != 'deleted'";
    if (audience === 'active') {
      sql = "SELECT id FROM users WHERE status = 'active'";
    } else if (audience === 'verified') {
      sql = "SELECT u.id FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.status = 'active' AND p.is_verified = TRUE";
    }

    const rows = await query<RowDataPacket[]>(sql);
    const recipientIds: number[] = rows.map((r) => Number(r.id));

    if (recipientIds.length > 0) {
      // Chunk insertions for performance
      const chunkSize = 200;
      for (let i = 0; i < recipientIds.length; i += chunkSize) {
        const chunk = recipientIds.slice(i, i + chunkSize);
        const valuesSql: string[] = [];
        const params: any[] = [];

        for (const uid of chunk) {
          valuesSql.push('(?, ?, ?, ?, ?)');
          params.push(uid, adminId, 'system_announcement', title, message);
        }

        await execute(
          `INSERT INTO notifications (user_id, actor_id, type, title, message)
           VALUES ${valuesSql.join(', ')}`,
          params
        );
      }
    }

    // Log in audit log
    await execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES (?, 'BROADCAST_ANNOUNCEMENT', 'system', NULL, ?)`,
      [adminId, `Broadcast: "${title}" to ${recipientIds.length} users (${audience})`]
    );

    return { recipientIds, count: recipientIds.length };
  }

  /**
   * Query audit logs with pagination and filters
   */
  public static async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  }): Promise<{ logs: AdminAuditLogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.action && params.action !== 'all') {
      whereClauses.push('a.action = ?');
      queryParams.push(params.action);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      whereClauses.push('(a.description LIKE ? OR u.email LIKE ? OR p.first_name LIKE ?)');
      queryParams.push(term, term, term);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN profiles p ON a.user_id = p.user_id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    const logsSql = `
      SELECT 
        a.id,
        a.user_id,
        u.email AS user_email,
        p.first_name AS user_name,
        a.action,
        a.entity_type,
        a.entity_id,
        a.description,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN profiles p ON a.user_id = p.user_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query<RowDataPacket[]>(logsSql, [...queryParams, limit, offset]);

    const logs: AdminAuditLogItem[] = rows.map((r) => ({
      id: Number(r.id),
      userId: r.user_id ? Number(r.user_id) : null,
      userEmail: r.user_email || null,
      userName: r.user_name || null,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id ? Number(r.entity_id) : null,
      description: r.description || null,
      ipAddress: r.ip_address || null,
      userAgent: r.user_agent || null,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Analytics breakdown foundation
   */
  public static async getAnalyticsOverview(): Promise<any> {
    // Gender demographics
    const [genderRows] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(gender, 'unspecified') AS gender, COUNT(*) AS count
      FROM profiles
      GROUP BY gender
    `);

    // Verification ratio
    const [verifRatio] = await pool.query<RowDataPacket[]>(`
      SELECT 
        SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN is_verified = FALSE OR is_verified IS NULL THEN 1 ELSE 0 END) AS unverified
      FROM profiles
    `);

    // Report resolution breakdown
    const [reportBreakdown] = await pool.query<RowDataPacket[]>(`
      SELECT status, COUNT(*) AS count
      FROM reports
      GROUP BY status
    `);

    // Conversion: Matches to Conversations to Messages
    const [[convStats]] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM matches) AS totalMatches,
        (SELECT COUNT(*) FROM conversations) AS totalConversations,
        (SELECT COUNT(*) FROM messages) AS totalMessages
    `);

    return {
      demographics: genderRows,
      verificationStats: verifRatio[0] || { verified: 0, unverified: 0 },
      reportStats: reportBreakdown,
      engagement: convStats || { totalMatches: 0, totalConversations: 0, totalMessages: 0 },
    };
  }
}

export default AdminModel;
