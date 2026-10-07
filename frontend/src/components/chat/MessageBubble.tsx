import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Smile } from 'lucide-react';
import type { MessageItem } from '../../types/chat';

interface MessageBubbleProps {
  message: MessageItem;
  onReact?: (messageId: number, reaction: string) => void;
}

const EMOJI_OPTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥'] as const;

const formatMessageTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString([], { weekday: 'short' });
      return `${weekday}, ${timeStr}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return '';
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const isFromMe = message.isFromMe;
  const timeFormatted = formatMessageTime(message.createdAt);
  const reactions = message.reactions || [];

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const handleSelectReaction = (emoji: string) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
    setShowPicker(false);
  };

  return (
    <div
      className={`message-bubble-row ${isFromMe ? 'from-me' : 'from-partner'}`}
      data-message-id={message.id}
    >
      {/* Reaction Hover / Mobile Trigger Button */}
      {onReact && (
        <div className="message-action-trigger">
          <button
            type="button"
            className="reaction-trigger-btn"
            onClick={() => setShowPicker(!showPicker)}
            title="Add reaction"
            aria-label="React to message"
          >
            <Smile size={14} />
          </button>
        </div>
      )}

      {/* Floating Reaction Picker */}
      {showPicker && (
        <div ref={pickerRef} className="reaction-picker-bar">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="reaction-emoji-btn"
              onClick={() => handleSelectReaction(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Content Container */}
      <div className="message-bubble-content-wrap">
        <div className={`message-bubble ${isFromMe ? 'from-me' : 'from-partner'}`}>
          {message.content}
        </div>

        {/* Reaction Summary Pills */}
        {reactions.length > 0 && (
          <div className="message-reactions-row">
            {reactions.map((grp) => (
              <button
                key={grp.reaction}
                type="button"
                className={`reaction-chip ${grp.hasReacted ? 'active-reaction' : ''}`}
                onClick={() => onReact && onReact(message.id, grp.reaction)}
                title={`${grp.users.map((u) => u.firstName || 'User').join(', ')}`}
                aria-label={`Reaction ${grp.reaction}, count ${grp.count}`}
              >
                <span className="reaction-chip-emoji">{grp.reaction}</span>
                <span className="reaction-chip-count">{grp.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Message Timestamp & Delivery / Read Receipt Icons */}
        <div className="message-meta-row">
          <span className="message-time-meta">{timeFormatted}</span>

          {isFromMe && (
            <span
              className={`message-status-icon ${message.status}`}
              title={message.status === 'read' ? 'Read' : message.status === 'delivered' ? 'Delivered' : 'Sent'}
            >
              {message.status === 'read' || message.status === 'delivered' ? (
                <CheckCheck size={14} />
              ) : (
                <Check size={12} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
