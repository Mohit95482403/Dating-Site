// Day 14 Notification Frontend Types

export type NotificationType =
  | 'MATCH_CREATED'
  | 'NEW_MESSAGE'
  | 'LIKE_RECEIVED'
  | 'SUPERLIKE_RECEIVED'
  | 'REACTION_RECEIVED'
  | 'SYSTEM'
  // Legacy / lowercase aliases
  | 'new_match'
  | 'new_message'
  | 'like_received'
  | 'super_like_received'
  | 'profile_view'
  | 'verification_update'
  | 'system';

export interface NotificationActor {
  id: number;
  firstName: string;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: number;
  userId: number;
  actorId: number | null;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actor?: NotificationActor | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export type NotificationFilter = 'all' | 'unread';
