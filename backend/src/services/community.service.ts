// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Service
// Business logic, centralized role authorization, entitlement gating, real-time broadcasts & notifications

import { CommunityModel } from '../models/community.model';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { emitToCommunity, emitToUser, emitRecommendationsUpdated } from '../sockets/socket';
import { PersonalizationModel } from '../models/personalization.model';
import { NotificationService } from './notification.service';
import EntitlementService from './entitlement.service';
import { AbuseRiskService } from './abuseRisk.service';
import type {
  CommunityCategoryItem,
  CommunityItem,
  CommunityMemberItem,
  CommunityEventItem,
  CommunityMessageItem,
  CommunityInviteItem,
  CommunityReportItem,
  CommunityAnalyticsData,
  CommunityFilterOptions,
  CommunityRole,
  RsvpStatus,
} from '../types/community.types';

export class CommunityService {
  // ────────────────────────── PERMISSIONS HIERARCHY ──────────────────────────

  private static ROLE_RANKS: Record<CommunityRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };

  public static canManageSettings(role?: CommunityRole): boolean {
    return role === 'owner' || role === 'admin';
  }

  public static canModerate(role?: CommunityRole): boolean {
    return role === 'owner' || role === 'admin' || role === 'moderator';
  }

  public static canPost(community: CommunityItem, role?: CommunityRole): boolean {
    if (!role) return false;
    if (role === 'owner' || role === 'admin') return true;
    if (community.postingPermission === 'admins_only') return false;
    if (community.postingPermission === 'moderators_only') return role === 'moderator';
    return true; // 'all_members'
  }

  public static canCreateEvent(community: CommunityItem, role?: CommunityRole): boolean {
    if (!role) return false;
    if (role === 'owner' || role === 'admin') return true;
    if (community.eventPermission === 'admins_only') return false;
    if (community.eventPermission === 'admins_and_moderators') return role === 'moderator';
    return true; // 'all_members'
  }

  // ────────────────────────── CATEGORIES ──────────────────────────

  public static async getCategories(): Promise<CommunityCategoryItem[]> {
    return CommunityModel.getCategories();
  }

  // ────────────────────────── COMMUNITIES ──────────────────────────

  public static async getCommunities(
    userId: number,
    options: CommunityFilterOptions = {}
  ): Promise<{ communities: CommunityItem[]; total: number }> {
    return CommunityModel.getCommunities(userId, options);
  }

  public static async getCommunityBySlug(slug: string, userId: number): Promise<CommunityItem> {
    const community = await CommunityModel.getCommunityBySlug(slug, userId);
    if (!community) {
      throw AppError.notFound(`Community "${slug}" not found.`);
    }

    // Privacy guard: private communities are accessible only to active members or admin role
    if (community.visibility === 'private' && community.userMembership?.status !== 'active') {
      // Return public preview metadata without leaking private content
      return {
        ...community,
        description: community.description ? community.description.slice(0, 150) + '... (Private Community)' : null,
      };
    }

    return community;
  }

  public static async createCommunity(
    creatorId: number,
    data: {
      name: string;
      description?: string;
      categoryId: number;
      visibility?: 'public' | 'private';
      joinPolicy?: 'open' | 'request_to_join' | 'invite_only';
      avatarImage?: string;
      coverImage?: string;
    }
  ): Promise<CommunityItem> {
    if (!data.name || data.name.trim().length < 3) {
      throw AppError.badRequest('Community name must be at least 3 characters.');
    }
    if (data.name.trim().length > 100) {
      throw AppError.badRequest('Community name cannot exceed 100 characters.');
    }

    // Day 21 Entitlement check: Free users can create at most 2 communities
    const createdCount = await CommunityModel.getUserCreatedCommunitiesCount(creatorId);
    if (createdCount >= 2) {
      const isEntitled = await EntitlementService.hasFeature(creatorId, 'CREATE_MORE_COMMUNITIES');
      const isPremium = (await EntitlementService.getUserEntitlements(creatorId)).isPremium;
      if (!isEntitled && !isPremium) {
        throw AppError.forbidden(
          'Free account community limit reached (2 maximum). Upgrade to Connectly Premium to create unlimited communities!'
        );
      }
    }

    const communityId = await CommunityModel.createCommunity(creatorId, data);
    const created = await CommunityModel.getCommunityById(communityId, creatorId);
    if (!created) throw AppError.internal('Failed to retrieve created community.');

    logger.info(`[CommunityService] User ${creatorId} created community ${communityId} ("${created.name}")`);
    return created;
  }

  public static async updateCommunity(
    communityId: number,
    userId: number,
    data: any
  ): Promise<CommunityItem> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || !this.canManageSettings(member.role)) {
      throw AppError.forbidden('You do not have permission to manage this community.');
    }

    await CommunityModel.updateCommunity(communityId, data);
    const updated = await CommunityModel.getCommunityById(communityId, userId);
    if (!updated) throw AppError.notFound('Community not found');

    emitToCommunity(communityId, 'community:updated', { community: updated });
    return updated;
  }

  public static async boostCommunity(communityId: number, userId: number): Promise<void> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || !this.canManageSettings(member.role)) {
      throw AppError.forbidden('Only community administrators can boost this community.');
    }

    const entitlements = await EntitlementService.getUserEntitlements(userId);
    if (!entitlements.isPremium) {
      throw AppError.forbidden('Community boost requires an active Connectly Premium subscription.');
    }

    await CommunityModel.boostCommunity(communityId, 7);
    logger.info(`[CommunityService] Community ${communityId} boosted by user ${userId}`);
    emitToCommunity(communityId, 'community:boosted', { communityId, boostedUntil: new Date(Date.now() + 7 * 86400000) });
  }

  // ────────────────────────── MEMBERSHIP ──────────────────────────

  public static async getMembers(
    communityId: number,
    userId: number,
    options: any = {}
  ): Promise<{ members: CommunityMemberItem[]; total: number }> {
    const community = await CommunityModel.getCommunityById(communityId, userId);
    if (!community) throw AppError.notFound('Community not found');

    if (community.visibility === 'private' && community.userMembership?.status !== 'active') {
      throw AppError.forbidden('Private community member lists are visible only to members.');
    }

    return CommunityModel.getMembers(communityId, options);
  }

  public static async joinCommunity(communityId: number, userId: number): Promise<{ status: string; message: string }> {
    await AbuseRiskService.assertCanJoinCommunity(userId);

    const community = await CommunityModel.getCommunityById(communityId, userId);
    if (!community) throw AppError.notFound('Community not found');

    const existingMember = await CommunityModel.getMember(communityId, userId);
    if (existingMember) {
      if (existingMember.status === 'active') {
        throw AppError.badRequest('You are already an active member of this community.');
      }
      if (existingMember.status === 'banned') {
        throw AppError.forbidden('You have been restricted from joining this community.');
      }
      if (existingMember.status === 'pending') {
        throw AppError.badRequest('Your join request is already pending review.');
      }
    }

    if (community.joinPolicy === 'invite_only') {
      throw AppError.forbidden('This community is invite-only.');
    }

    if (community.joinPolicy === 'request_to_join') {
      await CommunityModel.joinCommunity(communityId, userId, 'member', 'pending');
      // Notify community owner/admins
      NotificationService.createNotification({
        userId: community.creatorId,
        actorId: userId,
        type: 'COMMUNITY_JOIN_REQUEST',
        title: 'New Community Request',
        message: `A member requested to join ${community.name}.`,
        referenceType: 'community',
        referenceId: communityId,
      }).catch(() => {});

      return { status: 'pending', message: 'Join request submitted for moderator approval.' };
    }

    // Open join policy
    await CommunityModel.joinCommunity(communityId, userId, 'member', 'active');
    emitToCommunity(communityId, 'community:member_joined', { communityId, userId });

    // Day 26: Trigger behavioral learning & recommendation invalidation
    PersonalizationModel.recordBehaviorEvent(userId, 'COMMUNITY_JOIN', 'COMMUNITY', String(communityId)).catch(() => {});
    emitRecommendationsUpdated(userId, 'community_joined');

    return { status: 'active', message: `You have successfully joined ${community.name}!` };
  }

  public static async leaveCommunity(communityId: number, userId: number): Promise<void> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || member.status !== 'active') {
      throw AppError.badRequest('You are not an active member of this community.');
    }

    if (member.role === 'owner') {
      const allMembers = await CommunityModel.getMembers(communityId, { status: 'active', limit: 5 });
      if (allMembers.total > 1) {
        throw AppError.badRequest(
          'As the community owner, you must transfer ownership to another admin before leaving.'
        );
      }
    }

    await CommunityModel.leaveCommunity(communityId, userId);
    emitToCommunity(communityId, 'community:member_left', { communityId, userId });
  }

  public static async approveJoinRequest(communityId: number, moderatorId: number, targetUserId: number): Promise<void> {
    const mod = await CommunityModel.getMember(communityId, moderatorId);
    if (!mod || !this.canModerate(mod.role)) {
      throw AppError.forbidden('You do not have moderation permissions in this community.');
    }

    await CommunityModel.updateMemberStatus(communityId, targetUserId, 'active');
    const community = await CommunityModel.getCommunityById(communityId, moderatorId);

    NotificationService.createNotification({
      userId: targetUserId,
      actorId: moderatorId,
      type: 'COMMUNITY_REQUEST_APPROVED',
      title: 'Join Request Approved',
      message: `Your request to join ${community?.name || 'the community'} has been approved!`,
      referenceType: 'community',
      referenceId: communityId,
    }).catch(() => {});

    emitToCommunity(communityId, 'community:member_joined', { communityId, userId: targetUserId });
  }

  public static async rejectJoinRequest(communityId: number, moderatorId: number, targetUserId: number): Promise<void> {
    const mod = await CommunityModel.getMember(communityId, moderatorId);
    if (!mod || !this.canModerate(mod.role)) {
      throw AppError.forbidden('You do not have moderation permissions in this community.');
    }

    await CommunityModel.updateMemberStatus(communityId, targetUserId, 'rejected');
  }

  public static async updateMemberRole(
    communityId: number,
    actorId: number,
    targetUserId: number,
    newRole: CommunityRole
  ): Promise<void> {
    const actor = await CommunityModel.getMember(communityId, actorId);
    if (!actor || !this.canManageSettings(actor.role)) {
      throw AppError.forbidden('Only community administrators can modify member roles.');
    }

    const target = await CommunityModel.getMember(communityId, targetUserId);
    if (!target) throw AppError.notFound('Member not found in community.');

    if (target.role === 'owner' && actor.role !== 'owner') {
      throw AppError.forbidden('Cannot modify the community owner role.');
    }

    await CommunityModel.updateMemberRole(communityId, targetUserId, newRole);
    await CommunityModel.logModeration(communityId, actorId, 'member', targetUserId, `ROLE_CHANGED_TO_${newRole.toUpperCase()}`);

    emitToCommunity(communityId, 'community:role_updated', { communityId, userId: targetUserId, role: newRole });
  }

  public static async banMember(
    communityId: number,
    moderatorId: number,
    targetUserId: number,
    reason?: string
  ): Promise<void> {
    const mod = await CommunityModel.getMember(communityId, moderatorId);
    if (!mod || !this.canModerate(mod.role)) {
      throw AppError.forbidden('You do not have moderation permissions in this community.');
    }

    const target = await CommunityModel.getMember(communityId, targetUserId);
    if (!target) throw AppError.notFound('Member not found.');

    const modRank = this.ROLE_RANKS[mod.role] || 0;
    const targetRank = this.ROLE_RANKS[target.role] || 0;
    if (modRank <= targetRank) {
      throw AppError.forbidden('Cannot ban a member with equal or higher authority.');
    }

    await CommunityModel.updateMemberStatus(communityId, targetUserId, 'banned');
    await CommunityModel.logModeration(communityId, moderatorId, 'member', targetUserId, 'MEMBER_BANNED', reason);

    emitToCommunity(communityId, 'community:member_banned', { communityId, userId: targetUserId });
  }

  public static async unbanMember(communityId: number, moderatorId: number, targetUserId: number): Promise<void> {
    const mod = await CommunityModel.getMember(communityId, moderatorId);
    if (!mod || !this.canModerate(mod.role)) {
      throw AppError.forbidden('You do not have moderation permissions in this community.');
    }

    await CommunityModel.updateMemberStatus(communityId, targetUserId, 'rejected'); // removes ban, allows rejoin
    await CommunityModel.logModeration(communityId, moderatorId, 'member', targetUserId, 'MEMBER_UNBANNED');
  }

  // ────────────────────────── POSTS ──────────────────────────

  public static async getCommunityPosts(
    communityId: number,
    userId: number,
    sort: 'latest' | 'popular' | 'discussed' = 'latest',
    page = 1,
    limit = 20
  ): Promise<{ posts: any[]; total: number }> {
    const community = await CommunityModel.getCommunityById(communityId, userId);
    if (!community) throw AppError.notFound('Community not found');

    if (community.visibility === 'private' && community.userMembership?.status !== 'active') {
      throw AppError.forbidden('Posts in private communities are only accessible to active members.');
    }

    return CommunityModel.getCommunityPosts(communityId, userId, sort, page, limit);
  }

  public static async createCommunityPost(
    communityId: number,
    userId: number,
    data: { content: string | null; mediaUrl: string | null; mediaType: string | null }
  ): Promise<any> {
    const community = await CommunityModel.getCommunityById(communityId, userId);
    if (!community) throw AppError.notFound('Community not found');

    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || member.status !== 'active') {
      throw AppError.forbidden('You must be an active member to post in this community.');
    }

    if (!this.canPost(community, member.role)) {
      throw AppError.forbidden('Posting in this community is currently restricted by staff.');
    }

    const postId = await CommunityModel.createCommunityPost(
      communityId,
      userId,
      data.content,
      data.mediaUrl,
      data.mediaType
    );

    emitToCommunity(communityId, 'community:post_created', { communityId, postId });
    return { id: postId, communityId, userId, ...data };
  }

  // ────────────────────────── EVENTS & RSVP ──────────────────────────

  public static async getEvents(
    communityId: number,
    userId: number,
    filter: 'upcoming' | 'past' | 'all' = 'upcoming'
  ): Promise<CommunityEventItem[]> {
    const community = await CommunityModel.getCommunityById(communityId, userId);
    if (!community) throw AppError.notFound('Community not found');

    if (community.visibility === 'private' && community.userMembership?.status !== 'active') {
      throw AppError.forbidden('Events in private communities are only visible to active members.');
    }

    return CommunityModel.getEvents(communityId, userId, filter);
  }

  public static async getEventById(eventId: number, userId: number): Promise<CommunityEventItem> {
    const event = await CommunityModel.getEventById(eventId, userId);
    if (!event) throw AppError.notFound('Event not found');
    return event;
  }

  public static async createEvent(communityId: number, creatorId: number, data: any): Promise<CommunityEventItem> {
    const community = await CommunityModel.getCommunityById(communityId, creatorId);
    if (!community) throw AppError.notFound('Community not found');

    const member = await CommunityModel.getMember(communityId, creatorId);
    if (!member || member.status !== 'active') {
      throw AppError.forbidden('You must be an active member to create events.');
    }

    if (!this.canCreateEvent(community, member.role)) {
      throw AppError.forbidden('Only community moderators and administrators can create events.');
    }

    const eventId = await CommunityModel.createEvent(communityId, creatorId, data);
    const event = await CommunityModel.getEventById(eventId, creatorId);
    if (!event) throw AppError.internal('Failed to retrieve created event.');

    emitToCommunity(communityId, 'community:event_created', { communityId, event });
    return event;
  }

  public static async rsvpEvent(eventId: number, userId: number, status: RsvpStatus): Promise<any> {
    const event = await CommunityModel.getEventById(eventId, userId);
    if (!event) throw AppError.notFound('Event not found');

    const member = await CommunityModel.getMember(event.communityId, userId);
    if (!member || member.status !== 'active') {
      throw AppError.forbidden('You must be a member of this community to RSVP to events.');
    }

    const result = await CommunityModel.rsvpEvent(eventId, userId, status);
    emitToCommunity(event.communityId, 'community:rsvp_updated', {
      communityId: event.communityId,
      eventId,
      userId,
      status,
      attendeesCount: result.attendeesCount,
    });

    // Day 26: Trigger behavioral learning & recommendation invalidation
    if (status === 'going' || status === 'interested') {
      PersonalizationModel.recordBehaviorEvent(userId, 'EVENT_RSVP', 'EVENT', String(eventId)).catch(() => {});
      emitRecommendationsUpdated(userId, 'event_rsvp');
    }

    return result;
  }

  public static async cancelRsvp(eventId: number, userId: number): Promise<any> {
    const event = await CommunityModel.getEventById(eventId, userId);
    if (!event) throw AppError.notFound('Event not found');

    const result = await CommunityModel.cancelRsvp(eventId, userId);
    emitToCommunity(event.communityId, 'community:rsvp_updated', {
      communityId: event.communityId,
      eventId,
      userId,
      status: 'not_going',
      attendeesCount: result.attendeesCount,
    });

    return result;
  }

  public static async getEventAttendees(eventId: number): Promise<any[]> {
    return CommunityModel.getEventAttendees(eventId);
  }

  // ────────────────────────── GROUP CHAT (COMMUNITY MESSAGES) ──────────────────────────

  public static async getMessages(
    communityId: number,
    userId: number,
    limit = 50,
    beforeId?: number
  ): Promise<CommunityMessageItem[]> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || member.status !== 'active') {
      throw AppError.forbidden('Community group chat is only accessible to active members.');
    }

    return CommunityModel.getMessages(communityId, limit, beforeId);
  }

  public static async sendMessage(
    communityId: number,
    userId: number,
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<CommunityMessageItem> {
    if (!content || !content.trim()) {
      throw AppError.badRequest('Message content cannot be empty.');
    }

    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || member.status !== 'active') {
      throw AppError.forbidden('You must be an active member to send messages in this group.');
    }

    const message = await CommunityModel.sendMessage(communityId, userId, content, mediaUrl, mediaType);
    emitToCommunity(communityId, 'community:message_received', { communityId, message });
    return message;
  }

  // ────────────────────────── INVITES ──────────────────────────

  public static async sendInvite(communityId: number, inviterId: number, inviteeId: number): Promise<void> {
    const community = await CommunityModel.getCommunityById(communityId, inviterId);
    if (!community) throw AppError.notFound('Community not found');

    const inviter = await CommunityModel.getMember(communityId, inviterId);
    if (!inviter || inviter.status !== 'active') {
      throw AppError.forbidden('Only active members can invite users to this community.');
    }

    const existingTarget = await CommunityModel.getMember(communityId, inviteeId);
    if (existingTarget && existingTarget.status === 'active') {
      throw AppError.badRequest('User is already an active member of this community.');
    }
    if (existingTarget && existingTarget.status === 'banned') {
      throw AppError.forbidden('Cannot invite a member who is banned from this community.');
    }

    await CommunityModel.createInvite(communityId, inviterId, inviteeId);

    NotificationService.createNotification({
      userId: inviteeId,
      actorId: inviterId,
      type: 'COMMUNITY_INVITE',
      title: 'Community Invitation',
      message: `You've been invited to join "${community.name}".`,
      referenceType: 'community',
      referenceId: communityId,
    }).catch(() => {});

    emitToUser(inviteeId, 'community:invite_received', { communityId, communityName: community.name });
  }

  public static async getUserInvites(userId: number): Promise<CommunityInviteItem[]> {
    return CommunityModel.getUserInvites(userId);
  }

  public static async respondInvite(inviteId: number, userId: number, accept: boolean): Promise<void> {
    const communityId = await CommunityModel.respondInvite(inviteId, userId, accept);
    if (!communityId) throw AppError.notFound('Invite not found or already responded.');

    if (accept) {
      emitToCommunity(communityId, 'community:member_joined', { communityId, userId });
    }
  }

  // ────────────────────────── MODERATION & REPORTS ──────────────────────────

  public static async reportCommunity(
    communityId: number,
    reporterId: number,
    targetType: any,
    targetId: number,
    reason: string,
    description?: string
  ): Promise<number> {
    return CommunityModel.createReport(communityId, reporterId, targetType, targetId, reason, description);
  }

  public static async getCommunityReports(communityId: number, userId: number, status = 'pending'): Promise<CommunityReportItem[]> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || !this.canModerate(member.role)) {
      throw AppError.forbidden('You do not have moderation permissions in this community.');
    }
    return CommunityModel.getCommunityReports(communityId, status);
  }

  public static async getCommunityAnalytics(communityId: number, userId: number): Promise<CommunityAnalyticsData> {
    const member = await CommunityModel.getMember(communityId, userId);
    if (!member || !this.canManageSettings(member.role)) {
      throw AppError.forbidden('Community analytics are only accessible to community administrators.');
    }
    return CommunityModel.getCommunityAnalytics(communityId);
  }

  public static async getRecommendedCommunities(userId: number): Promise<CommunityItem[]> {
    return CommunityModel.getRecommendedCommunities(userId, 8);
  }
}
