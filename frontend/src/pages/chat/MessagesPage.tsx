import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import chatService from '../../services/chat.service';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { isMessageFromCurrentUser } from '../../utils/helpers';
import type { ConversationItem, MessageItem } from '../../types/chat';
import '../../components/chat/Chat.css';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id != null ? Number(user.id) : null;
  const currentUserIdRef = useRef<number | null>(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUnreadCount } = useSocket();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);

  const parsedConvId = useMemo(() => {
    return conversationId ? parseInt(conversationId, 10) : null;
  }, [conversationId]);

  // Set document title
  useEffect(() => {
    document.title = activeConversation
      ? `Chat with ${activeConversation.otherUser.firstName} | Connectly`
      : 'Messages | Connectly Real-Time Chat';
  }, [activeConversation]);

  // Fetch all conversations for user
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await chatService.getConversations();
      const normalizedConversations = (data || []).map((conv) => {
        if (conv.lastMessage) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              isFromMe: isMessageFromCurrentUser(conv.lastMessage.senderId, currentUserIdRef.current),
            },
          };
        }
        return conv;
      });
      setConversations(normalizedConversations);
      return normalizedConversations;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle ?matchId query param (e.g. redirected from MatchesPage or MatchCard)
  useEffect(() => {
    const matchIdParam = searchParams.get('matchId');
    if (!matchIdParam) return;

    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId) || matchId <= 0) return;

    const initMatchConversation = async () => {
      try {
        const convo = await chatService.getOrCreateForMatch(matchId);
        // Clear matchId from URL and navigate to clean /messages/:id
        searchParams.delete('matchId');
        setSearchParams(searchParams, { replace: true });

        // Update local list if not present
        setConversations((prev) => {
          if (prev.some((c) => c.conversationId === convo.conversationId)) {
            return prev;
          }
          return [convo, ...prev];
        });

        setActiveConversation(convo);
        navigate(`/messages/${convo.conversationId}`, { replace: true });
      } catch (err) {
        console.error('Failed to initialize conversation for match:', err);
      }
    };

    initMatchConversation();
  }, [searchParams, setSearchParams, navigate]);

  // Sync activeConversation with URL conversationId param
  useEffect(() => {
    if (!parsedConvId) {
      setActiveConversation(null);
      return;
    }

    // Try finding in loaded conversations list
    const found = conversations.find((c) => c.conversationId === parsedConvId);
    if (found) {
      setActiveConversation(found);
    } else if (!loadingConversations) {
      // If not in list, fetch single conversation directly (guards against deep links)
      chatService
        .getConversation(parsedConvId)
        .then((convo) => {
          setActiveConversation(convo);
          setConversations((prev) => {
            if (prev.some((c) => c.conversationId === convo.conversationId)) return prev;
            return [convo, ...prev];
          });
        })
        .catch((err) => {
          console.error('Conversation access error:', err);
          navigate('/messages', { replace: true });
        });
    }
  }, [parsedConvId, conversations, loadingConversations, navigate]);

  // Select conversation from sidebar
  const handleSelectConversation = (conversation: ConversationItem) => {
    setActiveConversation(conversation);
    navigate(`/messages/${conversation.conversationId}`);
  };

  // Mobile Back button: deselect conversation to show sidebar
  const handleBackMobile = () => {
    setActiveConversation(null);
    navigate('/messages');
  };

  // Update conversation list preview when message sent or received
  const handleUpdateConversation = useCallback(
    (convId: number, message: MessageItem) => {
      const isFromCurrent = isMessageFromCurrentUser(message.senderId, currentUserIdRef.current);

      setConversations((prev) => {
        const targetIndex = prev.findIndex((c) => c.conversationId === convId);
        if (targetIndex === -1) return prev;

        const target = prev[targetIndex];
        const isCurrentActive = activeConversation?.conversationId === convId;

        const updated: ConversationItem = {
          ...target,
          lastMessage: {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType,
            createdAt: message.createdAt,
            isFromMe: isFromCurrent,
          },
          lastMessageTime: message.createdAt,
          unreadCount: isCurrentActive || isFromCurrent ? 0 : target.unreadCount + 1,
          updatedAt: message.createdAt,
        };

        // Move to top of conversations list
        const remaining = prev.filter((c) => c.conversationId !== convId);
        return [updated, ...remaining];
      });

      refreshUnreadCount();
    },
    [activeConversation?.conversationId, refreshUnreadCount]
  );

  // Listen for global real-time message events received outside active room
  useEffect(() => {
    const handleIncomingGlobalMessage = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: number; message: MessageItem }>;
      if (!customEvent.detail) return;
      const { conversationId: msgConvId, message } = customEvent.detail;

      // Update conversations list preview
      handleUpdateConversation(msgConvId, message);
    };

    window.addEventListener('connectly:message-received', handleIncomingGlobalMessage);

    // Real-time presence listener to update sidebar dots
    const handlePresenceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: number; isOnline: boolean; lastSeenAt?: string | null }>;
      if (!customEvent.detail) return;
      const { userId: presUserId, isOnline, lastSeenAt } = customEvent.detail;

      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser.id === presUserId
            ? {
                ...c,
                otherUser: {
                  ...c.otherUser,
                  isOnline,
                  lastSeenAt: lastSeenAt !== undefined ? lastSeenAt : c.otherUser.lastSeenAt,
                },
              }
            : c
        )
      );
    };

    // Real-time read listener to reset unread count
    const handleReadUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: number }>;
      if (!customEvent.detail) return;
      const { conversationId: readConvId } = customEvent.detail;

      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === readConvId ? { ...c, unreadCount: 0 } : c
        )
      );
    };

    window.addEventListener('connectly:presence-update', handlePresenceUpdate);
    window.addEventListener('connectly:message-read', handleReadUpdate);

    return () => {
      window.removeEventListener('connectly:message-received', handleIncomingGlobalMessage);
      window.removeEventListener('connectly:presence-update', handlePresenceUpdate);
      window.removeEventListener('connectly:message-read', handleReadUpdate);
    };
  }, [handleUpdateConversation]);

  const hasActiveChat = Boolean(activeConversation);

  return (
    <div className="messages-page-wrapper">
      <div className="chat-layout-card">
        {/* Sidebar: Conversation List */}
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.conversationId ?? null}
          loading={loadingConversations}
          onSelectConversation={handleSelectConversation}
          isMobileHidden={hasActiveChat}
        />

        {/* Main Panel: Active Chat Window or Placeholder */}
        <ChatWindow
          conversation={activeConversation}
          onBackMobile={handleBackMobile}
          onUpdateConversation={handleUpdateConversation}
          isMobileHidden={!hasActiveChat}
        />
      </div>
    </div>
  );
};

export default MessagesPage;
