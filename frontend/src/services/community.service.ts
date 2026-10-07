// Connectly Day 24: Communities Service
import { api } from './api';
import type {
  CommunityItem,
  CommunityCategory,
  CommunityMemberItem,
  CommunityEventItem,
  CommunityMessageItem,
  CommunityInviteItem,
  CommunityAnalyticsData,
  CreateCommunityInput,
  CreateEventInput,
  RsvpStatus,
  MemberRole,
} from '../types/community';
import type { PostItem } from '../types/feed';

export class CommunityService {
  /**
   * Fetch all active categories
   */
  public static async getCategories(): Promise<CommunityCategory[]> {
    const res = await api.get('/communities/categories');
    return res.data.data || [];
  }

  /**
   * Fetch personalized recommended communities
   */
  public static async getRecommended(): Promise<CommunityItem[]> {
    const res = await api.get('/communities/recommended');
    return res.data.data || [];
  }

  /**
   * Fetch communities with filtering, sorting and debounced search
   */
  public static async getCommunities(params?: {
    search?: string;
    category?: string;
    visibility?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ communities: CommunityItem[]; total: number; page: number; totalPages: number }> {
    const res = await api.get('/communities', { params });
    const raw = res.data.data;
    if (Array.isArray(raw)) {
      return {
        communities: raw,
        total: res.data.meta?.total || raw.length,
        page: res.data.meta?.page || 1,
        totalPages: Math.ceil((res.data.meta?.total || raw.length) / (params?.limit || 20)),
      };
    }
    return raw;
  }

  /**
   * Fetch community by slug
   */
  public static async getCommunityBySlug(slug: string): Promise<CommunityItem> {
    const res = await api.get(`/communities/${slug}`);
    return res.data.data;
  }

  /**
   * Create a new community
   */
  public static async createCommunity(data: CreateCommunityInput): Promise<CommunityItem> {
    const res = await api.post('/communities', data);
    return res.data.data;
  }

  /**
   * Update community settings
   */
  public static async updateCommunity(id: number, data: Partial<CommunityItem>): Promise<CommunityItem> {
    const res = await api.patch(`/communities/${id}`, data);
    return res.data.data;
  }

  /**
   * Boost community visibility (Day 21 entitlement)
   */
  public static async boostCommunity(id: number): Promise<void> {
    await api.post(`/communities/${id}/boost`);
  }

  /**
   * Join or request to join a community
   */
  public static async joinCommunity(id: number): Promise<{ status: string; message: string }> {
    const res = await api.post(`/communities/${id}/join`);
    return res.data.data;
  }

  /**
   * Leave a community
   */
  public static async leaveCommunity(id: number): Promise<void> {
    await api.post(`/communities/${id}/leave`);
  }

  /**
   * Get members of a community
   */
  public static async getMembers(
    id: number,
    params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }
  ): Promise<{ members: CommunityMemberItem[]; total: number }> {
    const res = await api.get(`/communities/${id}/members`, { params });
    return res.data.data;
  }

  /**
   * Approve a pending join request
   */
  public static async approveJoinRequest(communityId: number, userId: number): Promise<void> {
    await api.post(`/communities/${communityId}/members/${userId}/approve`);
  }

  /**
   * Reject a pending join request
   */
  public static async rejectJoinRequest(communityId: number, userId: number): Promise<void> {
    await api.post(`/communities/${communityId}/members/${userId}/reject`);
  }

  /**
   * Update a member's role (admin, moderator, member)
   */
  public static async updateMemberRole(communityId: number, userId: number, role: MemberRole): Promise<void> {
    await api.patch(`/communities/${communityId}/members/${userId}/role`, { role });
  }

  /**
   * Ban a member from the community
   */
  public static async banMember(communityId: number, userId: number, reason?: string): Promise<void> {
    await api.post(`/communities/${communityId}/members/${userId}/ban`, { reason });
  }

  /**
   * Unban a previously restricted member
   */
  public static async unbanMember(communityId: number, userId: number): Promise<void> {
    await api.post(`/communities/${communityId}/members/${userId}/unban`);
  }

  /**
   * Send invite to a user
   */
  public static async sendInvite(communityId: number, inviteeId: number): Promise<void> {
    await api.post(`/communities/${communityId}/invite`, { inviteeId });
  }

  /**
   * Get current user's community invitations
   */
  public static async getUserInvites(): Promise<CommunityInviteItem[]> {
    const res = await api.get('/communities/invites');
    return res.data.data || [];
  }

  /**
   * Accept or decline a community invite
   */
  public static async respondInvite(inviteId: number, accept: boolean): Promise<void> {
    await api.post(`/communities/invites/${inviteId}/respond`, { accept });
  }

  /**
   * Fetch community posts feed
   */
  public static async getPosts(
    communityId: number,
    params?: { cursor?: number; limit?: number }
  ): Promise<{ posts: PostItem[]; nextCursor: number | null }> {
    const res = await api.get(`/communities/${communityId}/posts`, { params });
    const raw = res.data.data;
    if (Array.isArray(raw)) {
      return { posts: raw, nextCursor: null };
    }
    return raw;
  }

  /**
   * Create a community post (with optional file upload)
   */
  public static async createPost(communityId: number, formData: FormData): Promise<PostItem> {
    const res = await api.post(`/communities/${communityId}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  }

  /**
   * Fetch community events
   */
  public static async getEvents(
    communityId: number,
    params?: { filter?: 'upcoming' | 'past' | 'all'; page?: number; limit?: number }
  ): Promise<{ events: CommunityEventItem[]; total: number }> {
    const res = await api.get(`/communities/${communityId}/events`, { params });
    const raw = res.data.data;
    if (Array.isArray(raw)) {
      return { events: raw, total: raw.length };
    }
    return raw;
  }

  /**
   * Create an event inside a community
   */
  public static async createEvent(communityId: number, data: CreateEventInput): Promise<CommunityEventItem> {
    const res = await api.post(`/communities/${communityId}/events`, data);
    return res.data.data;
  }

  /**
   * RSVP to an event
   */
  public static async rsvpEvent(eventId: number, status: RsvpStatus): Promise<void> {
    await api.post(`/communities/events/${eventId}/rsvp`, { status });
  }

  /**
   * Cancel event RSVP
   */
  public static async cancelRsvp(eventId: number): Promise<void> {
    await api.delete(`/communities/events/${eventId}/rsvp`);
  }

  /**
   * Fetch group chat messages
   */
  public static async getMessages(
    communityId: number,
    params?: { limit?: number; before?: number }
  ): Promise<CommunityMessageItem[]> {
    const res = await api.get(`/communities/${communityId}/messages`, { params });
    return res.data.data || [];
  }

  /**
   * Send a group chat message
   */
  public static async sendMessage(
    communityId: number,
    content: string,
    mediaUrl?: string
  ): Promise<CommunityMessageItem> {
    const res = await api.post(`/communities/${communityId}/messages`, { content, mediaUrl });
    return res.data.data;
  }

  /**
   * Report a community or content
   */
  public static async report(
    communityId: number,
    data: { targetType: string; targetId: number; reason: string; details?: string }
  ): Promise<void> {
    await api.post(`/communities/${communityId}/report`, data);
  }

  /**
   * Fetch community analytics (staff only)
   */
  public static async getAnalytics(communityId: number): Promise<CommunityAnalyticsData> {
    const res = await api.get(`/communities/${communityId}/analytics`);
    return res.data.data;
  }
}
