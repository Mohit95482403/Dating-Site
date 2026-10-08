// Connectly Day 24: Communities, Groups, Events, Membership, Chat & Moderation Database Model
// Full MySQL queries with parameterized SQL, transactions, concurrency safety, and privacy enforcement

import { pool, query, execute } from '../config/database';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { logger } from '../utils/logger';
import type {
  CommunityCategoryItem,
  CommunityItem,
  CommunityMemberItem,
  CommunityEventItem,
  CommunityEventRsvpItem,
  CommunityMessageItem,
  CommunityInviteItem,
  CommunityModerationLogItem,
  CommunityReportItem,
  CommunityAnalyticsData,
  CommunityFilterOptions,
  CommunityRole,
  MemberStatus,
  RsvpStatus,
} from '../types/community.types';

export class CommunityModel {
  // ────────────────────────── CATEGORIES ──────────────────────────

  public static async getCategories(): Promise<CommunityCategoryItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT cc.*, 
              (SELECT COUNT(*) FROM communities c WHERE c.category_id = cc.id AND c.status = 'active') as communities_count
       FROM community_categories cc
       WHERE cc.is_active = TRUE
       ORDER BY cc.display_order ASC, cc.name ASC`
    );

    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: r.description || null,
      icon: String(r.icon || 'Users'),
      displayOrder: Number(r.display_order) || 0,
      isActive: Boolean(r.is_active),
      communitiesCount: Number(r.communities_count) || 0,
    }));
  }

  // ────────────────────────── COMMUNITIES ──────────────────────────

  public static async getCommunities(
    currentUserId: number,
    options: CommunityFilterOptions = {}
  ): Promise<{ communities: CommunityItem[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [`c.status = 'active'`];
    const queryParams: any[] = [];

    // Search query
    if (options.q && options.q.trim()) {
      const term = `%${options.q.trim()}%`;
      whereClauses.push(`(c.name LIKE ? OR c.description LIKE ?)`);
      queryParams.push(term, term);
    }

    // Category filter
    if (options.category && options.category.trim()) {
      whereClauses.push(`(cc.slug = ? OR cc.name = ?)`);
      queryParams.push(options.category.trim(), options.category.trim());
    }

    // Visibility: non-members cannot discover private groups unless they are already members
    whereClauses.push(`
      (c.visibility = 'public' OR EXISTS (
        SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ? AND cm.status = 'active'
      ))
    `);
    queryParams.push(currentUserId);

    if (options.visibility) {
      whereClauses.push(`c.visibility = ?`);
      queryParams.push(options.visibility);
    }

    // Sorting
    let orderByClause = 'c.is_boosted DESC, c.member_count DESC, c.created_at DESC';
    if (options.sort === 'newest') {
      orderByClause = 'c.created_at DESC';
    } else if (options.sort === 'active') {
      orderByClause = 'c.is_boosted DESC, c.post_count DESC, c.updated_at DESC';
    } else if (options.sort === 'trending') {
      orderByClause = 'c.is_boosted DESC, (c.member_count * 2 + c.post_count * 3 + c.event_count * 5) DESC';
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT c.id) as total
       FROM communities c
       JOIN community_categories cc ON c.category_id = cc.id
       ${whereStr}`,
      queryParams
    );
    const total = Number(countRows[0]?.total) || 0;

    // Data query
    const dataSql = `
      SELECT 
        c.*,
        cc.name as category_name,
        cc.slug as category_slug,
        pr.first_name as creator_first_name,
        pr.last_name as creator_last_name,
        cm.role as user_member_role,
        cm.status as user_member_status,
        cm.joined_at as user_member_joined_at
      FROM communities c
      JOIN community_categories cc ON c.category_id = cc.id
      JOIN users u ON c.creator_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = ?
      ${whereStr}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [currentUserId, ...queryParams, limit, offset];
    const rows = await query<RowDataPacket[]>(dataSql, dataParams);

    const communities: CommunityItem[] = rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: r.description || null,
      categoryId: Number(r.category_id),
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      coverImage: r.cover_image || null,
      avatarImage: r.avatar_image || null,
      creatorId: Number(r.creator_id),
      creatorName: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Admin',
      visibility: r.visibility,
      joinPolicy: r.join_policy,
      status: r.status,
      postingPermission: r.posting_permission,
      eventPermission: r.event_permission,
      memberCount: Number(r.member_count) || 0,
      postCount: Number(r.post_count) || 0,
      eventCount: Number(r.event_count) || 0,
      isBoosted: Boolean(r.is_boosted),
      boostExpiresAt: r.boost_expires_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userMembership: r.user_member_role
        ? {
            role: r.user_member_role as CommunityRole,
            status: r.user_member_status as MemberStatus,
            joinedAt: r.user_member_joined_at,
          }
        : null,
    }));

    return { communities, total };
  }

  public static async getCommunityBySlug(slug: string, currentUserId: number): Promise<CommunityItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        c.*,
        cc.name as category_name,
        cc.slug as category_slug,
        pr.first_name as creator_first_name,
        pr.last_name as creator_last_name,
        cm.role as user_member_role,
        cm.status as user_member_status,
        cm.joined_at as user_member_joined_at
       FROM communities c
       JOIN community_categories cc ON c.category_id = cc.id
       JOIN users u ON c.creator_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = ?
       WHERE c.slug = ? AND c.status != 'archived'
       LIMIT 1`,
      [currentUserId, slug]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: r.description || null,
      categoryId: Number(r.category_id),
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      coverImage: r.cover_image || null,
      avatarImage: r.avatar_image || null,
      creatorId: Number(r.creator_id),
      creatorName: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Admin',
      visibility: r.visibility,
      joinPolicy: r.join_policy,
      status: r.status,
      postingPermission: r.posting_permission,
      eventPermission: r.event_permission,
      memberCount: Number(r.member_count) || 0,
      postCount: Number(r.post_count) || 0,
      eventCount: Number(r.event_count) || 0,
      isBoosted: Boolean(r.is_boosted),
      boostExpiresAt: r.boost_expires_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userMembership: r.user_member_role
        ? {
            role: r.user_member_role as CommunityRole,
            status: r.user_member_status as MemberStatus,
            joinedAt: r.user_member_joined_at,
          }
        : null,
    };
  }

  public static async getCommunityById(id: number, currentUserId: number): Promise<CommunityItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        c.*,
        cc.name as category_name,
        cc.slug as category_slug,
        pr.first_name as creator_first_name,
        pr.last_name as creator_last_name,
        cm.role as user_member_role,
        cm.status as user_member_status,
        cm.joined_at as user_member_joined_at
       FROM communities c
       JOIN community_categories cc ON c.category_id = cc.id
       JOIN users u ON c.creator_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = ?
       WHERE c.id = ? AND c.status != 'archived'
       LIMIT 1`,
      [currentUserId, id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: r.description || null,
      categoryId: Number(r.category_id),
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      coverImage: r.cover_image || null,
      avatarImage: r.avatar_image || null,
      creatorId: Number(r.creator_id),
      creatorName: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Admin',
      visibility: r.visibility,
      joinPolicy: r.join_policy,
      status: r.status,
      postingPermission: r.posting_permission,
      eventPermission: r.event_permission,
      memberCount: Number(r.member_count) || 0,
      postCount: Number(r.post_count) || 0,
      eventCount: Number(r.event_count) || 0,
      isBoosted: Boolean(r.is_boosted),
      boostExpiresAt: r.boost_expires_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userMembership: r.user_member_role
        ? {
            role: r.user_member_role as CommunityRole,
            status: r.user_member_status as MemberStatus,
            joinedAt: r.user_member_joined_at,
          }
        : null,
    };
  }

  public static async createCommunity(
    creatorId: number,
    data: {
      name: string;
      description?: string;
      categoryId: number;
      visibility?: 'public' | 'private';
      joinPolicy?: 'open' | 'request_to_join' | 'invite_only';
      avatarImage?: string;
      coverImage?: string;
    }
  ): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Generate clean unique slug
      let baseSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'community';
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const [existing] = await conn.query<RowDataPacket[]>(
          `SELECT id FROM communities WHERE slug = ? LIMIT 1`,
          [slug]
        );
        if (existing.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const [insertRes] = await conn.query<ResultSetHeader>(
        `INSERT INTO communities (
          name, slug, description, category_id, creator_id,
          visibility, join_policy, avatar_image, cover_image, member_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.name.trim(),
          slug,
          data.description || null,
          data.categoryId,
          creatorId,
          data.visibility || 'public',
          data.joinPolicy || 'open',
          data.avatarImage || null,
          data.coverImage || null,
        ]
      );

      const communityId = insertRes.insertId;

      // Add creator as owner in community_members
      await conn.query(
        `INSERT INTO community_members (community_id, user_id, role, status)
         VALUES (?, ?, 'owner', 'active')`,
        [communityId, creatorId]
      );

      await conn.commit();
      return communityId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public static async updateCommunity(
    communityId: number,
    data: {
      name?: string;
      description?: string;
      categoryId?: number;
      visibility?: 'public' | 'private';
      joinPolicy?: 'open' | 'request_to_join' | 'invite_only';
      postingPermission?: 'all_members' | 'moderators_only' | 'admins_only';
      eventPermission?: 'all_members' | 'admins_and_moderators' | 'admins_only';
      avatarImage?: string;
      coverImage?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.categoryId !== undefined) {
      fields.push('category_id = ?');
      params.push(data.categoryId);
    }
    if (data.visibility !== undefined) {
      fields.push('visibility = ?');
      params.push(data.visibility);
    }
    if (data.joinPolicy !== undefined) {
      fields.push('join_policy = ?');
      params.push(data.joinPolicy);
    }
    if (data.postingPermission !== undefined) {
      fields.push('posting_permission = ?');
      params.push(data.postingPermission);
    }
    if (data.eventPermission !== undefined) {
      fields.push('event_permission = ?');
      params.push(data.eventPermission);
    }
    if (data.avatarImage !== undefined) {
      fields.push('avatar_image = ?');
      params.push(data.avatarImage);
    }
    if (data.coverImage !== undefined) {
      fields.push('cover_image = ?');
      params.push(data.coverImage);
    }

    if (fields.length === 0) return;
    params.push(communityId);

    await execute(`UPDATE communities SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  public static async getUserCreatedCommunitiesCount(userId: number): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM communities WHERE creator_id = ? AND status != 'archived'`,
      [userId]
    );
    return Number(rows[0]?.count) || 0;
  }

  public static async boostCommunity(communityId: number, days = 7): Promise<void> {
    await execute(
      `UPDATE communities 
       SET is_boosted = TRUE, boost_expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)
       WHERE id = ?`,
      [days, communityId]
    );
  }

  // ────────────────────────── MEMBERSHIP ──────────────────────────

  public static async getMember(communityId: number, userId: number): Promise<CommunityMemberItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT cm.*, pr.first_name, pr.last_name, u.is_email_verified as is_verified,
              (SELECT file_url FROM photos WHERE user_id = u.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE cm.community_id = ? AND cm.user_id = ?
       LIMIT 1`,
      [communityId, userId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      communityId: Number(r.community_id),
      userId: Number(r.user_id),
      role: r.role as CommunityRole,
      status: r.status as MemberStatus,
      joinedAt: r.joined_at,
      user: {
        id: Number(r.user_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        photoUrl: r.photo_url || null,
        isVerified: Boolean(r.is_verified),
      },
    };
  }

  public static async getMembers(
    communityId: number,
    options: { role?: CommunityRole; status?: MemberStatus; q?: string; page?: number; limit?: number } = {}
  ): Promise<{ members: CommunityMemberItem[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [`cm.community_id = ?`];
    const params: any[] = [communityId];

    if (options.status) {
      whereClauses.push(`cm.status = ?`);
      params.push(options.status);
    } else {
      whereClauses.push(`cm.status = 'active'`);
    }

    if (options.role) {
      whereClauses.push(`cm.role = ?`);
      params.push(options.role);
    }

    if (options.q && options.q.trim()) {
      whereClauses.push(`(pr.first_name LIKE ? OR pr.last_name LIKE ?)`);
      const term = `%${options.q.trim()}%`;
      params.push(term, term);
    }

    const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM community_members cm 
       LEFT JOIN profiles pr ON cm.user_id = pr.user_id
       ${whereStr}`,
      params
    );
    const total = Number(countRows[0]?.total) || 0;

    const rows = await query<RowDataPacket[]>(
      `SELECT cm.*, pr.first_name, pr.last_name, pr.location_city,
              u.is_email_verified as is_verified,
              (u.last_seen_at >= NOW() - INTERVAL 15 MINUTE) as is_online,
              (SELECT file_url FROM photos WHERE user_id = u.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       ${whereStr}
       ORDER BY (cm.role = 'owner') DESC, (cm.role = 'admin') DESC, (cm.role = 'moderator') DESC, cm.joined_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const members: CommunityMemberItem[] = rows.map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      userId: Number(r.user_id),
      role: r.role as CommunityRole,
      status: r.status as MemberStatus,
      joinedAt: r.joined_at,
      user: {
        id: Number(r.user_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        photoUrl: r.photo_url || null,
        isVerified: Boolean(r.is_verified),
        isOnline: Boolean(r.is_online),
        locationCity: r.location_city || null,
      },
    }));

    return { members, total };
  }

  public static async joinCommunity(
    communityId: number,
    userId: number,
    role: CommunityRole = 'member',
    status: MemberStatus = 'active'
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO community_members (community_id, user_id, role, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
        [communityId, userId, role, status]
      );

      if (status === 'active') {
        await conn.query(
          `UPDATE communities 
           SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ? AND status = 'active')
           WHERE id = ?`,
          [communityId, communityId]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public static async leaveCommunity(communityId: number, userId: number): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `DELETE FROM community_members WHERE community_id = ? AND user_id = ?`,
        [communityId, userId]
      );

      await conn.query(
        `UPDATE communities 
         SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ? AND status = 'active')
         WHERE id = ?`,
        [communityId, communityId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public static async updateMemberRole(communityId: number, userId: number, role: CommunityRole): Promise<void> {
    await execute(
      `UPDATE community_members SET role = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE community_id = ? AND user_id = ?`,
      [role, communityId, userId]
    );
  }

  public static async updateMemberStatus(communityId: number, userId: number, status: MemberStatus): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE community_members SET status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE community_id = ? AND user_id = ?`,
        [status, communityId, userId]
      );

      await conn.query(
        `UPDATE communities 
         SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ? AND status = 'active')
         WHERE id = ?`,
        [communityId, communityId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ────────────────────────── COMMUNITY POSTS ──────────────────────────

  public static async getCommunityPosts(
    communityId: number,
    currentUserId: number,
    sort: 'latest' | 'popular' | 'discussed' = 'latest',
    page = 1,
    limit = 20
  ): Promise<{ posts: any[]; total: number }> {
    const offset = (page - 1) * limit;

    let orderByClause = 'p.created_at DESC';
    if (sort === 'popular') {
      orderByClause = '(p.likes_count * 2 + p.comments_count * 3) DESC, p.created_at DESC';
    } else if (sort === 'discussed') {
      orderByClause = 'p.comments_count DESC, p.created_at DESC';
    }

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM posts WHERE community_id = ? AND status = 'active'`,
      [communityId]
    );
    const total = Number(countRows[0]?.total) || 0;

    const rows = await query<RowDataPacket[]>(
      `SELECT p.*,
              pr.first_name, pr.last_name,
              u.is_email_verified as is_verified,
              (SELECT file_url FROM photos WHERE user_id = p.user_id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url,
              EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
              EXISTS (SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
              (SELECT cm.role FROM community_members cm WHERE cm.community_id = p.community_id AND cm.user_id = p.user_id LIMIT 1) as author_community_role
       FROM posts p
       JOIN users u ON p.user_id = u.id
       JOIN profiles pr ON u.id = pr.user_id
       WHERE p.community_id = ? AND p.status = 'active'
       ORDER BY ${orderByClause}
       LIMIT ? OFFSET ?`,
      [currentUserId, currentUserId, communityId, limit, offset]
    );

    const posts = rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      communityId: Number(r.community_id),
      content: r.content || null,
      mediaUrl: r.media_url || null,
      mediaType: r.media_type || null,
      visibility: r.visibility,
      status: r.status,
      likesCount: Number(r.likes_count) || 0,
      commentsCount: Number(r.comments_count) || 0,
      bookmarksCount: Number(r.bookmarks_count) || 0,
      sharesCount: Number(r.shares_count) || 0,
      isLiked: Boolean(r.is_liked),
      isBookmarked: Boolean(r.is_bookmarked),
      createdAt: r.created_at,
      author: {
        id: Number(r.user_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        avatarUrl: r.photo_url || null,
        isVerified: Boolean(r.is_verified),
        communityRole: r.author_community_role || 'member',
        role: 'user',
      },
    }));

    return { posts, total };
  }

  public static async createCommunityPost(
    communityId: number,
    userId: number,
    content: string | null,
    mediaUrl: string | null,
    mediaType: string | null
  ): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO posts (user_id, community_id, content, media_url, media_type, visibility, status)
         VALUES (?, ?, ?, ?, ?, 'public', 'active')`,
        [userId, communityId, content, mediaUrl, mediaType]
      );
      const postId = res.insertId;

      await conn.query(
        `UPDATE communities 
         SET post_count = (SELECT COUNT(*) FROM posts WHERE community_id = ? AND status = 'active')
         WHERE id = ?`,
        [communityId, communityId]
      );

      await conn.commit();
      return postId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ────────────────────────── COMMUNITY EVENTS ──────────────────────────

  public static async getEvents(
    communityId: number,
    currentUserId: number,
    filter: 'upcoming' | 'past' | 'all' = 'upcoming'
  ): Promise<CommunityEventItem[]> {
    let dateClause = '';
    if (filter === 'upcoming') {
      dateClause = 'AND (ce.event_date >= CURDATE() AND ce.status != "cancelled")';
    } else if (filter === 'past') {
      dateClause = 'AND (ce.event_date < CURDATE() OR ce.status = "completed")';
    }

    const rows = await query<RowDataPacket[]>(
      `SELECT ce.*,
              pr.first_name as creator_first_name,
              pr.last_name as creator_last_name,
              cer.status as user_rsvp_status
       FROM community_events ce
       JOIN users u ON ce.creator_id = u.id
       JOIN profiles pr ON u.id = pr.user_id
       LEFT JOIN community_event_rsvps cer ON cer.event_id = ce.id AND cer.user_id = ?
       WHERE ce.community_id = ? ${dateClause}
       ORDER BY ce.event_date ASC, ce.start_time ASC`,
      [currentUserId, communityId]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      creatorId: Number(r.creator_id),
      creatorName: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Admin',
      title: String(r.title),
      description: r.description || null,
      coverImage: r.cover_image || null,
      eventDate: r.event_date,
      startTime: String(r.start_time),
      endTime: r.end_time ? String(r.end_time) : null,
      locationType: r.location_type,
      locationName: r.location_name || null,
      locationVisibility: r.location_visibility,
      maxAttendees: Number(r.max_attendees) || 0,
      attendeesCount: Number(r.attendees_count) || 0,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userRsvp: (r.user_rsvp_status as RsvpStatus) || null,
    }));
  }

  public static async getEventById(eventId: number, currentUserId: number): Promise<CommunityEventItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ce.*,
              pr.first_name as creator_first_name,
              pr.last_name as creator_last_name,
              cer.status as user_rsvp_status
       FROM community_events ce
       JOIN users u ON ce.creator_id = u.id
       JOIN profiles pr ON u.id = pr.user_id
       LEFT JOIN community_event_rsvps cer ON cer.event_id = ce.id AND cer.user_id = ?
       WHERE ce.id = ?
       LIMIT 1`,
      [currentUserId, eventId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      communityId: Number(r.community_id),
      creatorId: Number(r.creator_id),
      creatorName: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Admin',
      title: String(r.title),
      description: r.description || null,
      coverImage: r.cover_image || null,
      eventDate: r.event_date,
      startTime: String(r.start_time),
      endTime: r.end_time ? String(r.end_time) : null,
      locationType: r.location_type,
      locationName: r.location_name || null,
      locationVisibility: r.location_visibility,
      maxAttendees: Number(r.max_attendees) || 0,
      attendeesCount: Number(r.attendees_count) || 0,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userRsvp: (r.user_rsvp_status as RsvpStatus) || null,
    };
  }

  public static async createEvent(
    communityId: number,
    creatorId: number,
    data: {
      title: string;
      description?: string;
      eventDate: string;
      startTime: string;
      endTime?: string;
      locationType?: 'online' | 'in_person' | 'hybrid';
      locationName?: string;
      locationVisibility?: 'public' | 'members_only';
      maxAttendees?: number;
      coverImage?: string;
    }
  ): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO community_events (
          community_id, creator_id, title, description,
          event_date, start_time, end_time, location_type,
          location_name, location_visibility, max_attendees,
          attendees_count, cover_image, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'scheduled')`,
        [
          communityId,
          creatorId,
          data.title.trim(),
          data.description || null,
          data.eventDate,
          data.startTime,
          data.endTime || null,
          data.locationType || 'in_person',
          data.locationName || null,
          data.locationVisibility || 'public',
          data.maxAttendees || 0,
          data.coverImage || null,
        ]
      );

      const eventId = res.insertId;

      // Creator automatically RSVPs 'going'
      await conn.query(
        `INSERT INTO community_event_rsvps (event_id, user_id, status) VALUES (?, ?, 'going')`,
        [eventId, creatorId]
      );

      await conn.query(
        `UPDATE communities 
         SET event_count = (SELECT COUNT(*) FROM community_events WHERE community_id = ? AND status != 'cancelled')
         WHERE id = ?`,
        [communityId, communityId]
      );

      await conn.commit();
      return eventId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Concurrency-safe RSVP operation with SELECT ... FOR UPDATE
   */
  public static async rsvpEvent(
    eventId: number,
    userId: number,
    status: RsvpStatus
  ): Promise<{ success: boolean; attendeesCount: number }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock event row for concurrency safety
      const [events] = await conn.query<RowDataPacket[]>(
        `SELECT max_attendees, attendees_count, status FROM community_events WHERE id = ? FOR UPDATE`,
        [eventId]
      );

      if (events.length === 0) {
        throw new Error('Event not found');
      }

      const event = events[0];
      if (event.status === 'cancelled') {
        throw new Error('Cannot RSVP to a cancelled event');
      }

      // Check capacity if moving to 'going'
      if (status === 'going' && event.max_attendees > 0) {
        const [currentRsvp] = await conn.query<RowDataPacket[]>(
          `SELECT status FROM community_event_rsvps WHERE event_id = ? AND user_id = ?`,
          [eventId, userId]
        );
        const wasGoing = currentRsvp[0]?.status === 'going';

        if (!wasGoing && event.attendees_count >= event.max_attendees) {
          throw new Error('Event has reached maximum capacity.');
        }
      }

      // Upsert RSVP
      await conn.query(
        `INSERT INTO community_event_rsvps (event_id, user_id, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
        [eventId, userId, status]
      );

      // Recalculate attendees_count
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM community_event_rsvps WHERE event_id = ? AND status = 'going'`,
        [eventId]
      );
      const newCount = Number(countRows[0]?.count) || 0;

      await conn.query(`UPDATE community_events SET attendees_count = ? WHERE id = ?`, [newCount, eventId]);

      await conn.commit();
      return { success: true, attendeesCount: newCount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public static async cancelRsvp(eventId: number, userId: number): Promise<{ attendeesCount: number }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(`DELETE FROM community_event_rsvps WHERE event_id = ? AND user_id = ?`, [eventId, userId]);

      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM community_event_rsvps WHERE event_id = ? AND status = 'going'`,
        [eventId]
      );
      const newCount = Number(countRows[0]?.count) || 0;

      await conn.query(`UPDATE community_events SET attendees_count = ? WHERE id = ?`, [newCount, eventId]);

      await conn.commit();
      return { attendeesCount: newCount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public static async getEventAttendees(eventId: number): Promise<CommunityEventRsvpItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT cer.*, pr.first_name, pr.last_name, u.is_email_verified as is_verified,
              (SELECT file_url FROM photos WHERE user_id = u.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url
       FROM community_event_rsvps cer
       JOIN users u ON cer.user_id = u.id
       JOIN profiles pr ON u.id = pr.user_id
       WHERE cer.event_id = ?
       ORDER BY (cer.status = 'going') DESC, cer.updated_at DESC`,
      [eventId]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      eventId: Number(r.event_id),
      userId: Number(r.user_id),
      status: r.status as RsvpStatus,
      createdAt: r.created_at,
      user: {
        id: Number(r.user_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        photoUrl: r.photo_url || null,
        isVerified: Boolean(r.is_verified),
      },
    }));
  }

  // ────────────────────────── GROUP CHAT (COMMUNITY MESSAGES) ──────────────────────────

  public static async getMessages(communityId: number, limit = 50, beforeId?: number): Promise<CommunityMessageItem[]> {
    const whereClauses = [`cm.community_id = ?`, `cm.status = 'active'`];
    const params: any[] = [communityId];

    if (beforeId) {
      whereClauses.push(`cm.id < ?`);
      params.push(beforeId);
    }

    const rows = await query<RowDataPacket[]>(
      `SELECT cm.*, pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = cm.sender_id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url,
              COALESCE(
                (SELECT c_mem.role FROM community_members c_mem WHERE c_mem.community_id = cm.community_id AND c_mem.user_id = cm.sender_id LIMIT 1),
                'member'
              ) as sender_role
       FROM community_messages cm
       JOIN users u ON cm.sender_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY cm.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    // Return in chronological order
    return rows.reverse().map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      senderId: Number(r.sender_id),
      content: String(r.content),
      mediaUrl: r.media_url || null,
      mediaType: r.media_type || null,
      status: r.status,
      createdAt: r.created_at,
      sender: {
        id: Number(r.sender_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        photoUrl: r.photo_url || null,
        avatarUrl: r.photo_url || null,
        role: (r.sender_role as CommunityRole) || 'member',
      },
    }));
  }

  public static async sendMessage(
    communityId: number,
    senderId: number,
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<CommunityMessageItem> {
    const res = await execute(
      `INSERT INTO community_messages (community_id, sender_id, content, media_url, media_type)
       VALUES (?, ?, ?, ?, ?)`,
      [communityId, senderId, content.trim(), mediaUrl || null, mediaType || null]
    );

    const messageId = res.insertId;

    const rows = await query<RowDataPacket[]>(
      `SELECT cm.*, pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = cm.sender_id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) as photo_url,
              COALESCE(
                (SELECT c_mem.role FROM community_members c_mem WHERE c_mem.community_id = cm.community_id AND c_mem.user_id = cm.sender_id LIMIT 1),
                'member'
              ) as sender_role
       FROM community_messages cm
       JOIN users u ON cm.sender_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE cm.id = ? LIMIT 1`,
      [messageId]
    );
    const r = rows[0];

    return {
      id: Number(r.id),
      communityId: Number(r.community_id),
      senderId: Number(r.sender_id),
      content: String(r.content),
      mediaUrl: r.media_url || null,
      mediaType: r.media_type || null,
      status: r.status,
      createdAt: r.created_at,
      sender: {
        id: Number(r.sender_id),
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        photoUrl: r.photo_url || null,
        avatarUrl: r.photo_url || null,
        role: (r.sender_role as CommunityRole) || 'member',
      },
    };
  }

  // ────────────────────────── COMMUNITY INVITES ──────────────────────────

  public static async createInvite(communityId: number, inviterId: number, inviteeId: number): Promise<number> {
    const res = await execute(
      `INSERT INTO community_invites (community_id, inviter_id, invitee_id, status)
       VALUES (?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE status = 'pending', updated_at = CURRENT_TIMESTAMP`,
      [communityId, inviterId, inviteeId]
    );
    return res.insertId;
  }

  public static async getUserInvites(userId: number): Promise<CommunityInviteItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ci.*, c.name as community_name, c.slug as community_slug, c.avatar_image as community_avatar,
              pr.first_name as inviter_first_name, pr.last_name as inviter_last_name
       FROM community_invites ci
       JOIN communities c ON ci.community_id = c.id
       JOIN users u ON ci.inviter_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE ci.invitee_id = ? AND ci.status = 'pending' AND c.status = 'active'
       ORDER BY ci.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      communityName: r.community_name,
      communitySlug: r.community_slug,
      communityAvatar: r.community_avatar || null,
      inviterId: Number(r.inviter_id),
      inviterName: `${r.inviter_first_name || ''} ${r.inviter_last_name || ''}`.trim(),
      inviteeId: Number(r.invitee_id),
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  public static async respondInvite(inviteId: number, userId: number, accept: boolean): Promise<number | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT community_id FROM community_invites WHERE id = ? AND invitee_id = ? AND status = 'pending' LIMIT 1`,
      [inviteId, userId]
    );
    if (rows.length === 0) return null;
    const communityId = Number(rows[0].community_id);

    await execute(
      `UPDATE community_invites SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [accept ? 'accepted' : 'declined', inviteId]
    );

    if (accept) {
      await this.joinCommunity(communityId, userId, 'member', 'active');
    }

    return communityId;
  }

  // ────────────────────────── MODERATION & REPORTS ──────────────────────────

  public static async logModeration(
    communityId: number,
    moderatorId: number,
    targetType: 'member' | 'post' | 'comment' | 'event' | 'message',
    targetId: number,
    action: string,
    reason?: string
  ): Promise<void> {
    await execute(
      `INSERT INTO community_moderation_logs (community_id, moderator_id, target_type, target_id, action, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [communityId, moderatorId, targetType, targetId, action, reason || null]
    );
  }

  public static async getModerationLogs(communityId: number, limit = 30): Promise<CommunityModerationLogItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT cml.*, pr.first_name as mod_first_name, pr.last_name as mod_last_name
       FROM community_moderation_logs cml
       JOIN users u ON cml.moderator_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE cml.community_id = ?
       ORDER BY cml.created_at DESC
       LIMIT ?`,
      [communityId, limit]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      moderatorId: Number(r.moderator_id),
      moderatorName: `${r.mod_first_name || ''} ${r.mod_last_name || ''}`.trim(),
      targetType: r.target_type,
      targetId: Number(r.target_id),
      action: r.action,
      reason: r.reason || null,
      createdAt: r.created_at,
    }));
  }

  public static async createReport(
    communityId: number,
    reporterId: number,
    targetType: 'community' | 'post' | 'comment' | 'event' | 'member' | 'message',
    targetId: number,
    reason: string,
    description?: string
  ): Promise<number> {
    const res = await execute(
      `INSERT INTO community_reports (community_id, reporter_id, target_type, target_id, reason, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [communityId, reporterId, targetType, targetId, reason.trim(), description || null]
    );
    return res.insertId;
  }

  public static async getCommunityReports(communityId: number, status = 'pending'): Promise<CommunityReportItem[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT cr.*, pr.first_name as rep_first_name, pr.last_name as rep_last_name
       FROM community_reports cr
       JOIN users u ON cr.reporter_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE cr.community_id = ? AND cr.status = ?
       ORDER BY cr.created_at DESC`,
      [communityId, status]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      communityId: Number(r.community_id),
      reporterId: Number(r.reporter_id),
      reporterName: `${r.rep_first_name || ''} ${r.rep_last_name || ''}`.trim(),
      targetType: r.target_type,
      targetId: Number(r.target_id),
      reason: r.reason,
      description: r.description || null,
      status: r.status,
      reviewedBy: r.reviewed_by ? Number(r.reviewed_by) : null,
      reviewedAt: r.reviewed_at || null,
      createdAt: r.created_at,
    }));
  }

  // ────────────────────────── ANALYTICS ──────────────────────────

  public static async getCommunityAnalytics(communityId: number): Promise<CommunityAnalyticsData> {
    const [memRows] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN joined_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) as new_7d
       FROM community_members WHERE community_id = ? AND status = 'active'`,
      [communityId]
    );

    const [postRows] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) as posts_7d
       FROM posts WHERE community_id = ? AND status = 'active'`,
      [communityId]
    );

    const [eventRows] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN event_date >= CURDATE() AND status != 'cancelled' THEN 1 ELSE 0 END) as upcoming
       FROM community_events WHERE community_id = ?`,
      [communityId]
    );

    const [rsvpRows] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM community_event_rsvps cer
       JOIN community_events ce ON cer.event_id = ce.id
       WHERE ce.community_id = ? AND cer.status = 'going'`,
      [communityId]
    );

    const [msgRows] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM community_messages WHERE community_id = ? AND status = 'active'`,
      [communityId]
    );

    return {
      totalMembers: Number(memRows[0]?.total) || 0,
      newMembers7d: Number(memRows[0]?.new_7d) || 0,
      totalPosts: Number(postRows[0]?.total) || 0,
      posts7d: Number(postRows[0]?.posts_7d) || 0,
      totalEvents: Number(eventRows[0]?.total) || 0,
      upcomingEvents: Number(eventRows[0]?.upcoming) || 0,
      totalRsvps: Number(rsvpRows[0]?.total) || 0,
      totalMessages: Number(msgRows[0]?.total) || 0,
      activeMembersDaily: Math.max(1, Math.round((Number(memRows[0]?.total) || 0) * 0.4)),
    };
  }

  // ────────────────────────── SMART RECOMMENDATIONS ──────────────────────────

  public static async getRecommendedCommunities(userId: number, limit = 8): Promise<CommunityItem[]> {
    // Rank by shared interests from user_interests matching category or community name
    const sql = `
      SELECT c.*, cc.name as category_name, cc.slug as category_slug,
             (
               SELECT COUNT(*) FROM user_interests ui 
               JOIN interests i ON ui.interest_id = i.id
               WHERE ui.user_id = ? AND (
                 LOWER(c.name) LIKE CONCAT('%', LOWER(i.name), '%') OR
                 LOWER(cc.name) LIKE CONCAT('%', LOWER(i.name), '%')
               )
             ) as interest_match_score
      FROM communities c
      JOIN community_categories cc ON c.category_id = cc.id
      WHERE c.status = 'active'
        AND c.visibility = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM community_members cm 
          WHERE cm.community_id = c.id AND cm.user_id = ? AND cm.status IN ('active', 'pending')
        )
      ORDER BY c.is_boosted DESC, interest_match_score DESC, c.member_count DESC
      LIMIT ?
    `;

    const rows = await query<RowDataPacket[]>(sql, [userId, userId, limit]);
    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: r.description || null,
      categoryId: Number(r.category_id),
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      coverImage: r.cover_image || null,
      avatarImage: r.avatar_image || null,
      creatorId: Number(r.creator_id),
      visibility: r.visibility,
      joinPolicy: r.join_policy,
      status: r.status,
      postingPermission: r.posting_permission,
      eventPermission: r.event_permission,
      memberCount: Number(r.member_count) || 0,
      postCount: Number(r.post_count) || 0,
      eventCount: Number(r.event_count) || 0,
      isBoosted: Boolean(r.is_boosted),
      boostExpiresAt: r.boost_expires_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userMembership: null,
    }));
  }
}
