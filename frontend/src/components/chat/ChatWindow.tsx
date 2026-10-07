import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ChatEmptyState from './ChatEmptyState';
import chatService from '../../services/chat.service';
import { useSocket } from '../../hooks/useSocket';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type {
  ConversationItem,
  MessageItem,
  PresenceUpdatePayload,
  ReactionGroup,
} from '../../types/chat';

interface ChatWindowProps {
  conversation: ConversationItem | null;
  onBackMobile: () => void;
  onUpdateConversation?: (conversationId: number, message: MessageItem) => void;
  isMobileHidden?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBackMobile,
  onUpdateConversation,
  isMobileHidden = false,
}) => {
  const { socket, isConnected, refreshUnreadCount } = useSocket();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Typing state
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerTypingName, setPartnerTypingName] = useState<string | undefined>(undefined);
  const typingSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live partner presence state
  const [partnerPresence, setPartnerPresence] = useState({
    isOnline: conversation?.otherUser.isOnline ?? false,
    lastSeenAt: conversation?.otherUser.lastSeenAt ?? null,
  });

  // Sync initial presence when conversation changes
  useEffect(() => {
    if (conversation?.otherUser) {
      setPartnerPresence({
        isOnline: conversation.otherUser.isOnline ?? false,
        lastSeenAt: conversation.otherUser.lastSeenAt ?? null,
      });
      setIsPartnerTyping(false);
    }
  }, [conversation?.conversationId, conversation?.otherUser.isOnline, conversation?.otherUser.lastSeenAt]);

  // Fetch initial messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!conversation) return;
    setLoading(true);
    setError(null);

    try {
      const data = await chatService.getMessages(conversation.conversationId, { limit: 30 });
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor ?? null);

      // Mark messages as read on open
      await chatService.markAsRead(conversation.conversationId);
      refreshUnreadCount();
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err?.response?.data?.message || 'Unable to load conversation messages.');
    } finally {
      setLoading(false);
    }
  }, [conversation?.conversationId, refreshUnreadCount]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket room join/leave and real-time listeners
  useEffect(() => {
    if (!socket || !conversation) return;

    const convId = conversation.conversationId;
    const partnerId = conversation.otherUser.id;

    // Join conversation room
    socket.emit('conversation:join', { conversationId: convId });

    // 1. Handle incoming message
    const handleNewMessage = (payload: { conversationId: number; message: MessageItem }) => {
      if (payload.conversationId !== convId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) {
          return prev;
        }
        return [...prev, payload.message];
      });

      if (onUpdateConversation) {
        onUpdateConversation(convId, payload.message);
      }

      // If incoming from partner, send delivery acknowledgment and mark as read
      if (!payload.message.isFromMe) {
        socket.emit('message:delivered', {
          messageId: payload.message.id,
          conversationId: convId,
        });
        chatService.markAsRead(convId).catch(() => {});
        refreshUnreadCount();
      }
    };

    // 2. Handle typing updates
    const handleTypingUpdate = (payload: {
      conversationId: number;
      userId: number;
      isTyping: boolean;
      userName?: string;
    }) => {
      if (payload.conversationId !== convId || payload.userId === conversation.otherUser.id === false) {
        return;
      }

      if (payload.isTyping) {
        setIsPartnerTyping(true);
        setPartnerTypingName(payload.userName);

        if (typingSafetyTimeoutRef.current) clearTimeout(typingSafetyTimeoutRef.current);
        typingSafetyTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 4000);
      } else {
        if (typingSafetyTimeoutRef.current) clearTimeout(typingSafetyTimeoutRef.current);
        setIsPartnerTyping(false);
      }
    };

    // 3. Handle message delivery status updates
    const handleMessageStatus = (payload: {
      conversationId: number;
      messageId: number;
      status: 'delivered' | 'read';
    }) => {
      if (payload.conversationId !== convId) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, status: payload.status } : m))
      );
    };

    // 4. Handle message read receipts
    const handleMessageRead = (payload: { conversationId: number; readerId: number }) => {
      if (payload.conversationId !== convId) return;

      // Mark all outgoing messages as read
      setMessages((prev) =>
        prev.map((m) => (m.isFromMe ? { ...m, status: 'read' } : m))
      );
    };

    // 5. Handle message reactions
    const handleMessageReaction = (payload: {
      conversationId: number;
      messageId: number;
      reactions: ReactionGroup[];
    }) => {
      if (payload.conversationId !== convId) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    };

    // 6. Handle presence update for active partner
    const handlePresenceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PresenceUpdatePayload>;
      if (!customEvent.detail || customEvent.detail.userId !== partnerId) return;

      setPartnerPresence({
        isOnline: customEvent.detail.isOnline,
        lastSeenAt: customEvent.detail.lastSeenAt || null,
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('message:status', handleMessageStatus);
    socket.on('message:read', handleMessageRead);
    socket.on('message:reaction', handleMessageReaction);
    window.addEventListener('connectly:presence-update', handlePresenceUpdate);

    return () => {
      socket.emit('typing:stop', { conversationId: convId });
      socket.emit('conversation:leave', { conversationId: convId });
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('message:status', handleMessageStatus);
      socket.off('message:read', handleMessageRead);
      socket.off('message:reaction', handleMessageReaction);
      window.removeEventListener('connectly:presence-update', handlePresenceUpdate);
      if (typingSafetyTimeoutRef.current) clearTimeout(typingSafetyTimeoutRef.current);
    };
  }, [socket, conversation?.conversationId, conversation?.otherUser.id, onUpdateConversation, refreshUnreadCount]);

  // Load older messages (pagination)
  const handleLoadOlder = async () => {
    if (!conversation || !hasMore || !nextCursor || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const data = await chatService.getMessages(conversation.conversationId, {
        limit: 30,
        cursor: nextCursor,
      });

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = data.messages.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Send message
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!conversation) return false;

    try {
      const createdMessage = await chatService.sendMessage(conversation.conversationId, content);

      setMessages((prev) => {
        if (prev.some((m) => m.id === createdMessage.id)) {
          return prev;
        }
        return [...prev, createdMessage];
      });

      if (onUpdateConversation) {
        onUpdateConversation(conversation.conversationId, createdMessage);
      }

      return true;
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err?.response?.data?.message || 'Failed to send message. Please try again.');
      return false;
    }
  };

  // Typing start & stop emitters
  const handleTypingStart = () => {
    if (socket && conversation) {
      socket.emit('typing:start', { conversationId: conversation.conversationId });
    }
  };

  const handleTypingStop = () => {
    if (socket && conversation) {
      socket.emit('typing:stop', { conversationId: conversation.conversationId });
    }
  };

  // Reaction handler
  const handleReact = async (messageId: number, reactionEmoji: string) => {
    if (!conversation) return;

    try {
      const res = await chatService.toggleReaction(messageId, reactionEmoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m))
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  if (!conversation) {
    return (
      <main className={`chat-window ${isMobileHidden ? 'mobile-hidden' : ''}`}>
        <ChatEmptyState type="no-selection" />
      </main>
    );
  }

  const partnerWithLivePresence = {
    ...conversation.otherUser,
    isOnline: partnerPresence.isOnline,
    lastSeenAt: partnerPresence.lastSeenAt,
  };

  return (
    <main className={`chat-window ${isMobileHidden ? 'mobile-hidden' : ''}`}>
      {/* Active Chat Header with Live Presence and Typing Indicator */}
      <ChatHeader
        partner={partnerWithLivePresence}
        matchId={conversation.matchId}
        conversationId={conversation.conversationId}
        onBackMobile={onBackMobile}
        isConnected={isConnected}
        isTyping={isPartnerTyping}
        typingUserName={partnerTypingName}
      />

      {/* Error State with Retry Button */}
      {error ? (
        <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem', maxWidth: '360px' }}>
          <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 0.85rem' }} />
          <h4 style={{ color: '#ffffff', fontWeight: 700, marginBottom: '0.4rem' }}>
            Unable to load messages
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchMessages}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: 'rgba(255,51,102,0.15)',
              border: '1px solid rgba(255,51,102,0.3)',
              borderRadius: '0.65rem',
              color: '#ff4d79',
              fontWeight: 700,
              fontSize: '0.84rem',
            }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        /* Messages Scrollable Area */
        <MessageList
          messages={messages}
          partner={partnerWithLivePresence}
          loading={loading}
          loadingOlder={loadingOlder}
          hasMore={hasMore}
          onLoadOlder={handleLoadOlder}
          onSendIcebreaker={handleSendMessage}
          onReact={handleReact}
          isTyping={isPartnerTyping}
          typingUserName={partnerTypingName}
        />
      )}

      {/* Message Composer with Typing Detection and AI Assistant */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={loading || !!error}
        conversationId={conversation.conversationId}
        partnerName={conversation.otherUser.firstName}
        hasMessages={messages.length > 0}
        targetUserId={conversation.otherUser.id}
      />
    </main>
  );
};

export default ChatWindow;
