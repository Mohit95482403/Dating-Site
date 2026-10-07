import React, { useState } from 'react';
import type { DiscoveryProfile } from '../../types/discovery';
import {
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Star,
  Briefcase,
  Rocket,
} from 'lucide-react';
import PremiumBadge from '../premium/PremiumBadge';
import './Discovery.css';

interface DiscoveryCardProps {
  profile: DiscoveryProfile;
  swipeFeedback?: 'like' | 'pass' | 'super' | null;
  swipeOpacity?: number;
  onOpenDetails: () => void;
  isTopCard?: boolean;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  profile,
  swipeFeedback = null,
  swipeOpacity = 0,
  onOpenDetails,
  isTopCard = false,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const fallbackImg =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80';

  const photos =
    profile.photos && profile.photos.length > 0
      ? profile.photos
      : [{ id: 0, fileUrl: fallbackImg, displayOrder: 0, isPrimary: true }];

  const currentPhoto = photos[photoIndex] || photos[0];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={`discovery-card ${isTopCard ? 'is-top' : 'is-under'}`}>
      {/* SWIPE STAMP FEEDBACK (LIKE / PASS / SUPER LIKE) */}
      {swipeFeedback === 'like' && (
        <div
          className="swipe-stamp stamp-like"
          style={{ opacity: swipeOpacity }}
        >
          LIKE
        </div>
      )}
      {swipeFeedback === 'pass' && (
        <div
          className="swipe-stamp stamp-pass"
          style={{ opacity: swipeOpacity }}
        >
          PASS
        </div>
      )}
      {swipeFeedback === 'super' && (
        <div
          className="swipe-stamp stamp-super"
          style={{ opacity: swipeOpacity }}
        >
          SUPER LIKE
        </div>
      )}

      {/* PHOTO CAROUSEL AREA */}
      <div className="card-photo-container">
        <img
          src={imgError ? fallbackImg : currentPhoto.fileUrl}
          alt={`${profile.firstName} profile`}
          className="card-photo-img"
          onError={() => setImgError(true)}
          draggable={false}
        />

        {/* TOP GRADIENT OVERLAY */}
        <div className="card-gradient-top" />

        {/* BOTTOM GRADIENT OVERLAY */}
        <div className="card-gradient-bottom" />

        {/* PHOTO PROGRESS DOT INDICATORS */}
        {photos.length > 1 && (
          <div className="photo-indicators-bar">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`photo-indicator-dot ${idx === photoIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}

        {/* PHOTO NAVIGATION TAP ZONES / BUTTONS */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="photo-nav-arrow left"
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="photo-nav-arrow right"
              onClick={handleNextPhoto}
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* TOP BADGES */}
        <div className="card-top-badges">
          <div className="vibe-score-pill">
            <Sparkles size={13} />
            <span>{profile.compatibilityScore}% Vibe</span>
          </div>

          {profile.hasSuperLikedYou && (
            <div className="super-liked-pill">
              <Star size={13} fill="currentColor" />
              <span>Super Liked You!</span>
            </div>
          )}

          {profile.isBoosted && (
            <div
              className="super-liked-pill"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
              }}
            >
              <Rocket size={13} fill="currentColor" />
              <span>Boosted</span>
            </div>
          )}
        </div>
      </div>

      {/* CARD INFO OVERLAY */}
      <div className="card-info-overlay">
        {/* NAME, AGE & VERIFIED BADGE */}
        <div className="card-title-row">
          <div className="card-name-group">
            <h2 className="card-name">
              {profile.firstName}, <span className="card-age">{profile.age}</span>
            </h2>
            {profile.isVerified && (
              <span className="card-verified-badge" title="Verified Member">
                <CheckCircle2 size={18} fill="#3b82f6" color="#ffffff" />
              </span>
            )}
            {profile.badge && <PremiumBadge badge={profile.badge} size="sm" />}
          </div>

          {/* OPEN DETAILS BUTTON */}
          <button
            type="button"
            className="card-info-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            aria-label={`View full profile of ${profile.firstName}`}
            title="View Profile Details"
          >
            <Info size={18} />
          </button>
        </div>

        {/* LOCATION & OCCUPATION */}
        <div className="card-sub-info">
          <span className="card-meta-tag">
            <MapPin size={13} />
            {profile.location.city || 'Nashik'}
            {profile.location.state ? `, ${profile.location.state}` : ''}
          </span>
          {profile.occupation && (
            <span className="card-meta-tag">
              <Briefcase size={13} />
              {profile.occupation}
            </span>
          )}
        </div>

        {/* BIO SNIPPET */}
        {profile.bio && (
          <p className="card-bio-snippet">{profile.bio}</p>
        )}

        {/* INTEREST CHIPS */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="card-interests-preview">
            {profile.interests.slice(0, 4).map((interest) => {
              const isShared = profile.sharedInterests.includes(interest.name);
              return (
                <span
                  key={interest.id}
                  className={`card-chip ${isShared ? 'shared-chip' : ''}`}
                >
                  {isShared && '★ '}
                  {interest.name}
                </span>
              );
            })}
            {profile.interests.length > 4 && (
              <span className="card-chip-more">
                +{profile.interests.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryCard;
