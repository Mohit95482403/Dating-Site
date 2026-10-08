import React from 'react';
import { Link } from 'react-router-dom';
import type { MatchItem } from '../../types/match';
import { MapPin, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import './Matches.css';

interface MatchCardProps {
  match: MatchItem;
  onUnmatchClick?: (match: MatchItem) => void;
}

export const formatMatchedTime = (isoString?: string): string => {
  if (!isoString) return 'Recently';
  try {
    const matchedDate = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - matchedDate.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return matchedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { user, matchedAt } = match;

  const rawUrl =
    user.avatarUrl ||
    user.photoUrl ||
    user.primaryPhoto?.fileUrl ||
    user.photos?.[0]?.fileUrl;
  const photoUrl =
    getMediaUrl(rawUrl) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80';

  const locationText = [user.location?.city, user.location?.state]
    .filter(Boolean)
    .join(', ') || 'Nearby';

  return (
    <div className="match-card">
      {/* Photo Container */}
      <div className="match-card-photo-wrapper">
        <img
          src={photoUrl}
          alt={user.firstName}
          className="match-card-photo"
          loading="lazy"
        />
        <div className="match-card-overlay" />

        {/* Card Overlay Badges */}
        <div className="match-card-badge-row">
          {user.isVerified && (
            <span className="match-pill-verified" title="Verified Member">
              <CheckCircle size={12} />
              <span>Verified</span>
            </span>
          )}
          <span className="match-pill-time">
            Matched {formatMatchedTime(matchedAt)}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="match-card-body">
        <div className="match-card-user-info">
          <div className="match-card-name-row">
            <h3 className="match-card-name">{user.firstName}</h3>
            {user.age && <span className="match-card-age">, {user.age}</span>}
          </div>

          <p className="match-card-location">
            <MapPin size={13} className="text-pink-400" />
            <span>{locationText}</span>
          </p>

          {user.bio && (
            <p className="match-card-bio" title={user.bio}>
              {user.bio}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="match-card-actions">
          <Link
            to={`/matches/${match.id}`}
            className="match-btn-profile"
            aria-label={`Open profile of ${user.firstName}`}
          >
            <ExternalLink size={14} />
            <span>Profile</span>
          </Link>

          <Link
            to={`/messages?matchId=${match.id}`}
            className="match-btn-chat"
            aria-label={`Chat with ${user.firstName}`}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;
