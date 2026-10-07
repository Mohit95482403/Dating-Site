// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Types

export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';
export type CommunityVisibility = 'public' | 'private';
export type JoinPolicy = 'open' | 'request_to_join' | 'invite_only';
export type CommunityStatus = 'active' | 'suspended' | 'archived';
export type PostingPermission = 'all_members' | 'moderators_only' | 'admins_only';
export type EventPermission = 'all_members' | 'admins_and_moderators' | 'admins_only';
export type MemberStatus = 'active' | 'pending' | 'banned' | 'rejected';
export type EventLocationType = 'online' | 'in_person' | 'hybrid';
export type EventStatus = 'scheduled' | 'active' | 'cancelled' | 'completed';
export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface CommunityCategoryItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  communitiesCount?: number;
}

export interface CommunityItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  coverImage: string | null;
  avatarImage: string | null;
  creatorId: number;
  creatorName?: string;
  visibility: CommunityVisibility;
  joinPolicy: JoinPolicy;
  status: CommunityStatus;
  postingPermission: PostingPermission;
  eventPermission: EventPermission;
  memberCount: number;
  postCount: number;
  eventCount: number;
  isBoosted: boolean;
  boostExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  userMembership?: {
    role: CommunityRole;
    status: MemberStatus;
    joinedAt: string;
  } | null;
}

export interface CommunityMemberItem {
  id: number;
  communityId: number;
  userId: number;
  role: CommunityRole;
  status: MemberStatus;
  joinedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    isVerified: boolean;
    isOnline?: boolean;
    locationCity?: string | null;
  };
}

export interface CommunityEventItem {
  id: number;
  communityId: number;
  creatorId: number;
  creatorName?: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  locationType: EventLocationType;
  locationName: string | null;
  locationVisibility: 'public' | 'members_only';
  maxAttendees: number;
  attendeesCount: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  userRsvp?: RsvpStatus | null;
}

export interface CommunityEventRsvpItem {
  id: number;
  eventId: number;
  userId: number;
  status: RsvpStatus;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    isVerified: boolean;
  };
}

export interface CommunityMessageItem {
  id: number;
  communityId: number;
  senderId: number;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  status: 'active' | 'deleted';
  createdAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    role: CommunityRole;
  };
}

export interface CommunityInviteItem {
  id: number;
  communityId: number;
  communityName?: string;
  communitySlug?: string;
  communityAvatar?: string | null;
  inviterId: number;
  inviterName?: string;
  inviteeId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface CommunityModerationLogItem {
  id: number;
  communityId: number;
  moderatorId: number;
  moderatorName?: string;
  targetType: 'member' | 'post' | 'comment' | 'event' | 'message';
  targetId: number;
  action: string;
  reason: string | null;
  createdAt: string;
}

export interface CommunityReportItem {
  id: number;
  communityId: number;
  communityName?: string;
  reporterId: number;
  reporterName?: string;
  targetType: 'community' | 'post' | 'comment' | 'event' | 'member' | 'message';
  targetId: number;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface CommunityAnalyticsData {
  totalMembers: number;
  newMembers7d: number;
  totalPosts: number;
  posts7d: number;
  totalEvents: number;
  upcomingEvents: number;
  totalRsvps: number;
  totalMessages: number;
  activeMembersDaily: number;
}

export interface CommunityFilterOptions {
  q?: string;
  category?: string;
  visibility?: CommunityVisibility;
  sort?: 'popular' | 'newest' | 'active' | 'trending';
  page?: number;
  limit?: number;
}
