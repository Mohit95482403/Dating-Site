// Day 14 Notification Domain Types

export type NotificationType =
  | 'MATCH_CREATED'
  | 'NEW_MESSAGE'
  | 'LIKE_RECEIVED'
  | 'SUPERLIKE_RECEIVED'
  | 'REACTION_RECEIVED'
  | 'SYSTEM'
  // Legacy / lowercase aliases for backward compatibility
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

export interface NotificationRow {
  id: number;
  user_id: number;
  actor_id: number | null;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: number | null;
  is_read: boolean | number;
  read_at: string | null;
  created_at: string;
  // Joined actor fields
  actor_first_name?: string | null;
  actor_avatar_url?: string | null;
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

export interface CreateNotificationInput {
  userId: number;
  actorId?: number | null;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: number | null;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}
