// Chat, Conversations, Members, Messages & Reactions Domain Types

export interface ConversationRow {
  id: number;
  match_id: number;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface ConversationMemberRow {
  conversation_id: number;
  user_id: number;
  joined_at: string;
  last_read_message_id: number | null;
}

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'deleted';

export interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  message_text: string | null;
  media_url: string | null;
  reply_to_message_id: number | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MessageReactionRow {
  id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
}

// Day 12 & 13 Real-Time Chat API & DTO Types

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

export interface MessagesPaginationResponse {
  messages: MessageItem[];
  hasMore: boolean;
  nextCursor?: number | null;
  total?: number;
}

export interface PresencePayload {
  userId: number;
  isOnline: boolean;
  lastSeenAt?: string | null;
}

export interface TypingPayload {
  conversationId: number;
  userId: number;
  isTyping: boolean;
  userName?: string;
}

export interface ReactionUpdatePayload {
  conversationId: number;
  messageId: number;
  reactions: ReactionGroup[];
  userId: number;
  action: 'added' | 'removed' | 'updated';
  reaction: string;
}
