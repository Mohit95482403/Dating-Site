export type PostVisibility = 'public' | 'matches_only' | 'private';
export type PostStatus = 'active' | 'hidden' | 'removed' | 'flagged';
export type MediaType = 'image' | 'video';

export interface PostAuthor {
  id: number;
  firstName: string;
  lastName: string;
  gender?: string;
  avatarUrl?: string;
  isVerified: boolean;
  role: string;
}

export interface PostItem {
  id: number;
  userId: number;
  content: string | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  visibility: PostVisibility;
  status: PostStatus;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

export interface CommentItem {
  id: number;
  postId: number;
  userId: number;
  parentId: number | null;
  content: string;
  likesCount: number;
  isLiked: boolean;
  status: 'active' | 'hidden' | 'removed';
  createdAt: string;
  author: PostAuthor;
  replies?: CommentItem[];
}

export interface StoryItem {
  id: number;
  userId: number;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  viewsCount: number;
  reactionsCount: number;
  status: 'active' | 'expired' | 'removed';
  expiresAt: string;
  createdAt: string;
  hasViewed: boolean;
  myReaction?: string;
}

export interface UserStoryGroup {
  userId: number;
  author: PostAuthor;
  stories: StoryItem[];
  hasUnseen: boolean;
  latestCreatedAt: string;
}

export interface StoryViewer {
  viewerId: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  viewedAt: string;
}

export interface FeedResponse {
  posts: PostItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreatePostPayload {
  content?: string;
  visibility?: PostVisibility;
  media?: File;
}

export interface CreateStoryPayload {
  caption?: string;
  media: File;
}

export interface ContentReportPayload {
  targetType: 'post' | 'comment' | 'story';
  targetId: number;
  reason: string;
  description?: string;
}

export interface AdminContentReportItem {
  id: number;
  reporterId: number;
  reporterName: string;
  reporterEmail: string;
  targetType: 'post' | 'comment' | 'story';
  targetId: number;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  createdAt: string;
  reviewedAt?: string;
  contentDetails?: {
    id: number;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    status: string;
    authorId: number;
    authorName: string;
    authorEmail: string;
    createdAt: string;
  } | null;
}

export interface FeedAnalytics {
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  totalStories: number;
  activeStories: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
  totalContentReports: number;
  pendingContentReports: number;
  removedPostsCount: number;
}
