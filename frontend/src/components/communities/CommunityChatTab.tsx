import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import type { CommunityItem, CommunityMessageItem } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { getMediaUrl } from '../../utils/media';

interface CommunityChatTabProps {
  community: CommunityItem;
}

export const CommunityChatTab: React.FC<CommunityChatTabProps> = ({ community }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<CommunityMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = user?.id ? Number(user.id) : null;
  const isMember = community.userMembership?.status === 'active';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await CommunityService.getMessages(community.id);
      setMessages(list);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load group chat.');
    } finally {
      setIsLoading(false);
    }
  }, [community.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Join Community Socket Room and listen for messages
  useEffect(() => {
    if (!socket || !isMember) return;

    socket.emit('community:join', { communityId: community.id });

    const handleNewMessage = (data: any) => {
      if (data?.communityId === community.id && data?.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(scrollToBottom, 50);
      }
    };

    socket.on('community:message', handleNewMessage);

    return () => {
      socket.emit('community:leave', { communityId: community.id });
      socket.off('community:message', handleNewMessage);
    };
  }, [socket, community.id, isMember]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');

    try {
      setIsSending(true);
      const created = await CommunityService.sendMessage(community.id, text);
      setMessages((prev) => [...prev, created]);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isMember) {
    return (
      <div className="community-sidebar-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <MessageSquare size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
        <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>Community Group Chat</h4>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
          Group chat is reserved for active community members. Join this community to participate in discussions!
        </p>
      </div>
    );
  }

  return (
    <div className="community-chat-panel">
      <div className="community-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="#f43f5e" />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
            {community.name} Group Chat
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Real-time active
        </span>
      </div>

      <div className="community-chat-messages">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0 }}>Connecting to group chat...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <p style={{ margin: 0 }}>No messages yet. Say hello to everyone! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className="chat-msg-row"
                style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
              >
                {!isOwn && (
                  <div className="chat-msg-avatar">
                    {msg.senderAvatar ? (
                      <img src={getMediaUrl(msg.senderAvatar)} alt={msg.senderName} />
                    ) : (
                      msg.senderName.charAt(0)
                    )}
                  </div>
                )}

                <div className={`chat-msg-bubble ${isOwn ? 'own' : ''}`}>
                  {!isOwn && (
                    <div className="chat-msg-author">
                      <span>{msg.senderName}</span>
                      {msg.senderRole && msg.senderRole !== 'member' && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(244, 63, 94, 0.2)',
                            color: '#ff4d6d',
                            textTransform: 'uppercase',
                          }}
                        >
                          {msg.senderRole}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="chat-msg-text">{msg.content}</div>
                  <div className="chat-msg-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="community-chat-input-bar" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="community-chat-input"
          placeholder="Message community..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary-gradient"
          style={{ padding: '0 16px' }}
          disabled={!inputText.trim() || isSending}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
