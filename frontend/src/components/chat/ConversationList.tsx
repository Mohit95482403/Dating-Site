import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConversationListItem from './ConversationListItem';
import type { ConversationItem } from '../../types/chat';

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId: number | null;
  loading: boolean;
  onSelectConversation: (conversation: ConversationItem) => void;
  isMobileHidden?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  loading,
  onSelectConversation,
  isMobileHidden = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by partner's name
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((c) =>
      c.otherUser.firstName.toLowerCase().includes(query) ||
      (c.otherUser.lastName && c.otherUser.lastName.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  return (
    <aside className={`chat-sidebar ${isMobileHidden ? 'mobile-hidden' : ''}`}>
      {/* Sidebar Header */}
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-title-row">
          <h2 className="chat-sidebar-title">
            <MessageSquare size={20} className="text-pink-500" />
            <span>Messages</span>
          </h2>
          {totalUnread > 0 && (
            <span className="chat-sidebar-unread-pill">
              {totalUnread} new
            </span>
          )}
        </div>

        {/* Conversation Search Bar */}
        <div className="chat-search-wrapper">
          <Search size={16} className="chat-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="chat-search-input"
            aria-label="Search conversations by name"
          />
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="chat-conversations-list">
        {loading ? (
          // Skeleton Loading Items
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={`conv-skel-${idx}`} className="skeleton-conv-item">
              <div className="skeleton-pulse skeleton-conv-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skeleton-pulse skeleton-conv-line-1" />
                <div className="skeleton-pulse skeleton-conv-line-2" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          // No Conversations Empty State
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,51,102,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#ff3366',
              }}
            >
              <Heart size={22} />
            </div>
            <p style={{ fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
              No conversations yet
            </p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '1.25rem' }}>
              Match with someone special on the Discovery page to start chatting!
            </p>
            <Link
              to="/discover"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #ff3366, #e6005c)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.5rem 1rem',
                borderRadius: '0.65rem',
              }}
            >
              Discover People
            </Link>
          </div>
        ) : filteredConversations.length === 0 ? (
          // No Search Match Empty State
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
            No conversations matching "{searchQuery}"
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationListItem
              key={conv.conversationId}
              conversation={conv}
              isActive={activeConversationId === conv.conversationId}
              onSelect={onSelectConversation}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default ConversationList;
