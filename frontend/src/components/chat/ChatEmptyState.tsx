import React from 'react';
import { Sparkles, Heart } from 'lucide-react';
import type { ConversationPartner } from '../../types/chat';
import { getMediaUrl } from '../../utils/media';

interface ChatEmptyStateProps {
  type: 'no-selection' | 'empty-conversation';
  partner?: ConversationPartner;
  onSendIcebreaker?: (text: string) => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  type,
  partner,
  onSendIcebreaker,
}) => {
  if (type === 'no-selection') {
    return (
      <div className="chat-no-selection-state">
        <div className="chat-no-selection-icon-wrap">
          <div className="chat-no-selection-glow" />
          <Heart size={34} className="chat-no-selection-heart" fill="currentColor" />
        </div>
        <h3 className="chat-no-selection-title">Connect with someone</h3>
        <p className="chat-no-selection-desc">
          Choose a conversation to start chatting in real time.
        </p>
      </div>
    );
  }

  const rawAvatar =
    (partner as any)?.avatarUrl ||
    (partner as any)?.photoUrl ||
    partner?.primaryPhoto?.fileUrl;
  const avatarUrl =
    getMediaUrl(rawAvatar) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  return (
    <div className="chat-empty-convo">
      <div className="chat-empty-avatar-wrap">
        <img
          src={avatarUrl}
          alt={partner?.firstName || 'Partner'}
          className="chat-empty-avatar"
        />
      </div>
      <h3 className="chat-empty-title">
        Start the conversation with {partner?.firstName || 'your match'}!
      </h3>
      <p className="chat-empty-desc">
        Say hello and start getting to know each other. Your connection is mutual and verified.
      </p>

      {onSendIcebreaker && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <button
            type="button"
            className="chat-empty-icebreaker"
            onClick={() => onSendIcebreaker(`Hey ${partner?.firstName || ''}! How is your day going? 👋`)}
          >
            <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
            "Hey {partner?.firstName || ''}! How's your day going? 👋"
          </button>
          <button
            type="button"
            className="chat-empty-icebreaker"
            onClick={() => onSendIcebreaker("Nice to match with you! What are you up to this week? ✨")}
          >
            <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
            "Nice to match with you! What are you up to this week? ✨"
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatEmptyState;
