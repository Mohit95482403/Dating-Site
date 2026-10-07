import { api } from './api';
import type {
  PostItem,
  CommentItem,
  UserStoryGroup,
  StoryItem,
  FeedResponse,
  ContentReportPayload,
  AdminContentReportItem,
  FeedAnalytics,
} from '../types/feed';

export class FeedService {
  // ────────────────────────── POSTS ──────────────────────────

  public static async getFeed(page = 1, limit = 15): Promise<FeedResponse> {
    const response = await api.get('/posts', {
      params: { page, limit },
    });
    const resData = response.data;
    const posts = Array.isArray(resData.data)
      ? resData.data
      : Array.isArray(resData.data?.posts)
      ? resData.data.posts
      : [];
    const pagination = resData.pagination || resData.data?.pagination || {
      page,
      limit,
      total: posts.length,
      hasMore: posts.length >= limit,
    };
    return { posts, pagination };
  }

  public static async getUserPosts(userId: number, page = 1, limit = 15): Promise<FeedResponse> {
    const response = await api.get(`/posts/user/${userId}`, {
      params: { page, limit },
    });
    const resData = response.data;
    const posts = Array.isArray(resData.data)
      ? resData.data
      : Array.isArray(resData.data?.posts)
      ? resData.data.posts
      : [];
    const pagination = resData.pagination || resData.data?.pagination || {
      page,
      limit,
      total: posts.length,
      hasMore: posts.length >= limit,
    };
    return { posts, pagination };
  }

  public static async createPost(formData: FormData): Promise<PostItem> {
    const response = await api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  public static async deletePost(postId: number): Promise<void> {
    await api.delete(`/posts/${postId}`);
  }

  // ────────────────────────── LIKES ──────────────────────────

  public static async likePost(postId: number): Promise<{ liked: boolean; likesCount: number }> {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data.data;
  }

  public static async unlikePost(postId: number): Promise<{ unliked: boolean; likesCount: number }> {
    const response = await api.delete(`/posts/${postId}/like`);
    return response.data.data;
  }

  // ────────────────────────── COMMENTS ──────────────────────────

  public static async getComments(
    postId: number,
    page = 1,
    limit = 30
  ): Promise<{ comments: CommentItem[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    const resData = response.data;
    const comments: CommentItem[] = Array.isArray(resData?.data)
      ? resData.data
      : Array.isArray(resData?.data?.comments)
      ? resData.data.comments
      : Array.isArray(resData?.comments)
      ? resData.comments
      : Array.isArray(resData)
      ? resData
      : [];

    const pagination = resData?.pagination || resData?.data?.pagination || {
      page,
      limit,
      total: comments.length,
      hasMore: comments.length >= limit,
    };

    return { comments, pagination };
  }

  public static async createComment(postId: number, content: string, parentId?: number): Promise<CommentItem> {
    const response = await api.post(`/posts/${postId}/comments`, {
      content,
      parentId,
    });
    const resData = response.data;
    return (resData?.data || resData) as CommentItem;
  }

  public static async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  }

  public static async likeComment(commentId: number): Promise<{ liked: boolean; likesCount: number }> {
    const response = await api.post(`/comments/${commentId}/like`);
    return response.data.data;
  }

  public static async unlikeComment(commentId: number): Promise<{ unliked: boolean; likesCount: number }> {
    const response = await api.delete(`/comments/${commentId}/like`);
    return response.data.data;
  }

  // ────────────────────────── BOOKMARKS ──────────────────────────

  public static async bookmarkPost(postId: number): Promise<{ bookmarked: boolean }> {
    const response = await api.post(`/posts/${postId}/bookmark`);
    return response.data.data;
  }

  public static async unbookmarkPost(postId: number): Promise<{ unbookmarked: boolean }> {
    const response = await api.delete(`/posts/${postId}/bookmark`);
    return response.data.data;
  }

  public static async getBookmarks(page = 1, limit = 15): Promise<FeedResponse> {
    const response = await api.get('/bookmarks', {
      params: { page, limit },
    });
    const resData = response.data;
    const posts = Array.isArray(resData.data)
      ? resData.data
      : Array.isArray(resData.data?.posts)
      ? resData.data.posts
      : [];
    const pagination = resData.pagination || resData.data?.pagination || {
      page,
      limit,
      total: posts.length,
      hasMore: posts.length >= limit,
    };
    return { posts, pagination };
  }

  // ────────────────────────── STORIES ──────────────────────────

  public static async getStories(): Promise<UserStoryGroup[]> {
    const response = await api.get('/stories');
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.groups)) return data.groups;
    return [];
  }

  public static async createStory(formData: FormData): Promise<StoryItem> {
    const response = await api.post('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  public static async viewStory(storyId: number): Promise<{ viewed: boolean; viewsCount: number }> {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data.data;
  }

  public static async reactToStory(
    storyId: number,
    reaction: string
  ): Promise<{ reacted: boolean; reaction: string; reactionsCount: number }> {
    const response = await api.post(`/stories/${storyId}/react`, { reaction });
    return response.data.data;
  }

  public static async deleteStory(storyId: number): Promise<void> {
    await api.delete(`/stories/${storyId}`);
  }

  // ────────────────────────── CONTENT REPORTS & MODERATION ──────────────────────────

  public static async reportContent(payload: ContentReportPayload): Promise<{ reportId: number }> {
    const response = await api.post('/reports', payload);
    return response.data.data;
  }

  public static async getAdminContentReports(
    paramsOrStatus?: string | {
      status?: string;
      targetType?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    page = 1,
    limit = 20
  ): Promise<{ reports: AdminContentReportItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let params: Record<string, any> = {};
    if (typeof paramsOrStatus === 'object' && paramsOrStatus !== null) {
      params = { ...paramsOrStatus };
    } else {
      params = { status: paramsOrStatus, page, limit };
    }

    const response = await api.get('/feed/admin/reports', { params });
    const payload = response.data;

    if (payload?.data && Array.isArray(payload.data.reports)) {
      return {
        reports: payload.data.reports,
        pagination: payload.data.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: payload.data.reports.length,
          totalPages: 1,
        },
      };
    }

    if (Array.isArray(payload?.data)) {
      return {
        reports: payload.data,
        pagination: payload.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: payload.data.length,
          totalPages: 1,
        },
      };
    }

    return {
      reports: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 1,
      },
    };
  }

  public static async reviewContentReport(
    reportId: number,
    action: 'dismiss' | 'remove_content' | 'warn_user' | 'restrict_user',
    actionReason?: string
  ): Promise<void> {
    await api.patch(`/feed/admin/reports/${reportId}`, {
      action,
      actionReason,
    });
  }

  public static async getAdminFeedAnalytics(): Promise<FeedAnalytics> {
    const response = await api.get('/feed/admin/analytics');
    return response.data.data;
  }
}

export default FeedService;
