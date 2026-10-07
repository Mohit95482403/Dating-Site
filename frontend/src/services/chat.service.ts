import api from './api';
import type { ApiResponse } from '../types';
import type {
  ConversationItem,
  MessageItem,
  MessagesPagination,
} from '../types/chat';

export const chatService = {
  /**
   * Fetch all active conversations for current user
   */
  getConversations: async (): Promise<ConversationItem[]> => {
    const response = await api.get<ApiResponse<{ conversations: ConversationItem[]; count: number }>>(
      '/conversations'
    );
    return response.data?.data?.conversations || [];
  },

  /**
   * Fetch total unread message count for badge
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/conversations/unread-count');
      return response.data?.data?.count ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get or create conversation for a specific match
   */
  getOrCreateForMatch: async (matchId: number): Promise<ConversationItem> => {
    const response = await api.get<ApiResponse<{ conversation: ConversationItem }>>(
      `/conversations/match/${matchId}`
    );
    if (!response.data?.data?.conversation) {
      throw new Error('Conversation could not be initialized for match.');
    }
    return response.data.data.conversation;
  },

  /**
   * Fetch single conversation details by conversation ID
   */
  getConversation: async (conversationId: number): Promise<ConversationItem> => {
    const response = await api.get<ApiResponse<{ conversation: ConversationItem }>>(
      `/conversations/${conversationId}`
    );
    if (!response.data?.data?.conversation) {
      throw new Error('Conversation not found.');
    }
    return response.data.data.conversation;
  },

  /**
   * Fetch paginated messages for a conversation
   */
  getMessages: async (
    conversationId: number,
    options?: { limit?: number; cursor?: number; before?: number }
  ): Promise<MessagesPagination> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.cursor) params.append('cursor', options.cursor.toString());
    if (options?.before) params.append('before', options.before.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<ApiResponse<MessagesPagination>>(
      `/conversations/${conversationId}/messages${queryString}`
    );

    return (
      response.data?.data || {
        messages: [],
        hasMore: false,
        nextCursor: null,
      }
    );
  },

  /**
   * Send a text message in a conversation
   */
  sendMessage: async (conversationId: number, content: string): Promise<MessageItem> => {
    const response = await api.post<ApiResponse<MessageItem>>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
    if (!response.data?.data) {
      throw new Error('Failed to send message.');
    }
    return response.data.data;
  },

  /**
   * Mark all messages in a conversation as read
   */
  markAsRead: async (conversationId: number): Promise<void> => {
    await api.post<ApiResponse<null>>(`/conversations/${conversationId}/read`);
  },

  /**
   * Add or toggle reaction on a message
   */
  toggleReaction: async (
    messageId: number,
    reaction: string
  ): Promise<{ messageId: number; reactions: any[]; action: string }> => {
    const response = await api.post<ApiResponse<{ messageId: number; reactions: any[]; action: string }>>(
      `/messages/${messageId}/reaction`,
      { reaction }
    );
    if (!response.data?.data) {
      throw new Error('Failed to toggle reaction.');
    }
    return response.data.data;
  },

  /**
   * Remove reaction from a message
   */
  removeReaction: async (
    messageId: number
  ): Promise<{ messageId: number; reactions: any[] }> => {
    const response = await api.delete<ApiResponse<{ messageId: number; reactions: any[] }>>(
      `/messages/${messageId}/reaction`
    );
    if (!response.data?.data) {
      throw new Error('Failed to remove reaction.');
    }
    return response.data.data;
  },
};

export default chatService;
