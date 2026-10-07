import api from './api';
import type { ApiResponse } from '../types';
import type {
  NotificationListResponse,
  NotificationFilter,
} from '../types/notification';

export const notificationService = {
  /**
   * Get paginated notifications with filter
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    filter?: NotificationFilter;
  }): Promise<NotificationListResponse> => {
    const response = await api.get<ApiResponse<NotificationListResponse>>('/notifications', {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        filter: params?.filter || 'all',
      },
    });

    return (
      response.data?.data || {
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
        unreadCount: 0,
      }
    );
  },

  /**
   * Fetch unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ unreadCount: number }>>(
        '/notifications/unread-count'
      );
      return response.data?.data?.unreadCount ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (
    notificationId: number
  ): Promise<{ success: boolean; unreadCount: number }> => {
    const response = await api.patch<ApiResponse<{ success: boolean; unreadCount: number }>>(
      `/notifications/${notificationId}/read`
    );
    return response.data?.data || { success: true, unreadCount: 0 };
  },

  /**
   * Mark all user notifications as read
   */
  markAllAsRead: async (): Promise<{ markedCount: number; unreadCount: number }> => {
    const response = await api.patch<ApiResponse<{ markedCount: number; unreadCount: number }>>(
      '/notifications/read-all'
    );
    return response.data?.data || { markedCount: 0, unreadCount: 0 };
  },

  /**
   * Delete a single notification
   */
  deleteNotification: async (
    notificationId: number
  ): Promise<{ success: boolean; unreadCount: number }> => {
    const response = await api.delete<ApiResponse<{ success: boolean; unreadCount: number }>>(
      `/notifications/${notificationId}`
    );
    return response.data?.data || { success: true, unreadCount: 0 };
  },
};

export default notificationService;
