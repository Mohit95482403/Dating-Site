import { pool, query, execute, transaction } from '../config/database';
import { RowDataPacket, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { logger } from '../utils/logger';

export class FeedModel {
  /**
   * Initialize Day 22 tables — posts, comments, bookmarks, stories, story_views, story_reactions, content_reports
   */
  public static async initTables(): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          content TEXT,
          media_url VARCHAR(500),
          media_type ENUM('image','video') DEFAULT NULL,
          visibility ENUM('public','matches_only','private') DEFAULT 'public',
          status ENUM('active','hidden','removed','flagged') DEFAULT 'active',
          likes_count INT UNSIGNED DEFAULT 0,
          comments_count INT UNSIGNED DEFAULT 0,
          bookmarks_count INT UNSIGNED DEFAULT 0,
          shares_count INT UNSIGNED DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_posts_user (user_id),
          INDEX idx_posts_status_created (status, created_at DESC),
          INDEX idx_posts_visibility (visibility)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_post_like (post_id, user_id),
          INDEX idx_post_likes_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          parent_id INT DEFAULT NULL,
          content TEXT NOT NULL,
          likes_count INT UNSIGNED DEFAULT 0,
          status ENUM('active','hidden','removed') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE,
          INDEX idx_comments_post (post_id, created_at),
          INDEX idx_comments_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS comment_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          comment_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_comment_like (comment_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS post_bookmarks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_post_bookmark (post_id, user_id),
          INDEX idx_bookmarks_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          media_url VARCHAR(500) NOT NULL,
          media_type ENUM('image','video') DEFAULT 'image',
          caption VARCHAR(500),
          views_count INT UNSIGNED DEFAULT 0,
          reactions_count INT UNSIGNED DEFAULT 0,
          status ENUM('active','expired','removed') DEFAULT 'active',
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_stories_user (user_id),
          INDEX idx_stories_active (status, expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS story_views (
          id INT AUTO_INCREMENT PRIMARY KEY,
          story_id INT NOT NULL,
          user_id INT NOT NULL,
          viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_story_view (story_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS story_reactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          story_id INT NOT NULL,
          user_id INT NOT NULL,
          reaction VARCHAR(10) NOT NULL DEFAULT '❤️',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_story_reaction (story_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS content_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          reporter_id INT NOT NULL,
          target_type ENUM('post','comment','story') NOT NULL,
          target_id INT NOT NULL,
          reason VARCHAR(100) NOT NULL,
          description TEXT,
          status ENUM('pending','reviewed','actioned','dismissed') DEFAULT 'pending',
          reviewed_by INT DEFAULT NULL,
          reviewed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_reports_status (status),
          INDEX idx_reports_target (target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      logger.info('[FeedModel] Day 22 tables initialized successfully');
    } catch (err: any) {
      // Ignore "already exists" errors
      if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
        logger.error('[FeedModel] Error initializing tables:', err);
        throw err;
      }
    } finally {
      conn.release();
    }
  }

  // ────────────────────────── POSTS ──────────────────────────

  public static async createPost(
    userId: number,
    content: string | null,
    mediaUrl: string | null,
    mediaType: string | null,
    visibility: string
  ): Promise<number> {
    const result = await execute(
      `INSERT INTO posts (user_id, content, media_url, media_type, visibility) VALUES (?, ?, ?, ?, ?)`,
      [userId, content, mediaUrl, mediaType, visibility]
    );
    return result.insertId;
  }

  public static async getPostById(postId: number): Promise<RowDataPacket | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT p.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = p.user_id AND is_primary = 1 LIMIT 1) as photo_url
       FROM posts p
       JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.id = ?`,
      [postId]
    );
    return rows[0] || null;
  }

  public static async getFeed(
    userId: number,
    page: number,
    limit: number,
    blockedUserIds: number[]
  ): Promise<{ posts: RowDataPacket[]; total: number }> {
    const offset = (page - 1) * limit;
    const blockClause = blockedUserIds.length > 0
      ? `AND p.user_id NOT IN (${blockedUserIds.map(() => '?').join(',')})`
      : '';
    const blockParams = blockedUserIds.length > 0 ? blockedUserIds : [];

    // Get matched user ids for matches_only visibility
    const matchedRows = await query<RowDataPacket[]>(
      `SELECT CASE WHEN user_one_id = ? THEN user_two_id ELSE user_one_id END as partner_id
       FROM matches WHERE (user_one_id = ? OR user_two_id = ?) AND status = 'active'`,
      [userId, userId, userId]
    );
    const matchedIds = matchedRows.map((r: any) => r.partner_id);

    // Build visibility filter: show public posts, own posts, and matches_only for matched users
    let visibilityClause = `(p.visibility = 'public' OR p.user_id = ?`;
    const visParams: any[] = [userId];
    if (matchedIds.length > 0) {
      visibilityClause += ` OR (p.visibility = 'matches_only' AND p.user_id IN (${matchedIds.map(() => '?').join(',')}))`;
      visParams.push(...matchedIds);
    }
    visibilityClause += `)`;

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM posts p 
       WHERE p.status = 'active' AND ${visibilityClause} ${blockClause}`,
      [...visParams, ...blockParams]
    );
    const total = countRows[0]?.total || 0;

    const posts = await query<RowDataPacket[]>(
      `SELECT p.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = p.user_id AND is_primary = 1 LIMIT 1) as photo_url,
              (SELECT COUNT(*) > 0 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
              (SELECT COUNT(*) > 0 FROM post_bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
              (SELECT s.status FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id 
               WHERE s.user_id = p.user_id AND s.status = 'active' AND sp.code != 'FREE' 
               AND (s.expires_at IS NULL OR s.expires_at > NOW()) LIMIT 1) as sub_status
       FROM posts p
       JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.status = 'active' AND ${visibilityClause} ${blockClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, ...visParams, ...blockParams, limit, offset]
    );

    return { posts, total };
  }

  public static async getUserPosts(
    targetUserId: number,
    viewerUserId: number,
    page: number,
    limit: number
  ): Promise<{ posts: RowDataPacket[]; total: number }> {
    const offset = (page - 1) * limit;

    // Check if viewer is matched with target
    const matchRows = await query<RowDataPacket[]>(
      `SELECT id FROM matches 
       WHERE ((user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)) AND status = 'active'`,
      [viewerUserId, targetUserId, targetUserId, viewerUserId]
    );
    const isMatched = matchRows.length > 0;

    let visClause = `(p.visibility = 'public'`;
    if (viewerUserId === targetUserId) {
      visClause = `(1=1`; // Show all own posts
    } else if (isMatched) {
      visClause += ` OR p.visibility = 'matches_only'`;
    }
    visClause += `)`;

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM posts p WHERE p.user_id = ? AND p.status = 'active' AND ${visClause}`,
      [targetUserId]
    );
    const total = countRows[0]?.total || 0;

    const posts = await query<RowDataPacket[]>(
      `SELECT p.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = p.user_id AND is_primary = 1 LIMIT 1) as photo_url,
              (SELECT COUNT(*) > 0 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
              (SELECT COUNT(*) > 0 FROM post_bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
              (SELECT s.status FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id 
               WHERE s.user_id = p.user_id AND s.status = 'active' AND sp.code != 'FREE' 
               AND (s.expires_at IS NULL OR s.expires_at > NOW()) LIMIT 1) as sub_status
       FROM posts p
       JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.user_id = ? AND p.status = 'active' AND ${visClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [viewerUserId, viewerUserId, targetUserId, limit, offset]
    );

    return { posts, total };
  }

  public static async deletePost(postId: number, userId: number): Promise<boolean> {
    const result = await execute(
      `UPDATE posts SET status = 'removed' WHERE id = ? AND user_id = ?`,
      [postId, userId]
    );
    return result.affectedRows > 0;
  }

  // ────────────────────────── POST LIKES ──────────────────────────

  public static async likePost(postId: number, userId: number): Promise<boolean> {
    try {
      await execute(
        `INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`,
        [postId, userId]
      );
      await execute(
        `UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?`,
        [postId]
      );
      return true;
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') return false;
      throw err;
    }
  }

  public static async unlikePost(postId: number, userId: number): Promise<boolean> {
    const result = await execute(
      `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
      [postId, userId]
    );
    if (result.affectedRows > 0) {
      await execute(
        `UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?`,
        [postId]
      );
      return true;
    }
    return false;
  }

  // ────────────────────────── COMMENTS ──────────────────────────

  public static async createComment(
    postId: number,
    userId: number,
    content: string,
    parentId?: number
  ): Promise<number> {
    const result = await execute(
      `INSERT INTO post_comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)`,
      [postId, userId, content, parentId || null]
    );
    await execute(
      `UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?`,
      [postId]
    );
    return result.insertId;
  }

  public static async getComments(
    postId: number,
    userId: number,
    page: number,
    limit: number
  ): Promise<{ comments: RowDataPacket[]; total: number }> {
    const offset = (page - 1) * limit;
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM post_comments WHERE post_id = ? AND parent_id IS NULL AND status = 'active'`,
      [postId]
    );
    const total = countRows[0]?.total || 0;

    const comments = await query<RowDataPacket[]>(
      `SELECT c.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = c.user_id AND is_primary = 1 LIMIT 1) as photo_url,
              (SELECT COUNT(*) > 0 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked
       FROM post_comments c
       JOIN profiles pr ON pr.user_id = c.user_id
       WHERE c.post_id = ? AND c.parent_id IS NULL AND c.status = 'active'
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [userId, postId, limit, offset]
    );

    // Load replies for each top-level comment
    for (const comment of comments) {
      const replies = await query<RowDataPacket[]>(
        `SELECT c.*, 
                pr.first_name, pr.last_name,
                (SELECT file_url FROM photos WHERE user_id = c.user_id AND is_primary = 1 LIMIT 1) as photo_url,
                (SELECT COUNT(*) > 0 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked
         FROM post_comments c
         JOIN profiles pr ON pr.user_id = c.user_id
         WHERE c.parent_id = ? AND c.status = 'active'
         ORDER BY c.created_at ASC
         LIMIT 5`,
        [userId, comment.id]
      );
      (comment as any).replies = replies;
    }

    return { comments, total };
  }

  public static async deleteComment(commentId: number, userId: number): Promise<{ deleted: boolean; postId: number | null }> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, post_id FROM post_comments WHERE id = ? AND user_id = ?`,
      [commentId, userId]
    );
    if (rows.length === 0) return { deleted: false, postId: null };

    const postId = rows[0].post_id;
    await execute(`UPDATE post_comments SET status = 'removed' WHERE id = ?`, [commentId]);
    await execute(
      `UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?`,
      [postId]
    );
    return { deleted: true, postId };
  }

  public static async likeComment(commentId: number, userId: number): Promise<boolean> {
    try {
      await execute(`INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, [commentId, userId]);
      await execute(`UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = ?`, [commentId]);
      return true;
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') return false;
      throw err;
    }
  }

  public static async unlikeComment(commentId: number, userId: number): Promise<boolean> {
    const result = await execute(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId]);
    if (result.affectedRows > 0) {
      await execute(`UPDATE post_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?`, [commentId]);
      return true;
    }
    return false;
  }

  // ────────────────────────── BOOKMARKS ──────────────────────────

  public static async bookmarkPost(postId: number, userId: number): Promise<boolean> {
    try {
      await execute(`INSERT INTO post_bookmarks (post_id, user_id) VALUES (?, ?)`, [postId, userId]);
      await execute(`UPDATE posts SET bookmarks_count = bookmarks_count + 1 WHERE id = ?`, [postId]);
      return true;
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') return false;
      throw err;
    }
  }

  public static async unbookmarkPost(postId: number, userId: number): Promise<boolean> {
    const result = await execute(`DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?`, [postId, userId]);
    if (result.affectedRows > 0) {
      await execute(`UPDATE posts SET bookmarks_count = GREATEST(bookmarks_count - 1, 0) WHERE id = ?`, [postId]);
      return true;
    }
    return false;
  }

  public static async getBookmarkedPosts(
    userId: number,
    page: number,
    limit: number
  ): Promise<{ posts: RowDataPacket[]; total: number }> {
    const offset = (page - 1) * limit;
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM post_bookmarks b JOIN posts p ON p.id = b.post_id WHERE b.user_id = ? AND p.status = 'active'`,
      [userId]
    );
    const total = countRows[0]?.total || 0;

    const posts = await query<RowDataPacket[]>(
      `SELECT p.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = p.user_id AND is_primary = 1 LIMIT 1) as photo_url,
              1 as is_bookmarked,
              (SELECT COUNT(*) > 0 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
              (SELECT s.status FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id 
               WHERE s.user_id = p.user_id AND s.status = 'active' AND sp.code != 'FREE' 
               AND (s.expires_at IS NULL OR s.expires_at > NOW()) LIMIT 1) as sub_status
       FROM post_bookmarks b
       JOIN posts p ON p.id = b.post_id
       JOIN profiles pr ON pr.user_id = p.user_id
       WHERE b.user_id = ? AND p.status = 'active'
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    return { posts, total };
  }

  // ────────────────────────── STORIES ──────────────────────────

  public static async createStory(
    userId: number,
    mediaUrl: string,
    mediaType: string,
    caption: string | null,
    expiresAt: Date
  ): Promise<number> {
    const result = await execute(
      `INSERT INTO stories (user_id, media_url, media_type, caption, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, mediaUrl, mediaType, caption, expiresAt]
    );
    return result.insertId;
  }

  public static async expireOldStories(): Promise<number> {
    const result = await execute(
      `UPDATE stories SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()`
    );
    return result.affectedRows;
  }

  public static async getStoryFeed(
    userId: number,
    blockedUserIds: number[]
  ): Promise<{ stories: RowDataPacket[]; myStories: RowDataPacket[] }> {
    // Expire old stories first
    await this.expireOldStories();

    const blockClause = blockedUserIds.length > 0
      ? `AND s.user_id NOT IN (${blockedUserIds.map(() => '?').join(',')})`
      : '';
    const blockParams = blockedUserIds.length > 0 ? blockedUserIds : [];

    // Get matched user IDs
    const matchedRows = await query<RowDataPacket[]>(
      `SELECT CASE WHEN user_one_id = ? THEN user_two_id ELSE user_one_id END as partner_id
       FROM matches WHERE (user_one_id = ? OR user_two_id = ?) AND status = 'active'`,
      [userId, userId, userId]
    );
    const matchedIds = matchedRows.map((r: any) => r.partner_id);

    // Show stories from: self, matches, and public profiles
    let whereClause = `s.status = 'active' AND s.expires_at > NOW()`;
    const params: any[] = [];

    if (matchedIds.length > 0) {
      whereClause += ` AND (s.user_id = ? OR s.user_id IN (${matchedIds.map(() => '?').join(',')}))`;
      params.push(userId, ...matchedIds);
    } else {
      whereClause += ` AND s.user_id = ?`;
      params.push(userId);
    }

    const stories = await query<RowDataPacket[]>(
      `SELECT s.*, 
              pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = s.user_id AND is_primary = 1 LIMIT 1) as photo_url,
              (SELECT COUNT(*) > 0 FROM story_views WHERE story_id = s.id AND user_id = ?) as is_viewed
       FROM stories s
       JOIN profiles pr ON pr.user_id = s.user_id
       WHERE ${whereClause} ${blockClause}
       ORDER BY s.created_at DESC`,
      [userId, ...params, ...blockParams]
    );

    const myStories = stories.filter((s: any) => s.user_id === userId);
    const otherStories = stories.filter((s: any) => s.user_id !== userId);

    return { stories: otherStories, myStories };
  }

  public static async viewStory(storyId: number, userId: number): Promise<boolean> {
    try {
      await execute(
        `INSERT INTO story_views (story_id, user_id) VALUES (?, ?)`,
        [storyId, userId]
      );
      await execute(
        `UPDATE stories SET views_count = views_count + 1 WHERE id = ?`,
        [storyId]
      );
      return true;
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') return false;
      throw err;
    }
  }

  public static async reactToStory(storyId: number, userId: number, reaction: string): Promise<boolean> {
    try {
      await execute(
        `INSERT INTO story_reactions (story_id, user_id, reaction) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reaction = ?`,
        [storyId, userId, reaction, reaction]
      );
      // Only increment if new insert (not update)
      await execute(
        `UPDATE stories SET reactions_count = (SELECT COUNT(*) FROM story_reactions WHERE story_id = ?) WHERE id = ?`,
        [storyId, storyId]
      );
      return true;
    } catch (err: any) {
      throw err;
    }
  }

  public static async deleteStory(storyId: number, userId: number): Promise<boolean> {
    const result = await execute(
      `UPDATE stories SET status = 'removed' WHERE id = ? AND user_id = ?`,
      [storyId, userId]
    );
    return result.affectedRows > 0;
  }

  public static async getStoryById(storyId: number): Promise<RowDataPacket | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT s.*, pr.first_name, pr.last_name,
              (SELECT file_url FROM photos WHERE user_id = s.user_id AND is_primary = 1 LIMIT 1) as photo_url
       FROM stories s
       JOIN profiles pr ON pr.user_id = s.user_id
       WHERE s.id = ?`,
      [storyId]
    );
    return rows[0] || null;
  }

  // ────────────────────────── CONTENT REPORTS ──────────────────────────

  public static async createContentReport(
    reporterId: number,
    targetType: string,
    targetId: number,
    reason: string,
    description: string | null
  ): Promise<number> {
    const result = await execute(
      `INSERT INTO content_reports (reporter_id, target_type, target_id, reason, description) VALUES (?, ?, ?, ?, ?)`,
      [reporterId, targetType, targetId, reason, description]
    );
    return result.insertId;
  }

  public static async getContentReports(
    options: {
      status?: string;
      targetType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } | string,
    pageParam = 1,
    limitParam = 20
  ): Promise<{ reports: any[]; total: number }> {
    const opts = typeof options === 'object' && options !== null
      ? options
      : { status: options, page: pageParam, limit: limitParam };

    const status = opts.status || 'all';
    const targetType = opts.targetType || 'all';
    const search = opts.search ? opts.search.trim() : '';
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(opts.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (status === 'action_taken' || status === 'actioned') {
      whereClauses.push("cr.status IN ('actioned', 'action_taken')");
    } else if (status && status !== 'all') {
      whereClauses.push('cr.status = ?');
      params.push(status);
    }

    if (targetType && targetType !== 'all') {
      whereClauses.push('cr.target_type = ?');
      params.push(targetType);
    }

    if (search) {
      whereClauses.push(
        '(cr.reason LIKE ? OR cr.description LIKE ? OR u.email LIKE ? OR pr.first_name LIKE ? OR pr.last_name LIKE ?)'
      );
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM content_reports cr
       LEFT JOIN users u ON u.id = cr.reporter_id
       LEFT JOIN profiles pr ON pr.user_id = cr.reporter_id
       ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT cr.*, 
              COALESCE(NULLIF(TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))), ''), u.username, u.email, 'Anonymous') as reporter_name,
              COALESCE(u.email, '') as reporter_email
       FROM content_reports cr
       LEFT JOIN users u ON u.id = cr.reporter_id
       LEFT JOIN profiles pr ON pr.user_id = cr.reporter_id
       ${whereSql}
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const reports = await Promise.all(
      rows.map(async (r) => {
        let contentDetails: any = null;

        try {
          if (r.target_type === 'post') {
            const postRows = await query<RowDataPacket[]>(
              `SELECT p.id, p.content, p.media_url, p.media_type, p.status, p.created_at,
                      p.user_id as author_id,
                      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))), ''), u.username, u.email, 'Author') as author_name,
                      COALESCE(u.email, '') as author_email
               FROM posts p
               LEFT JOIN users u ON u.id = p.user_id
               LEFT JOIN profiles pr ON pr.user_id = p.user_id
               WHERE p.id = ?`,
              [r.target_id]
            );
            if (postRows[0]) {
              contentDetails = {
                id: postRows[0].id,
                content: postRows[0].content,
                mediaUrl: postRows[0].media_url,
                mediaType: postRows[0].media_type,
                status: postRows[0].status,
                authorId: postRows[0].author_id,
                authorName: postRows[0].author_name,
                authorEmail: postRows[0].author_email,
                createdAt: postRows[0].created_at,
              };
            }
          } else if (r.target_type === 'comment') {
            const commentRows = await query<RowDataPacket[]>(
              `SELECT c.id, c.content, c.status, c.created_at,
                      c.user_id as author_id,
                      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))), ''), u.username, u.email, 'Author') as author_name,
                      COALESCE(u.email, '') as author_email
               FROM post_comments c
               LEFT JOIN users u ON u.id = c.user_id
               LEFT JOIN profiles pr ON pr.user_id = c.user_id
               WHERE c.id = ?`,
              [r.target_id]
            );
            if (commentRows[0]) {
              contentDetails = {
                id: commentRows[0].id,
                content: commentRows[0].content,
                status: commentRows[0].status,
                authorId: commentRows[0].author_id,
                authorName: commentRows[0].author_name,
                authorEmail: commentRows[0].author_email,
                createdAt: commentRows[0].created_at,
              };
            }
          } else if (r.target_type === 'story') {
            const storyRows = await query<RowDataPacket[]>(
              `SELECT s.id, s.caption as content, s.media_url, s.media_type, s.status, s.created_at,
                      s.user_id as author_id,
                      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))), ''), u.username, u.email, 'Author') as author_name,
                      COALESCE(u.email, '') as author_email
               FROM stories s
               LEFT JOIN users u ON u.id = s.user_id
               LEFT JOIN profiles pr ON pr.user_id = s.user_id
               WHERE s.id = ?`,
              [r.target_id]
            );
            if (storyRows[0]) {
              contentDetails = {
                id: storyRows[0].id,
                content: storyRows[0].content,
                mediaUrl: storyRows[0].media_url,
                mediaType: storyRows[0].media_type,
                status: storyRows[0].status,
                authorId: storyRows[0].author_id,
                authorName: storyRows[0].author_name,
                authorEmail: storyRows[0].author_email,
                createdAt: storyRows[0].created_at,
              };
            }
          }
        } catch (detailErr) {
          logger.warn(`[FeedModel] Failed to fetch content details for ${r.target_type} #${r.target_id}:`, detailErr);
        }

        const normalizedStatus = r.status === 'actioned' ? 'action_taken' : r.status;

        return {
          id: r.id,
          reporterId: r.reporter_id,
          reporterName: r.reporter_name,
          reporterEmail: r.reporter_email,
          targetType: r.target_type,
          targetId: r.target_id,
          reason: r.reason,
          description: r.description,
          status: normalizedStatus,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
          contentDetails,
        };
      })
    );

    return { reports, total };
  }

  public static async reviewContentReport(
    reportId: number,
    adminId: number,
    newStatus: string,
    action?: string,
    _actionReason?: string
  ): Promise<boolean> {
    let dbStatus = newStatus;
    if (dbStatus === 'action_taken') dbStatus = 'actioned';

    const result = await execute(
      `UPDATE content_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [dbStatus, adminId, reportId]
    );

    if ((action === 'remove' || action === 'remove_content') && result.affectedRows > 0) {
      const rows = await query<RowDataPacket[]>(
        `SELECT target_type, target_id FROM content_reports WHERE id = ?`,
        [reportId]
      );
      if (rows[0]) {
        const { target_type, target_id } = rows[0];
        if (target_type === 'post') {
          await execute(`UPDATE posts SET status = 'removed' WHERE id = ?`, [target_id]);
        } else if (target_type === 'comment') {
          await execute(`UPDATE post_comments SET status = 'removed' WHERE id = ?`, [target_id]);
        } else if (target_type === 'story') {
          await execute(`UPDATE stories SET status = 'removed' WHERE id = ?`, [target_id]);
        }
      }
    }

    return result.affectedRows > 0;
  }

  // ────────────────────────── ADMIN FEED ANALYTICS ──────────────────────────

  public static async getFeedAnalytics(): Promise<any> {
    const [postsStats] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_posts,
              COALESCE(SUM(likes_count), 0) as total_likes,
              COALESCE(SUM(comments_count), 0) as total_comments,
              COALESCE(SUM(bookmarks_count), 0) as total_bookmarks,
              COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as posts_today,
              COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as posts_week
       FROM posts WHERE status != 'removed'`
    );

    const [storiesStats] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_stories,
              COALESCE(SUM(views_count), 0) as total_views,
              COALESCE(SUM(reactions_count), 0) as total_reactions,
              COUNT(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 END) as active_stories,
              COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as stories_today
       FROM stories WHERE status != 'removed'`
    );

    const [reportsStats] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_reports,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports
       FROM content_reports`
    );

    const totalPosts = Number(postsStats?.total_posts || 0);
    const postsToday = Number(postsStats?.posts_today || 0);
    const postsThisWeek = Number(postsStats?.posts_week || 0);
    const totalStories = Number(storiesStats?.total_stories || 0);
    const activeStories = Number(storiesStats?.active_stories || 0);
    const totalViews = Number(storiesStats?.total_views || 0);
    const totalLikes = Number(postsStats?.total_likes || 0);
    const totalComments = Number(postsStats?.total_comments || 0);
    const pendingContentReports = Number(reportsStats?.pending_reports || 0);
    const totalReports = Number(reportsStats?.total_reports || 0);

    return {
      totalPosts,
      postsToday,
      postsThisWeek,
      totalStories,
      activeStories,
      totalViews,
      totalLikes,
      totalComments,
      pendingContentReports,
      totalReports,
      posts: postsStats || {},
      stories: storiesStats || {},
      reports: reportsStats || {},
    };
  }
}

export default FeedModel;
