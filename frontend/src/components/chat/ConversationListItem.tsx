import React from 'react';
import type { ConversationItem } from '../../types/chat';
import { getMediaUrl } from '../../utils/media';

interface ConversationListItemProps {
  conversation: ConversationItem;
  isActive: boolean;
  onSelect: (conversation: ConversationItem) => void;
}

export const formatConversationTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const isYesterday =
      now.getDate() - date.getDate() === 1 &&
      now.getMonth() === date.getMonth() &&
      now.getFullYear() === date.getFullYear();
    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  onSelect,
}) => {
  const { otherUser, lastMessage, unreadCount, lastMessageTime } = conversation;

  const rawAvatar =
    (otherUser as any).avatarUrl ||
    (otherUser as any).photoUrl ||
    otherUser.primaryPhoto?.fileUrl;
  const avatarUrl =
    getMediaUrl(rawAvatar) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  const previewText = lastMessage
    ? `${lastMessage.isFromMe ? 'You: ' : ''}${lastMessage.content}`
    : 'Matched! Say hello 👋';

  const timeFormatted = formatConversationTime(lastMessageTime || conversation.updatedAt);

  return (
    <div
      className={`conv-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(conversation)}
      data-conversation-id={conversation.conversationId}
    >
      <div className="conv-avatar-wrap">
        <img
          src={avatarUrl}
          alt={otherUser.firstName}
          className="conv-avatar-img"
          loading="lazy"
        />
        {otherUser.isOnline !== undefined && (
          <span
            className={`conv-online-dot ${otherUser.isOnline ? 'online' : 'offline'}`}
            style={{
              background: otherUser.isOnline ? '#10b981' : '#6b7280',
              boxShadow: otherUser.isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
            }}
          />
        )}
      </div>

      <div className="conv-info">
        <div className="conv-top-row">
          <h3 className="conv-name">{otherUser.firstName}</h3>
          <span className="conv-time">{timeFormatted}</span>
        </div>

        <div className="conv-bottom-row">
          <p className={`conv-preview ${unreadCount > 0 ? 'unread-text' : ''}`}>
            {previewText}
          </p>
          {unreadCount > 0 && (
            <span className="conv-unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;
