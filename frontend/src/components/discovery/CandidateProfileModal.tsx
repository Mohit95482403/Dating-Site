import React, { useState, useEffect } from 'react';
import type { DiscoveryProfile } from '../../types/discovery';
import { X, MapPin, Briefcase, GraduationCap, CheckCircle2, Star, Sparkles, Heart } from 'lucide-react';
import './Discovery.css';

interface CandidateProfileModalProps {
  profile: DiscoveryProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  actionDisabled?: boolean;
}

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onPass,
  onSuperLike,
  onLike,
  actionDisabled = false,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Reset active photo when profile changes
  useEffect(() => {
    setActivePhotoIndex(0);
  }, [profile?.id]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !profile) return null;

  const photos = profile.photos.length > 0
    ? profile.photos
    : [{ id: 0, fileUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80', displayOrder: 0, isPrimary: true }];

  return (
    <div className="candidate-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-candidate-name">
      <div className="candidate-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE BUTTON */}
        <button
          className="candidate-modal-close-btn"
          onClick={onClose}
          aria-label="Close profile details"
        >
          <X size={20} />
        </button>

        {/* HERO IMAGE SECTION */}
        <div className="candidate-modal-hero">
          <img
            src={photos[activePhotoIndex].fileUrl}
            alt={`${profile.firstName}'s photo ${activePhotoIndex + 1}`}
            className="candidate-modal-img"
          />
          <div className="candidate-modal-hero-gradient" />

          {/* PHOTO THUMBNAILS / CAROUSEL STRIP */}
          {photos.length > 1 && (
            <div className="candidate-modal-thumbnails">
              {photos.map((ph, idx) => (
                <button
                  key={ph.id || idx}
                  className={`modal-thumb-btn ${idx === activePhotoIndex ? 'active' : ''}`}
                  onClick={() => setActivePhotoIndex(idx)}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img src={ph.fileUrl} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}

          {/* VIBE & SUPER LIKE BADGES */}
          <div className="candidate-modal-badges">
            <span className="vibe-match-badge">
              <Sparkles size={14} />
              {profile.compatibilityScore}% Vibe Match
            </span>
            {profile.hasSuperLikedYou && (
              <span className="super-liked-you-badge">
                <Star size={14} fill="currentColor" />
                Super Liked You!
              </span>
            )}
          </div>
        </div>

        {/* PROFILE BODY */}
        <div className="candidate-modal-body">
          {/* HEADER: NAME, AGE, VERIFIED */}
          <div className="candidate-modal-header">
            <div className="candidate-name-row">
              <h2 id="modal-candidate-name" className="candidate-modal-name">
                {profile.firstName}, {profile.age}
              </h2>
              {profile.isVerified && (
                <span className="verified-shield" title="Verified Profile">
                  <CheckCircle2 size={20} fill="#3b82f6" color="#ffffff" />
                </span>
              )}
            </div>

            {/* LOCATION */}
            <div className="candidate-meta-item">
              <MapPin size={16} />
              <span>
                {profile.location.city}
                {profile.location.state ? `, ${profile.location.state}` : ''}
              </span>
            </div>
          </div>

          {/* ABOUT / BIO */}
          {profile.bio && (
            <div className="candidate-section">
              <h3 className="section-title">About Me</h3>
              <p className="candidate-bio-text">{profile.bio}</p>
            </div>
          )}

          {/* WORK & EDUCATION */}
          {(profile.occupation || profile.education) && (
            <div className="candidate-section">
              <h3 className="section-title">Basics</h3>
              <div className="candidate-basics-grid">
                {profile.occupation && (
                  <div className="candidate-meta-item">
                    <Briefcase size={16} />
                    <span>Works as <strong>{profile.occupation}</strong></span>
                  </div>
                )}
                {profile.education && (
                  <div className="candidate-meta-item">
                    <GraduationCap size={16} />
                    <span>Studied at <strong>{profile.education}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INTERESTS */}
          {profile.interests.length > 0 && (
            <div className="candidate-section">
              <div className="section-header-row">
                <h3 className="section-title">Interests</h3>
                {profile.sharedInterestsCount > 0 && (
                  <span className="shared-count-pill">
                    {profile.sharedInterestsCount} in common with you
                  </span>
                )}
              </div>
              <div className="candidate-interests-chips">
                {profile.interests.map((interest) => {
                  const isShared = profile.sharedInterests.includes(interest.name);
                  return (
                    <span
                      key={interest.id}
                      className={`interest-tag ${isShared ? 'shared-highlight' : ''}`}
                    >
                      {isShared && <span className="shared-star">★</span>}
                      {interest.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="candidate-modal-footer">
          <button
            type="button"
            className="modal-action-btn pass"
            onClick={() => {
              onClose();
              onPass();
            }}
            disabled={actionDisabled}
            aria-label="Pass on this profile"
          >
            <X size={22} />
            <span>Pass</span>
          </button>

          <button
            type="button"
            className="modal-action-btn super-like"
            onClick={() => {
              onClose();
              onSuperLike();
            }}
            disabled={actionDisabled}
            aria-label="Super like this profile"
          >
            <Star size={20} fill="currentColor" />
            <span>Super Like</span>
          </button>

          <button
            type="button"
            className="modal-action-btn like"
            onClick={() => {
              onClose();
              onLike();
            }}
            disabled={actionDisabled}
            aria-label="Like this profile"
          >
            <Heart size={22} fill="currentColor" />
            <span>Like</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileModal;
