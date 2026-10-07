import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DiscoveryProfile } from '../../types/discovery';
import { useAuth } from '../../hooks/useAuth';
import { Heart, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import './DiscoveryMatchModal.css';

interface DiscoveryMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedProfile: DiscoveryProfile | null;
  onKeepSwiping: () => void;
}

export const DiscoveryMatchModal: React.FC<DiscoveryMatchModalProps> = ({
  isOpen,
  onClose,
  matchedProfile,
  onKeepSwiping,
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onKeepSwiping();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onKeepSwiping]);

  if (!isOpen || !matchedProfile) return null;

  const partnerPhotoUrl =
    matchedProfile.photos?.[0]?.fileUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80';

  // Fallback for current user avatar
  const myPhotoUrl =
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80';

  const handleSendMessage = () => {
    onClose();
    navigate('/matches');
  };

  return (
    <div
      className="match-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onKeepSwiping();
        }
      }}
    >
      <div className="match-modal-card animate-bounce-in">
        {/* Glow behind modal */}
        <div className="match-modal-glow" />

        {/* Celebration Header */}
        <div className="match-celebration-icon">
          <Sparkles className="sparkle-icon" size={26} />
          <h2 id="match-heading" className="match-title">
            It's a Match! 🎉
          </h2>
          <Sparkles className="sparkle-icon" size={26} />
        </div>

        <p className="match-subtitle">
          You and <strong>{matchedProfile.firstName}</strong> both liked each other.
        </p>

        {/* Dual Avatars: YOU + THEM */}
        <div className="match-dual-avatars-wrap">
          {/* User A (You) */}
          <div className="match-avatar-card">
            <div className="match-avatar-circle">
              <img
                src={myPhotoUrl}
                alt={currentUser?.firstName || 'You'}
                className="match-avatar-img"
              />
            </div>
            <span className="match-avatar-label">You</span>
          </div>

          {/* Heart Connector */}
          <div className="match-avatar-heart-burst">
            <Heart size={28} fill="#ff3366" color="#ff3366" />
          </div>

          {/* User B (Them) */}
          <div className="match-avatar-card">
            <div className="match-avatar-circle">
              <img
                src={partnerPhotoUrl}
                alt={matchedProfile.firstName}
                className="match-avatar-img"
              />
            </div>
            <span className="match-avatar-label">{matchedProfile.firstName}</span>
          </div>
        </div>

        {matchedProfile.compatibilityScore > 0 && (
          <div className="match-compat-tag">
            <Sparkles size={14} className="text-yellow-300" />
            <span>{matchedProfile.compatibilityScore}% Compatibility Match</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="match-modal-actions">
          <button
            type="button"
            className="match-primary-btn"
            onClick={handleSendMessage}
            aria-label="Send a message"
          >
            <MessageCircle size={18} />
            <span>Send a Message</span>
          </button>

          <button
            type="button"
            className="match-secondary-btn"
            onClick={onKeepSwiping}
            aria-label="Keep discovering more profiles"
          >
            <span>Keep Discovering</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryMatchModal;
