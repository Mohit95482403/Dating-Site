// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Controller

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { CommunityService } from '../services/community.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class CommunityController {
  // ────────────────────────── CATEGORIES ──────────────────────────

  public static async getCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await CommunityService.getCategories();
      ApiResponse.success(res, 'Community categories retrieved', categories, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── COMMUNITIES ──────────────────────────

  public static async getCommunities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const q = req.query.q ? String(req.query.q) : req.query.search ? String(req.query.search) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;
      const sort = req.query.sort as any;
      const visibility = req.query.visibility as any;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await CommunityService.getCommunities(userId, { q, category, sort, visibility, page, limit });
      ApiResponse.success(res, 'Communities retrieved', result.communities, HttpStatus.OK, {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommended(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communities = await CommunityService.getRecommendedCommunities(userId);
      ApiResponse.success(res, 'Recommended communities retrieved', communities, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getCommunityBySlug(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const slug = req.params.slug;
      const community = await CommunityService.getCommunityBySlug(slug, userId);
      ApiResponse.success(res, 'Community details retrieved', community, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async createCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, description, categoryId, visibility, joinPolicy, avatarImage, coverImage } = req.body;

      if (!name || !categoryId) {
        throw AppError.badRequest('Community name and category are required.');
      }

      const community = await CommunityService.createCommunity(userId, {
        name,
        description,
        categoryId: Number(categoryId),
        visibility,
        joinPolicy,
        avatarImage,
        coverImage,
      });

      ApiResponse.success(res, 'Community created successfully', community, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async updateCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const updated = await CommunityService.updateCommunity(communityId, userId, req.body);
      ApiResponse.success(res, 'Community updated successfully', updated, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async boostCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      await CommunityService.boostCommunity(communityId, userId);
      ApiResponse.success(res, 'Community boosted successfully for 7 days', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── MEMBERSHIP ──────────────────────────

  public static async getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const role = req.query.role as any;
      const status = req.query.status as any;
      const q = req.query.q ? String(req.query.q) : undefined;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await CommunityService.getMembers(communityId, userId, { role, status, q, page, limit });
      ApiResponse.success(res, 'Members retrieved', result.members, HttpStatus.OK, {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async joinCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const result = await CommunityService.joinCommunity(communityId, userId);
      ApiResponse.success(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async leaveCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      await CommunityService.leaveCommunity(communityId, userId);
      ApiResponse.success(res, 'Successfully left community', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async approveJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const moderatorId = req.user!.id;
      const communityId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      await CommunityService.approveJoinRequest(communityId, moderatorId, targetUserId);
      ApiResponse.success(res, 'Join request approved', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async rejectJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const moderatorId = req.user!.id;
      const communityId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      await CommunityService.rejectJoinRequest(communityId, moderatorId, targetUserId);
      ApiResponse.success(res, 'Join request rejected', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async updateMemberRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const communityId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      const { role } = req.body;
      if (!role) throw AppError.badRequest('Role is required');

      await CommunityService.updateMemberRole(communityId, actorId, targetUserId, role);
      ApiResponse.success(res, `Member role updated to ${role}`, null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async banMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const moderatorId = req.user!.id;
      const communityId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      const { reason } = req.body;
      await CommunityService.banMember(communityId, moderatorId, targetUserId, reason);
      ApiResponse.success(res, 'Member banned from community', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async unbanMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const moderatorId = req.user!.id;
      const communityId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      await CommunityService.unbanMember(communityId, moderatorId, targetUserId);
      ApiResponse.success(res, 'Member unbanned', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── POSTS ──────────────────────────

  public static async getPosts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const sort = (req.query.sort as any) || 'latest';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await CommunityService.getCommunityPosts(communityId, userId, sort, page, limit);
      ApiResponse.success(res, 'Community posts retrieved', result.posts, HttpStatus.OK, {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const { content } = req.body;

      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (req.file) {
        mediaUrl = `/uploads/feed/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      } else if (req.body.mediaUrl) {
        mediaUrl = req.body.mediaUrl;
        mediaType = req.body.mediaType || 'image';
      }

      const post = await CommunityService.createCommunityPost(communityId, userId, {
        content: content || null,
        mediaUrl,
        mediaType,
      });

      ApiResponse.success(res, 'Post published to community', post, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── EVENTS ──────────────────────────

  public static async getEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const filter = (req.query.filter as any) || 'upcoming';
      const events = await CommunityService.getEvents(communityId, userId, filter);
      ApiResponse.success(res, 'Community events retrieved', events, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getEventById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const eventId = Number(req.params.eventId);
      const event = await CommunityService.getEventById(eventId, userId);
      ApiResponse.success(res, 'Event details retrieved', event, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const event = await CommunityService.createEvent(communityId, userId, req.body);
      ApiResponse.success(res, 'Event created successfully', event, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async rsvpEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const eventId = Number(req.params.eventId);
      const { status } = req.body;
      if (!status || !['going', 'interested', 'not_going'].includes(status)) {
        throw AppError.badRequest('Valid RSVP status is required (going, interested, not_going).');
      }

      const result = await CommunityService.rsvpEvent(eventId, userId, status);
      ApiResponse.success(res, 'RSVP updated successfully', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async cancelRsvp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const eventId = Number(req.params.eventId);
      const result = await CommunityService.cancelRsvp(eventId, userId);
      ApiResponse.success(res, 'RSVP cancelled', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getEventAttendees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const eventId = Number(req.params.eventId);
      const attendees = await CommunityService.getEventAttendees(eventId);
      ApiResponse.success(res, 'Event attendees retrieved', attendees, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── GROUP CHAT ──────────────────────────

  public static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const limit = Number(req.query.limit) || 50;
      const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;

      const messages = await CommunityService.getMessages(communityId, userId, limit, beforeId);
      ApiResponse.success(res, 'Community messages retrieved', messages, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const { content, mediaUrl, mediaType } = req.body;

      const message = await CommunityService.sendMessage(communityId, userId, content, mediaUrl, mediaType);
      ApiResponse.success(res, 'Message sent', message, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── INVITES ──────────────────────────

  public static async sendInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const inviterId = req.user!.id;
      const communityId = Number(req.params.id);
      const inviteeId = Number(req.body.inviteeId);
      if (!inviteeId) throw AppError.badRequest('Invitee ID is required');

      await CommunityService.sendInvite(communityId, inviterId, inviteeId);
      ApiResponse.success(res, 'Invitation sent successfully', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserInvites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const invites = await CommunityService.getUserInvites(userId);
      ApiResponse.success(res, 'Community invites retrieved', invites, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async respondInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const inviteId = Number(req.params.inviteId);
      const { accept } = req.body;
      await CommunityService.respondInvite(inviteId, userId, Boolean(accept));
      ApiResponse.success(res, accept ? 'Invitation accepted' : 'Invitation declined', null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────── MODERATION & REPORTS ──────────────────────────

  public static async report(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reporterId = req.user!.id;
      const communityId = Number(req.params.id);
      const { targetType, targetId, reason, description } = req.body;
      if (!targetType || !targetId || !reason) {
        throw AppError.badRequest('Target type, target ID, and reason are required.');
      }

      const reportId = await CommunityService.reportCommunity(
        communityId,
        reporterId,
        targetType,
        Number(targetId),
        reason,
        description
      );
      ApiResponse.success(res, 'Report submitted for moderator review', { reportId }, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const status = (req.query.status as any) || 'pending';
      const reports = await CommunityService.getCommunityReports(communityId, userId, status);
      ApiResponse.success(res, 'Reports retrieved', reports, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const communityId = Number(req.params.id);
      const analytics = await CommunityService.getCommunityAnalytics(communityId, userId);
      ApiResponse.success(res, 'Community analytics retrieved', analytics, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
