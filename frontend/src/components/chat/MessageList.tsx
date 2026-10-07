import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatEmptyState from './ChatEmptyState';
import MessageSkeleton from './MessageSkeleton';
import type { MessageItem, ConversationPartner } from '../../types/chat';

interface MessageListProps {
  messages: MessageItem[];
  partner: ConversationPartner;
  currentUserId?: number | null;
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  onLoadOlder: () => Promise<void>;
  onSendIcebreaker?: (text: string) => void;
  onReact?: (messageId: number, reaction: string) => void;
  isTyping?: boolean;
  typingUserName?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  partner,
  currentUserId,
  loading,
  loadingOlder,
  hasMore,
  onLoadOlder,
  onSendIcebreaker,
  onReact,
  isTyping = false,
  typingUserName,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState<number | null>(null);

  // Check if user is scrolled near bottom (within 100px)
  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
      setShowScrollBottomPill(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (isNearBottom()) {
      setShowScrollBottomPill(false);
    }
  };

  // Scroll to bottom on initial message load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [loading]);

  // When new messages arrive (scroll down only if already near bottom)
  useEffect(() => {
    if (messages.length === 0) return;
    if (isNearBottom()) {
      scrollToBottom('smooth');
    } else {
      setShowScrollBottomPill(true);
    }
  }, [messages.length]);

  // Preserve scroll position when older messages are loaded at top
  useLayoutEffect(() => {
    if (prevScrollHeight !== null && containerRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeight;
      containerRef.current.scrollTop += heightDiff;
      setPrevScrollHeight(null);
    }
  }, [messages, prevScrollHeight]);

  const handleLoadOlder = async () => {
    if (containerRef.current) {
      setPrevScrollHeight(containerRef.current.scrollHeight);
    }
    await onLoadOlder();
  };

  if (loading) {
    return (
      <div className="chat-messages-container">
        <MessageSkeleton />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="chat-messages-container">
        <ChatEmptyState
          type="empty-conversation"
          partner={partner}
          onSendIcebreaker={onSendIcebreaker}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="chat-messages-container"
    >
      {/* Pagination: Load Older Messages */}
      {hasMore && (
        <div className="chat-load-older-wrap">
          <button
            type="button"
            onClick={handleLoadOlder}
            disabled={loadingOlder}
            className="chat-load-older-btn"
          >
            {loadingOlder ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={13} className="animate-spin" /> Loading older messages...
              </span>
            ) : (
              '↑ Load older messages'
            )}
          </button>
        </div>
      )}

      {/* Render All Chronological Messages */}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          currentUserId={currentUserId}
          onReact={onReact}
        />
      ))}

      {/* Animated Typing Bubble in Message Stream */}
      {isTyping && (
        <div className="message-bubble-row from-partner">
          <div
            className="typing-indicator-bubble"
            title={`${typingUserName || partner.firstName} is typing...`}
          >
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}

      <div ref={bottomAnchorRef} style={{ height: 1 }} />

      {/* Floating Scroll-Down Indicator when new messages are received while scrolled up */}
      {showScrollBottomPill && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="chat-scroll-bottom-pill"
          aria-label="Scroll to newest messages"
        >
          <span>↓ New message</span>
          <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
};

export default MessageList;
