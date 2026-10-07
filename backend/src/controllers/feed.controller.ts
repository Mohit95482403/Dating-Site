import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { FeedService } from '../services/feed.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class FeedController {
  // ────────────────────────── POSTS ──────────────────────────

  public static async createPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { content, visibility } = req.body;

      // Handle media upload via multer
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | undefined;
      if (req.file) {
        mediaUrl = `/uploads/feed/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }

      const post = await FeedService.createPost(userId, {
        content,
        mediaUrl,
        mediaType,
        visibility: visibility || 'public',
      });

      ApiResponse.success(res, 'Post created successfully', post, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await FeedService.getFeed(userId, page, limit);

      ApiResponse.success(res, 'Feed retrieved', result.posts, HttpStatus.OK, {
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUserPosts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const viewerId = req.user!.id;
      const targetUserId = Number(req.params.userId);

      if (!targetUserId) throw AppError.badRequest('Invalid user ID.');

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await FeedService.getUserPosts(targetUserId, viewerId, page, limit);

      ApiResponse.success(res, 'User posts retrieved', result.posts, HttpStatus.OK, {
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deletePost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      await FeedService.deletePost(postId, userId);

      ApiResponse.success(res, 'Post deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── LIKES ──────────────────────────

  public static async likePost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      const result = await FeedService.likePost(postId, userId);

      ApiResponse.success(res, 'Post liked', result);
    } catch (error) {
      next(error);
    }
  }

  public static async unlikePost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      const result = await FeedService.unlikePost(postId, userId);

      ApiResponse.success(res, 'Post unliked', result);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── COMMENTS ──────────────────────────

  public static async createComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);
      const { content, parentId } = req.body;

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      const comment = await FeedService.createComment(userId, {
        postId,
        content,
        parentId: parentId ? Number(parentId) : undefined,
      });

      ApiResponse.success(res, 'Comment created', comment, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      const result = await FeedService.getComments(postId, userId, page, limit);

      ApiResponse.success(res, 'Comments retrieved', result.comments, HttpStatus.OK, {
        comments: result.comments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const commentId = Number(req.params.commentId);

      if (!commentId) throw AppError.badRequest('Invalid comment ID.');

      await FeedService.deleteComment(commentId, userId);

      ApiResponse.success(res, 'Comment deleted');
    } catch (error) {
      next(error);
    }
  }

  public static async likeComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const commentId = Number(req.params.commentId);

      if (!commentId) throw AppError.badRequest('Invalid comment ID.');

      await FeedService.likeComment(commentId, userId);

      ApiResponse.success(res, 'Comment liked');
    } catch (error) {
      next(error);
    }
  }

  public static async unlikeComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const commentId = Number(req.params.commentId);

      if (!commentId) throw AppError.badRequest('Invalid comment ID.');

      await FeedService.unlikeComment(commentId, userId);

      ApiResponse.success(res, 'Comment unliked');
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── BOOKMARKS ──────────────────────────

  public static async bookmarkPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      await FeedService.bookmarkPost(postId, userId);

      ApiResponse.success(res, 'Post bookmarked');
    } catch (error) {
      next(error);
    }
  }

  public static async unbookmarkPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId) throw AppError.badRequest('Invalid post ID.');

      await FeedService.unbookmarkPost(postId, userId);

      ApiResponse.success(res, 'Bookmark removed');
    } catch (error) {
      next(error);
    }
  }

  public static async getBookmarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await FeedService.getBookmarkedPosts(userId, page, limit);

      ApiResponse.success(res, 'Bookmarks retrieved', result.posts, HttpStatus.OK, {
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── STORIES ──────────────────────────

  public static async createStory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' = 'image';
      if (req.file) {
        mediaUrl = `/uploads/stories/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }

      if (!mediaUrl) throw AppError.badRequest('Story requires an image or video.');

      const story = await FeedService.createStory(userId, {
        mediaUrl,
        mediaType,
        caption: req.body.caption,
      });

      ApiResponse.success(res, 'Story created', story, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getStoryFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await FeedService.getStoryFeed(userId);

      ApiResponse.success(res, 'Story feed retrieved', result.groups);
    } catch (error) {
      next(error);
    }
  }

  public static async viewStory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      if (!storyId) throw AppError.badRequest('Invalid story ID.');

      await FeedService.viewStory(storyId, userId);

      ApiResponse.success(res, 'Story viewed');
    } catch (error) {
      next(error);
    }
  }

  public static async reactToStory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);
      const { reaction } = req.body;

      if (!storyId) throw AppError.badRequest('Invalid story ID.');

      await FeedService.reactToStory(storyId, userId, reaction || '❤️');

      ApiResponse.success(res, 'Story reaction sent');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteStory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      if (!storyId) throw AppError.badRequest('Invalid story ID.');

      await FeedService.deleteStory(storyId, userId);

      ApiResponse.success(res, 'Story deleted');
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── REPORTS ──────────────────────────

  public static async reportContent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetType, targetId, reason, description } = req.body;

      if (!targetType || !targetId || !reason) {
        throw AppError.badRequest('targetType, targetId, and reason are required.');
      }

      const reportId = await FeedService.reportContent(userId, {
        targetType,
        targetId: Number(targetId),
        reason,
        description,
      });

      ApiResponse.success(res, 'Content reported', { reportId }, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── ADMIN ──────────────────────────

  public static async getContentReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = (req.query.status as string) || 'all';
      const targetType = req.query.targetType as string;
      const search = req.query.search as string;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

      const { reports, total } = await FeedService.getContentReports({
        status,
        targetType,
        search,
        page,
        limit,
      });
      const totalPages = Math.ceil(total / limit) || 1;

      ApiResponse.success(res, 'Content reports retrieved', {
        reports,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reviewContentReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const reportId = Number(req.params.reportId);
      const { status, action, actionReason } = req.body;

      if (!reportId) throw AppError.badRequest('Invalid report ID.');

      let newStatus = status;
      if (!newStatus && action) {
        if (action === 'dismiss') newStatus = 'dismissed';
        else if (action === 'remove_content' || action === 'remove') newStatus = 'actioned';
        else if (action === 'warn_user' || action === 'restrict_user') newStatus = 'reviewed';
        else newStatus = 'reviewed';
      }
      if (!newStatus) newStatus = 'reviewed';

      await FeedService.reviewContentReport(reportId, adminId, newStatus, action, actionReason);

      ApiResponse.success(res, 'Report reviewed');
    } catch (error) {
      next(error);
    }
  }

  public static async getFeedAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await FeedService.getFeedAnalytics();
      ApiResponse.success(res, 'Feed analytics retrieved', analytics);
    } catch (error) {
      next(error);
    }
  }
}

export default FeedController;
