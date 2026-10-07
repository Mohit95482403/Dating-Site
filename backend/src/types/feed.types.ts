// Connectly Day 22 — Social Feed, Posts, Stories & Engagement Types

export type PostVisibility = 'public' | 'matches_only' | 'private';
export type PostStatus = 'active' | 'hidden' | 'removed' | 'flagged';
export type StoryStatus = 'active' | 'expired' | 'removed';
export type CommentStatus = 'active' | 'hidden' | 'removed';
export type ReportableType = 'post' | 'comment' | 'story';

export interface PostItem {
  id: number;
  userId: number;
  content: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  visibility: PostVisibility;
  status: PostStatus;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined user info
  author: PostAuthor;
  // Current user interaction state
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface PostAuthor {
  id: number;
  firstName: string;
  lastName?: string;
  photoUrl: string | null;
  avatarUrl?: string | null;
  isPremium: boolean;
}

export interface CommentItem {
  id: number;
  postId: number;
  userId: number;
  parentId: number | null;
  content: string;
  likesCount: number;
  status: CommentStatus;
  createdAt: string;
  // Joined user info
  author: PostAuthor;
  isLiked?: boolean;
  replies?: CommentItem[];
}

export interface StoryItem {
  id: number;
  userId: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string | null;
  viewsCount: number;
  reactionsCount: number;
  status: StoryStatus;
  expiresAt: string;
  createdAt: string;
  // Joined user info
  author: PostAuthor;
  isViewed?: boolean;
}

export interface StoryGroup {
  userId: number;
  author: PostAuthor;
  stories: StoryItem[];
  hasUnviewed: boolean;
  latestAt: string;
}

export interface CreatePostInput {
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  visibility?: PostVisibility;
}

export interface CreateCommentInput {
  postId: number;
  content: string;
  parentId?: number;
}

export interface CreateStoryInput {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
}

export interface FeedResult {
  posts: PostItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface StoryFeedResult {
  groups: StoryGroup[];
  myStories: StoryItem[];
}

export interface ContentReportInput {
  targetType: ReportableType;
  targetId: number;
  reason: string;
  description?: string;
}
