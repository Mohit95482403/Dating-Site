import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import matchService from '../../services/match.service';
import type { MatchItem } from '../../types/match';
import UnmatchDialog from '../../components/matches/UnmatchDialog';
import { useSocket } from '../../hooks/useSocket';
import { 
  ArrowLeft, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  CheckCircle, 
  Heart, 
  MessageSquare, 
  UserX 
} from 'lucide-react';
import { MatchCompatibilityCard } from '../../components/ai/MatchCompatibilityCard';
import { getMediaUrl } from '../../utils/media';
import '../../components/matches/Matches.css';

export const MatchDetailsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { refreshMatchCount } = useSocket();

  const [match, setMatch] = useState<MatchItem | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unmatch state
  const [isUnmatchOpen, setIsUnmatchOpen] = useState(false);
  const [unmatching, setUnmatching] = useState(false);


  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await matchService.getMatchById(parseInt(matchId, 10));
      setMatch(data);
      setSelectedPhotoIndex(0);
    } catch (err: any) {
      console.error('Failed to load match details:', err);
      setError(
        err?.response?.data?.message ||
        'Unable to load match details. This match may have been removed or access is denied.'
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  const handleConfirmUnmatch = async () => {
    if (!matchId || !match) return;
    setUnmatching(true);

    try {
      await matchService.unmatch(parseInt(matchId, 10));
      await refreshMatchCount();
      setIsUnmatchOpen(false);
      navigate('/matches', { replace: true });
    } catch (err: any) {
      console.error('Unmatch failed:', err);
      alert(err?.response?.data?.message || 'Failed to unmatch connection. Please try again.');
    } finally {
      setUnmatching(false);
    }
  };

  if (loading) {
    return (
      <div className="match-details-container">
        <div className="matches-empty-state">
          <div className="skeleton-photo" style={{ width: 120, height: 120, borderRadius: '50%' }} />
          <h2 className="matches-empty-title" style={{ marginTop: '1.5rem' }}>Loading Match Profile...</h2>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="match-details-container">
        <button
          type="button"
          onClick={() => navigate('/matches')}
          className="match-details-back-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Matches</span>
        </button>

        <div className="matches-empty-state">
          <div className="matches-empty-icon">
            <UserX size={36} />
          </div>
          <h2 className="matches-empty-title">Match Not Found</h2>
          <p className="matches-empty-desc">
            {error || 'This match connection is no longer active.'}
          </p>
          <Link to="/matches" className="matches-empty-btn">
            Return to Matches
          </Link>
        </div>
      </div>
    );
  }

  const { user } = match;
  const photos = user.photos && user.photos.length > 0
    ? user.photos
    : user.primaryPhoto
    ? [user.primaryPhoto]
    : [
        {
          id: 0,
          fileUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
          isPrimary: true,
        },
      ];

  const currentPhoto = photos[selectedPhotoIndex] || photos[0];
  const locationText = [user.location?.city, user.location?.state, user.location?.country]
    .filter(Boolean)
    .join(', ') || 'Location not specified';

  const formattedDate = match.matchedAt
    ? new Date(match.matchedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="match-details-container">
      {/* Navigation Back Link */}
      <button
        type="button"
        onClick={() => navigate('/matches')}
        className="match-details-back-btn"
      >
        <ArrowLeft size={16} />
        <span>Back to Matches</span>
      </button>

      {/* Main Details Card */}
      <div className="match-details-card">
        {/* Left Photo Gallery */}
        <div className="match-details-gallery-wrap">
          <img
            src={getMediaUrl(currentPhoto.fileUrl)}
            alt={user.firstName}
            className="match-details-main-photo"
          />

          {photos.length > 1 && (
            <div className="match-details-thumbnails">
              {photos.map((p, idx) => (
                <img
                  key={`photo-thumb-${p.id || idx}`}
                  src={getMediaUrl(p.fileUrl)}
                  alt={`${user.firstName} photo ${idx + 1}`}
                  className={`match-details-thumb ${idx === selectedPhotoIndex ? 'active' : ''}`}
                  onClick={() => setSelectedPhotoIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        <div className="match-details-content">
          <div className="match-details-header">
            <div className="match-details-timestamp-badge">
              <Heart size={13} fill="#ff4d79" color="#ff4d79" />
              <span>Matched on {formattedDate}</span>
            </div>

            <div className="match-details-name-wrap">
              <h1 className="match-details-name">{user.firstName}</h1>
              {user.age && <span className="match-details-age">, {user.age}</span>}
              {user.isVerified && (
                <span className="match-pill-verified" title="Verified Member">
                  <CheckCircle size={13} />
                  <span>Verified</span>
                </span>
              )}
            </div>

            <div className="match-details-meta-row">
              <div className="match-details-meta-item">
                <MapPin size={15} className="text-pink-400" />
                <span>{locationText}</span>
              </div>
              {user.occupation && (
                <div className="match-details-meta-item">
                  <Briefcase size={15} className="text-purple-400" />
                  <span>{user.occupation}</span>
                </div>
              )}
              {user.education && (
                <div className="match-details-meta-item">
                  <GraduationCap size={15} className="text-indigo-400" />
                  <span>{user.education}</span>
                </div>
              )}
            </div>
          </div>

          {/* About & Bio */}
          {user.bio && (
            <div className="match-details-section">
              <h3 className="match-section-label">About</h3>
              <p className="match-details-bio">{user.bio}</p>
            </div>
          )}

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <div className="match-details-section">
              <h3 className="match-section-label">Interests</h3>
              <div className="match-interests-chips">
                {user.interests.map((interest, idx) => (
                  <span key={`interest-${idx}`} className="match-interest-chip">
                    #{interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Smart AI Match Compatibility Card */}
          <MatchCompatibilityCard
            matchId={match.id}
            targetUserId={user.id}
            targetName={user.firstName}
          />

          {/* Real-Time Chat Callout */}
          <div className="chat-pre-callout">
            <div className="chat-pre-icon">
              <MessageSquare size={20} />
            </div>
            <div>
              <h4 className="chat-pre-title">Real-Time Messaging Connected</h4>
              <p className="chat-pre-desc">
                Chat room active. Say hello to {user.firstName} and start getting to know each other!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="match-details-actions">
            <button
              type="button"
              className="btn-message-active"
              onClick={() => navigate(`/messages?matchId=${match.id}`)}
              aria-label={`Send a message to ${user.firstName}`}
            >
              <MessageSquare size={18} />
              <span>Send Message</span>
            </button>

            <button
              type="button"
              className="btn-unmatch-action"
              onClick={() => setIsUnmatchOpen(true)}
              aria-label={`Unmatch with ${user.firstName}`}
            >
              <UserX size={16} />
              <span>Unmatch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unmatch Confirmation Dialog */}
      <UnmatchDialog
        isOpen={isUnmatchOpen}
        partnerName={user.firstName}
        onClose={() => setIsUnmatchOpen(false)}
        onConfirm={handleConfirmUnmatch}
        loading={unmatching}
      />
    </div>
  );
};

export default MatchDetailsPage;
