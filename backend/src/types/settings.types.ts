// Day 15 Settings Domain Types

export interface UserSettings {
  id: number;
  userId: number;
  profileVisibility: 'public' | 'hidden' | 'matches_only';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  showInDiscovery: boolean;
  useLocationForDiscovery: boolean;
  notifyMatches: boolean;
  notifyMessages: boolean;
  notifyLikes: boolean;
  notifySuperLikes: boolean;
  notifyReactions: boolean;
  notifySystem: boolean;
  locationVisibility?: 'city_only' | 'approximate' | 'hidden';
  messagePermissions?: 'everyone' | 'matches_only' | 'verified_only';
  callPermissions?: 'matches_only' | 'verified_only' | 'nobody';
  aiDataProcessing?: boolean;
  searchVisibility?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UpdateSettingsInput = Partial<
  Pick<
    UserSettings,
    | 'profileVisibility'
    | 'showOnlineStatus'
    | 'showLastSeen'
    | 'showReadReceipts'
    | 'showTypingIndicator'
    | 'showInDiscovery'
    | 'useLocationForDiscovery'
    | 'notifyMatches'
    | 'notifyMessages'
    | 'notifyLikes'
    | 'notifySuperLikes'
    | 'notifyReactions'
    | 'notifySystem'
    | 'locationVisibility'
    | 'messagePermissions'
    | 'callPermissions'
    | 'aiDataProcessing'
    | 'searchVisibility'
  >
>;

export interface AccountInfo {
  id: number;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  isEmailVerified: boolean;
  role: string;
  status: string;
  createdAt: string;
}

export interface UpdateAccountInput {
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  dateOfBirth?: string | null;
  email?: string;
  currentPassword?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BlockedUserItem {
  id: number;
  userId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  blockedAt: string;
  reason: string | null;
}

export interface ActiveSessionItem {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string;
  os: string;
  device: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface DeleteAccountInput {
  password: string;
  confirmation: string;
}
