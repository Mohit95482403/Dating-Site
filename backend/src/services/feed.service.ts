import { FeedModel } from '../models/feed.model';
import { BlockModel } from '../models/block.model';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { emitToUser } from '../sockets/socket';
import { PersonalizationModel } from '../models/personalization.model';
import { NotificationService } from './notification.service';
import type {
  PostItem,
  PostAuthor,
  CommentItem,
  StoryItem,
  StoryGroup,
  FeedResult,
  StoryFeedResult,
  CreatePostInput,
  CreateCommentInput,
  CreateStoryInput,
  ContentReportInput,
} from '../types/feed.types';

const formatAuthor = (row: any): PostAuthor => ({
  id: Number(row.user_id),
  firstName: row.first_name || '',
  lastName: row.last_name || '',
  photoUrl: row.photo_url || null,
  isPremium: !!row.sub_status,
});

const formatPost = (row: any): PostItem => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  content: row.content || null,
  mediaUrl: row.media_url || null,
  mediaType: row.media_type || null,
  visibility: row.visibility,
  status: row.status,
  likesCount: Number(row.likes_count) || 0,
  commentsCount: Number(row.comments_count) || 0,
  bookmarksCount: Number(row.bookmarks_count) || 0,
  sharesCount: Number(row.shares_count) || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: formatAuthor(row),
  isLiked: Boolean(row.is_liked),
  isBookmarked: Boolean(row.is_bookmarked),
});

const formatComment = (row: any): CommentItem => ({
  id: Number(row.id),
  postId: Number(row.post_id),
  userId: Number(row.user_id),
  parentId: row.parent_id ? Number(row.parent_id) : null,
  content: row.content,
  likesCount: Number(row.likes_count) || 0,
  status: row.status,
  createdAt: row.created_at,
  author: {
    id: Number(row.user_id),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    photoUrl: row.photo_url || null,
    avatarUrl: row.photo_url || null,
    isPremium: false,
  },
  isLiked: Boolean(row.is_liked),
  replies: row.replies ? row.replies.map(formatComment) : [],
});

const formatStory = (row: any): StoryItem => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  caption: row.caption || null,
  viewsCount: Number(row.views_count) || 0,
  reactionsCount: Number(row.reactions_count) || 0,
  status: row.status,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  author: {
    id: Number(row.user_id),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    photoUrl: row.photo_url || null,
    isPremium: false,
  },
  isViewed: Boolean(row.is_viewed),
});

export class FeedService {
  // ────────────────────────── POSTS ──────────────────────────

  public static async createPost(userId: number, input: CreatePostInput): Promise<PostItem> {
    if (!input.content && !input.mediaUrl) {
      throw AppError.badRequest('Post must have either content or media.');
    }
    if (input.content && input.content.length > 2000) {
      throw AppError.badRequest('Post content cannot exceed 2000 characters.');
    }

    const postId = await FeedModel.createPost(
      userId,
      input.content || null,
      input.mediaUrl || null,
      input.mediaType || null,
      input.visibility || 'public'
    );

    const postRow = await FeedModel.getPostById(postId);
    if (!postRow) throw AppError.internal('Failed to retrieve created post.');

    const post = formatPost(postRow);
    logger.info(`[FeedService] User ${userId} created post ${postId}`);

    // Day 23: Index and sync hashtags asynchronously
    if (input.content) {
      import('../models/explore.model').then(({ ExploreModel }) => {
        ExploreModel.syncPostHashtags(postId, input.content || null).catch((e) => {
          logger.warn('[FeedService] Failed to sync post hashtags:', e);
        });
      });
    }

    // Emit real-time new post event
    emitToUser(userId, 'feed:post:created', { post });

    return post;
  }

  public static async getFeed(userId: number, page: number = 1, limit: number = 20): Promise<FeedResult> {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));

    // Get blocked user IDs to filter out
    const blockedIds = await this.getBlockedUserIds(userId);

    const { posts, total } = await FeedModel.getFeed(userId, page, limit, blockedIds);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      posts: posts.map(formatPost),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  public static async getUserPosts(
    targetUserId: number,
    viewerUserId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResult> {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));

    const { posts, total } = await FeedModel.getUserPosts(targetUserId, viewerUserId, page, limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      posts: posts.map(formatPost),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  public static async deletePost(postId: number, userId: number): Promise<void> {
    const deleted = await FeedModel.deletePost(postId, userId);
    if (!deleted) throw AppError.notFound('Post not found or unauthorized.');
    logger.info(`[FeedService] User ${userId} deleted post ${postId}`);
  }

  // ────────────────────────── LIKES ──────────────────────────

  public static async likePost(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    const post = await FeedModel.getPostById(postId);
    if (!post || post.status !== 'active') throw AppError.notFound('Post not found.');

    const liked = await FeedModel.likePost(postId, userId);
    const updatedPost = await FeedModel.getPostById(postId);
    const likesCount = Number(updatedPost?.likes_count || 0);

    // Emit real-time like event
    emitToUser(Number(post.user_id), 'feed:post:liked', {
      postId,
      userId,
      likesCount,
    });

    // Notify post owner (skip if liking own post)
    if (Number(post.user_id) !== userId && liked) {
      await NotificationService.createNotification({
        userId: Number(post.user_id),
        actorId: userId,
        type: 'LIKE_RECEIVED',
        title: 'Someone liked your post',
        message: 'Your post received a new like.',
        referenceType: 'post',
        referenceId: postId,
      }).catch(() => {});
    }

    if (liked) {
      PersonalizationModel.recordBehaviorEvent(userId, 'POST_LIKE', 'POST', String(postId)).catch(() => {});
    }

    return { liked, likesCount };
  }

  public static async unlikePost(postId: number, userId: number): Promise<{ unliked: boolean; likesCount: number }> {
    const post = await FeedModel.getPostById(postId);
    if (!post || post.status !== 'active') throw AppError.notFound('Post not found.');

    const unliked = await FeedModel.unlikePost(postId, userId);
    const updatedPost = await FeedModel.getPostById(postId);
    const likesCount = Number(updatedPost?.likes_count || 0);

    return { unliked, likesCount };
  }

  // ────────────────────────── COMMENTS ──────────────────────────

  public static async createComment(userId: number, input: CreateCommentInput): Promise<CommentItem> {
    if (!input.content || input.content.trim().length === 0) {
      throw AppError.badRequest('Comment content is required.');
    }
    if (input.content.length > 1000) {
      throw AppError.badRequest('Comment cannot exceed 1000 characters.');
    }

    const post = await FeedModel.getPostById(input.postId);
    if (!post || post.status !== 'active') throw AppError.notFound('Post not found.');

    const commentId = await FeedModel.createComment(
      input.postId,
      userId,
      input.content.trim(),
      input.parentId
    );

    // Get comments to return the formatted comment
    const { comments } = await FeedModel.getComments(input.postId, userId, 1, 100);
    const comment = comments.find((c: any) => c.id === commentId);
    if (!comment) throw AppError.internal('Failed to retrieve created comment.');

    const formatted = formatComment(comment);

    PersonalizationModel.recordBehaviorEvent(userId, 'POST_COMMENT', 'POST', String(input.postId)).catch(() => {});

    // Notify post owner
    if (Number(post.user_id) !== userId) {
      await NotificationService.createNotification({
        userId: Number(post.user_id),
        actorId: userId,
        type: 'SYSTEM',
        title: 'New comment on your post',
        message: input.content.substring(0, 100),
        referenceType: 'post',
        referenceId: input.postId,
      }).catch(() => {});
    }

    // Real-time comment event
    emitToUser(Number(post.user_id), 'feed:comment:new', {
      postId: input.postId,
      comment: formatted,
    });

    return formatted;
  }

  public static async getComments(
    postId: number,
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: CommentItem[]; pagination: any }> {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));

    const { comments, total } = await FeedModel.getComments(postId, userId, page, limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      comments: comments.map(formatComment),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  public static async deleteComment(commentId: number, userId: number): Promise<void> {
    const { deleted, postId } = await FeedModel.deleteComment(commentId, userId);
    if (!deleted) throw AppError.notFound('Comment not found or unauthorized.');
    logger.info(`[FeedService] User ${userId} deleted comment ${commentId}`);
  }

  public static async likeComment(commentId: number, userId: number): Promise<boolean> {
    return await FeedModel.likeComment(commentId, userId);
  }

  public static async unlikeComment(commentId: number, userId: number): Promise<boolean> {
    return await FeedModel.unlikeComment(commentId, userId);
  }

  // ────────────────────────── BOOKMARKS ──────────────────────────

  public static async bookmarkPost(postId: number, userId: number): Promise<boolean> {
    const post = await FeedModel.getPostById(postId);
    if (!post || post.status !== 'active') throw AppError.notFound('Post not found.');
    return await FeedModel.bookmarkPost(postId, userId);
  }

  public static async unbookmarkPost(postId: number, userId: number): Promise<boolean> {
    return await FeedModel.unbookmarkPost(postId, userId);
  }

  public static async getBookmarkedPosts(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResult> {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));

    const { posts, total } = await FeedModel.getBookmarkedPosts(userId, page, limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      posts: posts.map(formatPost),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  // ────────────────────────── STORIES ──────────────────────────

  public static async createStory(userId: number, input: CreateStoryInput): Promise<StoryItem> {
    if (!input.mediaUrl) {
      throw AppError.badRequest('Story requires media (image or video).');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const storyId = await FeedModel.createStory(
      userId,
      input.mediaUrl,
      input.mediaType || 'image',
      input.caption || null,
      expiresAt
    );

    const storyRow = await FeedModel.getStoryById(storyId);
    if (!storyRow) throw AppError.internal('Failed to retrieve created story.');

    const story = formatStory(storyRow);
    logger.info(`[FeedService] User ${userId} created story ${storyId}`);

    return story;
  }

  public static async getStoryFeed(userId: number): Promise<StoryFeedResult> {
    const blockedIds = await this.getBlockedUserIds(userId);
    const { stories, myStories } = await FeedModel.getStoryFeed(userId, blockedIds);

    // Group stories by user
    const groupMap = new Map<number, StoryGroup>();
    for (const row of stories) {
      const story = formatStory(row);
      const uid = story.userId;
      if (!groupMap.has(uid)) {
        groupMap.set(uid, {
          userId: uid,
          author: story.author,
          stories: [],
          hasUnviewed: false,
          latestAt: story.createdAt,
        });
      }
      const group = groupMap.get(uid)!;
      group.stories.push(story);
      if (!story.isViewed) group.hasUnviewed = true;
      if (story.createdAt > group.latestAt) group.latestAt = story.createdAt;
    }

    // Sort groups: unviewed first, then by latest story
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });

    return {
      groups,
      myStories: myStories.map(formatStory),
    };
  }

  public static async viewStory(storyId: number, userId: number): Promise<void> {
    const story = await FeedModel.getStoryById(storyId);
    if (!story || story.status !== 'active') throw AppError.notFound('Story not found.');
    await FeedModel.viewStory(storyId, userId);
  }

  public static async reactToStory(storyId: number, userId: number, reaction: string): Promise<void> {
    const story = await FeedModel.getStoryById(storyId);
    if (!story || story.status !== 'active') throw AppError.notFound('Story not found.');
    await FeedModel.reactToStory(storyId, userId, reaction);

    // Notify story owner
    if (Number(story.user_id) !== userId) {
      emitToUser(Number(story.user_id), 'feed:story:reaction', {
        storyId,
        userId,
        reaction,
      });
    }
  }

  public static async deleteStory(storyId: number, userId: number): Promise<void> {
    const deleted = await FeedModel.deleteStory(storyId, userId);
    if (!deleted) throw AppError.notFound('Story not found or unauthorized.');
    logger.info(`[FeedService] User ${userId} deleted story ${storyId}`);
  }

  // ────────────────────────── CONTENT REPORTS ──────────────────────────

  public static async reportContent(userId: number, input: ContentReportInput): Promise<number> {
    if (!input.reason) throw AppError.badRequest('Report reason is required.');
    const reportId = await FeedModel.createContentReport(
      userId,
      input.targetType,
      input.targetId,
      input.reason,
      input.description || null
    );
    logger.info(`[FeedService] User ${userId} reported ${input.targetType} ${input.targetId}`);
    return reportId;
  }

  // ────────────────────────── ADMIN ──────────────────────────

  public static async getContentReports(
    options: {
      status?: string;
      targetType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } | string,
    page = 1,
    limit = 20
  ) {
    return await FeedModel.getContentReports(options, page, limit);
  }

  public static async reviewContentReport(
    reportId: number,
    adminId: number,
    newStatus: string,
    action?: string,
    actionReason?: string
  ) {
    const success = await FeedModel.reviewContentReport(reportId, adminId, newStatus, action, actionReason);
    logger.info(
      `[FeedService] Admin ${adminId} reviewed content report ${reportId} (status: ${newStatus}, action: ${action || 'none'})`
    );
    return success;
  }

  public static async getFeedAnalytics() {
    return await FeedModel.getFeedAnalytics();
  }

  // ────────────────────────── HELPERS ──────────────────────────

  private static async getBlockedUserIds(userId: number): Promise<number[]> {
    try {
      const { query: dbQuery } = await import('../config/database');
      const rows = await dbQuery<any[]>(
        `SELECT blocked_user_id as id FROM blocks WHERE blocker_id = ?
         UNION
         SELECT blocker_id as id FROM blocks WHERE blocked_user_id = ?`,
        [userId, userId]
      );
      return rows.map((r: any) => Number(r.id));
    } catch {
      return [];
    }
  }
}

export default FeedService;
