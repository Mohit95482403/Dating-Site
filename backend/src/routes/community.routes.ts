// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Routes

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { CommunityController } from '../controllers/community.controller';
import { feedUpload } from '../middleware/feedUploadMiddleware';

const router = Router();

// All community routes require active authentication
router.use(authMiddleware);

// ────────────────── Categories & Discovery ──────────────────
router.get('/categories', CommunityController.getCategories);
router.get('/recommended', CommunityController.getRecommended);
router.get('/invites', CommunityController.getUserInvites);
router.post('/invites/:inviteId/respond', CommunityController.respondInvite);

// ────────────────── Community CRUD ──────────────────
router.get('/', CommunityController.getCommunities);
router.post('/', CommunityController.createCommunity);
router.get('/:slug', CommunityController.getCommunityBySlug);
router.patch('/:id', CommunityController.updateCommunity);
router.post('/:id/boost', CommunityController.boostCommunity);

// ────────────────── Membership & Roles ──────────────────
router.get('/:id/members', CommunityController.getMembers);
router.post('/:id/join', CommunityController.joinCommunity);
router.post('/:id/leave', CommunityController.leaveCommunity);
router.post('/:id/invite', CommunityController.sendInvite);
router.post('/:id/members/:userId/approve', CommunityController.approveJoinRequest);
router.post('/:id/members/:userId/reject', CommunityController.rejectJoinRequest);
router.patch('/:id/members/:userId/role', CommunityController.updateMemberRole);
router.post('/:id/members/:userId/ban', CommunityController.banMember);
router.post('/:id/members/:userId/unban', CommunityController.unbanMember);

// ────────────────── Community Posts ──────────────────
router.get('/:id/posts', CommunityController.getPosts);
router.post('/:id/posts', feedUpload.single('media'), CommunityController.createPost);

// ────────────────── Community Events & RSVP ──────────────────
router.get('/:id/events', CommunityController.getEvents);
router.post('/:id/events', CommunityController.createEvent);
router.get('/events/:eventId', CommunityController.getEventById);
router.post('/events/:eventId/rsvp', CommunityController.rsvpEvent);
router.delete('/events/:eventId/rsvp', CommunityController.cancelRsvp);
router.get('/events/:eventId/attendees', CommunityController.getEventAttendees);

// ────────────────── Community Group Chat ──────────────────
router.get('/:id/messages', CommunityController.getMessages);
router.post('/:id/messages', CommunityController.sendMessage);

// ────────────────── Moderation & Reports ──────────────────
router.post('/:id/report', CommunityController.report);
router.get('/:id/reports', CommunityController.getReports);

// ────────────────── Community Analytics ──────────────────
router.get('/:id/analytics', CommunityController.getAnalytics);

export default router;
