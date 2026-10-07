// Connectly Day 24: Communities, Groups, Events, Chat & Moderation Types

export type CommunityVisibility = 'public' | 'private';
export type CommunityJoinPolicy = 'open' | 'request_to_join' | 'invite_only';
export type CommunityStatus = 'active' | 'suspended' | 'archived';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MemberStatus = 'active' | 'pending' | 'banned' | 'left';
export type EventLocationType = 'in_person' | 'online' | 'hybrid';
export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type RsvpStatus = 'going' | 'interested' | 'not_going';
export type PostingPermission = 'all_members' | 'moderators_only' | 'admins_only';
export type EventCreationPermission = 'all_members' | 'moderators_only' | 'admins_only';

export interface CommunityCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  colorHex?: string;
  displayOrder: number;
  isActive: boolean;
  communityCount?: number;
}

export interface CommunityMembershipInfo {
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface CommunityItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  categoryIcon?: string;
  categoryColorHex?: string;
  avatarImage?: string;
  coverImage?: string;
  creatorId: number;
  creatorName?: string;
  creatorUsername?: string;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  status: CommunityStatus;
  memberCount: number;
  postCount: number;
  eventCount: number;
  postingPermission: PostingPermission;
  eventCreationPermission: EventCreationPermission;
  rulesText?: string;
  isBoosted: boolean;
  boostedUntil?: string;
  userMembership?: CommunityMembershipInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMemberItem {
  id: number;
  communityId: number;
  userId: number;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  user: {
    id: number;
    fullName: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
    isPremium?: boolean;
    bio?: string;
  };
}

export interface CommunityEventItem {
  id: number;
  communityId: number;
  communityName?: string;
  creatorId: number;
  creatorName?: string;
  creatorAvatar?: string;
  title: string;
  description: string;
  coverImage?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  locationType: EventLocationType;
  locationName?: string;
  locationVisibility: 'members_only' | 'public';
  onlineMeetingUrl?: string;
  maxAttendees?: number | null;
  attendeesCount: number;
  status: EventStatus;
  userRsvp?: RsvpStatus | null;
  createdAt: string;
}

export interface CommunityMessageItem {
  id: number;
  communityId: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  senderRole?: MemberRole;
  content: string;
  mediaUrl?: string;
  messageType: 'text' | 'image' | 'system';
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface CommunityInviteItem {
  id: number;
  communityId: number;
  communityName: string;
  communitySlug: string;
  communityAvatar?: string;
  inviterId: number;
  inviterName: string;
  inviterUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface CommunityModerationLogItem {
  id: number;
  communityId: number;
  moderatorId: number;
  moderatorName?: string;
  action: string;
  targetType: string;
  targetId: number;
  reason?: string;
  createdAt: string;
}

export interface CommunityAnalyticsData {
  totalMembers: number;
  activeMembers: number;
  bannedMembers: number;
  totalPosts: number;
  totalEvents: number;
  totalMessages: number;
  totalRsvps: number;
  recentJoinCount: number;
}

export interface CreateCommunityInput {
  name: string;
  description?: string;
  categoryId: number;
  visibility?: CommunityVisibility;
  joinPolicy?: CommunityJoinPolicy;
  avatarImage?: string;
  coverImage?: string;
  rulesText?: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  coverImage?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  locationType?: EventLocationType;
  locationName?: string;
  onlineMeetingUrl?: string;
  maxAttendees?: number;
}
