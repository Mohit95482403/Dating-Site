export type MessageType = 'text' | 'image' | 'file' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'deleted';

export interface ReactionUser {
  id: number;
  firstName?: string;
}

export interface ReactionGroup {
  reaction: string;
  count: number;
  users: ReactionUser[];
  hasReacted: boolean;
}

export interface ConversationPartner {
  id: number;
  firstName: string;
  lastName?: string | null;
  age?: number | null;
  primaryPhoto?: {
    id: number;
    fileUrl: string;
  } | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  isVerified?: boolean;
}

export interface LastMessagePreview {
  id: number;
  senderId: number;
  content: string;
  messageType: MessageType;
  createdAt: string;
  isFromMe: boolean;
}

export interface ConversationItem {
  id: number;
  conversationId: number;
  matchId: number;
  otherUser: ConversationPartner;
  lastMessage: LastMessagePreview | null;
  lastMessageTime: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
  isFromMe: boolean;
  reactions?: ReactionGroup[];
}

export interface MessagesPagination {
  messages: MessageItem[];
  hasMore: boolean;
  nextCursor?: number | null;
}

export interface TypingState {
  isTyping: boolean;
  userName?: string;
}

export interface PresenceUpdatePayload {
  userId: number;
  isOnline: boolean;
  lastSeenAt?: string | null;
}

export interface ReactionUpdatePayload {
  conversationId: number;
  messageId: number;
  reactions: ReactionGroup[];
  userId: number;
  action: 'added' | 'removed' | 'updated';
  reaction: string;
}
