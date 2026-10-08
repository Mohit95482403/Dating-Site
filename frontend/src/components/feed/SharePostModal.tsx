import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Check, User } from 'lucide-react';
import type { PostItem } from '../../types/feed';
import { chatService } from '../../services/chat.service';
import type { ConversationItem } from '../../types/chat';
import { getMediaUrl } from '../../utils/media';

interface SharePostModalProps {
  post: PostItem;
  onClose: () => void;
  onShared?: () => void;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  post,
  onClose,
  onShared,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [sharedIds, setSharedIds] = useState<number[]>([]);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    let isMounted = true;
    chatService
      .getConversations()
      .then((data) => {
        if (isMounted) setConversations(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleShare = async (conv: ConversationItem) => {
    try {
      setSharingId(conv.id);
      const postSnippet = post.content ? ` "${post.content.slice(0, 80)}..."` : '';
      const text = customNote.trim()
        ? `${customNote.trim()}\n\nShared post from ${post.author.firstName}:${postSnippet}\n[Post #${post.id}]`
        : `Shared post from ${post.author.firstName}:${postSnippet}\n[Post #${post.id}]`;

      await chatService.sendMessage(conv.id, text);
      setSharedIds((prev) => [...prev, conv.id]);
      if (onShared) onShared();
    } catch {
      alert('Failed to share to conversation.');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="feed-modal-backdrop" onClick={onClose}>
      <div className="feed-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="feed-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="var(--accent-pink)" />
            <h3 className="feed-modal-title">Share to Chat</h3>
          </div>
          <button type="button" className="feed-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Optional Note */}
        <input
          type="text"
          className="comment-input-field"
          placeholder="Add an optional message..."
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          maxLength={200}
        />

        {/* Conversations list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {loading && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
              Loading matches & conversations...
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
              No active conversations yet. Match with someone first to share posts!
            </div>
          )}

          {conversations.map((conv) => {
            const isShared = sharedIds.includes(conv.id);
            const isSending = sharingId === conv.id;

            return (
              <div
                key={conv.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {((conv.otherUser as any).avatarUrl || (conv.otherUser as any).photoUrl || conv.otherUser.primaryPhoto?.fileUrl) ? (
                      <img
                        src={getMediaUrl((conv.otherUser as any).avatarUrl || (conv.otherUser as any).photoUrl || conv.otherUser.primaryPhoto?.fileUrl)}
                        alt={conv.otherUser.firstName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <User size={18} color="#94a3b8" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {conv.otherUser.firstName} {conv.otherUser.lastName}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={isShared ? 'comment-like-btn liked' : 'composer-media-btn'}
                  onClick={() => handleShare(conv)}
                  disabled={isShared || isSending}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {isShared ? (
                    <>
                      <Check size={14} /> Sent
                    </>
                  ) : isSending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send size={14} /> Send
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;
