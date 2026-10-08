import React, { useState } from 'react';
import { ArrowLeft, User as UserIcon, Phone, Video, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ConversationPartner } from '../../types/chat';
import VerificationBadge from '../profile/VerificationBadge';
import { useCall } from '../../context/CallContext';
import ConversationCallHistoryModal from '../calling/ConversationCallHistoryModal';
import { getMediaUrl } from '../../utils/media';

interface ChatHeaderProps {
  partner: ConversationPartner;
  matchId: number;
  conversationId?: number;
  onBackMobile: () => void;
  isConnected: boolean;
  isTyping?: boolean;
  typingUserName?: string;
}

const formatLastSeen = (lastSeenAt?: string | null): string => {
  if (!lastSeenAt) return 'Offline';
  try {
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Last seen yesterday';
    if (diffDays < 7) {
      return `Last seen ${date.toLocaleDateString([], { weekday: 'short' })}`;
    }
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Offline';
  }
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  partner,
  matchId,
  conversationId,
  onBackMobile,
  isConnected,
  isTyping = false,
  typingUserName,
}) => {
  const { startCall, callState } = useCall();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const resolvePartnerId = (): number | null => {
    const raw =
      partner?.id ??
      (partner as any)?.userId ??
      (partner as any)?.user_id ??
      (partner as any)?.partner_id ??
      (partner as any)?.partnerId;
    const num = Number(raw);
    return Number.isInteger(num) && num > 0 ? num : null;
  };

  const handleStartAudioCall = () => {
    const partnerId = resolvePartnerId();
    if (!partnerId) {
      alert('Unable to start audio call: invalid recipient ID.');
      return;
    }
    const safeMatchId = matchId && Number.isInteger(Number(matchId)) ? Number(matchId) : undefined;
    const safeConvId = conversationId && Number.isInteger(Number(conversationId)) ? Number(conversationId) : undefined;

    startCall(
      partnerId,
      'audio',
      {
        id: partnerId,
        firstName: partner.firstName || 'Member',
        photoUrl: getMediaUrl((partner as any).avatarUrl || (partner as any).photoUrl || partner.primaryPhoto?.fileUrl),
      },
      safeMatchId,
      safeConvId
    );
  };

  const handleStartVideoCall = () => {
    const partnerId = resolvePartnerId();
    if (!partnerId) {
      alert('Unable to start video call: invalid recipient ID.');
      return;
    }
    const safeMatchId = matchId && Number.isInteger(Number(matchId)) ? Number(matchId) : undefined;
    const safeConvId = conversationId && Number.isInteger(Number(conversationId)) ? Number(conversationId) : undefined;

    startCall(
      partnerId,
      'video',
      {
        id: partnerId,
        firstName: partner.firstName || 'Member',
        photoUrl: getMediaUrl((partner as any).avatarUrl || (partner as any).photoUrl || partner.primaryPhoto?.fileUrl),
      },
      safeMatchId,
      safeConvId
    );
  };

  const rawAvatar =
    (partner as any).avatarUrl ||
    (partner as any).photoUrl ||
    partner.primaryPhoto?.fileUrl;
  const avatarUrl =
    getMediaUrl(rawAvatar) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <button
          type="button"
          className="chat-back-btn"
          onClick={onBackMobile}
          aria-label="Back to conversations list"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="chat-header-avatar-wrap">
          <img
            src={avatarUrl}
            alt={partner.firstName}
            className="chat-header-avatar"
          />
          {partner.isOnline !== undefined && (
            <span
              className={`conv-online-dot ${partner.isOnline ? 'online pulse' : 'offline'}`}
              style={{
                background: partner.isOnline ? '#10b981' : '#6b7280',
                boxShadow: partner.isOnline ? '0 0 8px rgba(16, 185, 129, 0.7)' : 'none',
              }}
            />
          )}
        </div>

        <div className="chat-header-meta">
          <div className="chat-header-name-row">
            <h2 className="chat-header-name">{partner.firstName}</h2>
            {partner.age && <span className="chat-header-age">, {partner.age}</span>}
            {partner.isVerified && <VerificationBadge isVerified={true} size="sm" />}
          </div>

          <div className="chat-header-status">
            {isTyping ? (
              <div className="typing-header-text">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span>{typingUserName || partner.firstName} is typing...</span>
              </div>
            ) : isConnected ? (
              partner.isOnline ? (
                <>
                  <span className="status-dot-mini online" />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Online</span>
                </>
              ) : (
                <span>{formatLastSeen(partner.lastSeenAt)}</span>
              )
            ) : (
              <>
                <span className="status-dot-mini offline" />
                <span style={{ color: '#f59e0b' }}>Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="chat-header-right">
        <button
          type="button"
          className="chat-call-btn audio-btn"
          onClick={handleStartAudioCall}
          disabled={callState !== 'idle'}
          title={`Start audio call with ${partner.firstName}`}
          aria-label={`Start audio call with ${partner.firstName}`}
        >
          <Phone size={16} />
        </button>

        <button
          type="button"
          className="chat-call-btn video-btn"
          onClick={handleStartVideoCall}
          disabled={callState !== 'idle'}
          title={`Start video call with ${partner.firstName}`}
          aria-label={`Start video call with ${partner.firstName}`}
        >
          <Video size={16} />
        </button>

        <Link
          to={`/profile/${resolvePartnerId() ?? ''}`}
          className="chat-view-profile-btn"
          title="View User Profile"
        >
          <UserIcon size={14} />
          <span>Profile</span>
        </Link>

        {conversationId && Number.isInteger(Number(conversationId)) && Number(conversationId) > 0 && (
          <button
            type="button"
            className="chat-call-btn"
            onClick={() => setIsHistoryOpen(true)}
            title="View Call History"
            aria-label="View Call History"
          >
            <History size={16} />
          </button>
        )}
      </div>

      {conversationId && Number.isInteger(Number(conversationId)) && Number(conversationId) > 0 && (
        <ConversationCallHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          conversationId={Number(conversationId)}
          partnerName={partner.firstName}
        />
      )}
    </div>
  );
};

export default ChatHeader;
