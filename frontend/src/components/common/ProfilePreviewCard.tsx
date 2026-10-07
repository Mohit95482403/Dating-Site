import React, { useState } from 'react';
import './ProfilePreviewCard.css';

interface ProfilePreviewCardProps {
  name?: string;
  age?: number;
  distance?: string;
  imageSrc?: string;
  interests?: string[];
  matchRate?: number;
  className?: string;
}

export const ProfilePreviewCard: React.FC<ProfilePreviewCardProps> = ({
  name = 'Alex',
  age = 25,
  distance = '4 km away',
  imageSrc = '/images/alex_profile.jpg',
  interests = ['Coffee & Books', 'Art Exhibitions', 'Indie Music', 'Photography'],
  matchRate = 96,
  className = '',
}) => {
  const [liked, setLiked] = useState(false);
  const [superLiked, setSuperLiked] = useState(false);

  return (
    <div className={`profile-preview-wrapper ${className}`}>
      {/* Floating Badges */}
      <div className="floating-interaction heart-pill animate-float">
        <span className="heart-icon">💖</span>
        <div className="pill-text">
          <strong>Mutual Match</strong>
          <span>Shared vibe: 96%</span>
        </div>
      </div>

      <div className="floating-interaction vibe-pill animate-float-reverse">
        <span className="vibe-icon">✨</span>
        <span>Looking for deep talks</span>
      </div>

      {/* Main Card */}
      <div className="profile-card glass-panel">
        <div className="profile-image-container">
          <img src={imageSrc} alt={`${name}, ${age}`} className="profile-photo" />
          <div className="profile-gradient-overlay" />

          {/* Compatibility Tag */}
          <div className="match-pill">
            <span className="sparkle">🔥</span> {matchRate}% Match
          </div>

          {/* Verification Badge */}
          <div className="verified-badge" title="Verified Profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Card Content Overlay */}
          <div className="profile-info-overlay">
            <div className="profile-name-row">
              <h3 className="profile-name">{name}, <span className="profile-age">{age}</span></h3>
              <span className="online-indicator" title="Active now"></span>
            </div>

            <p className="profile-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {distance}
            </p>

            <div className="profile-tags">
              {interests.map((interest, idx) => (
                <span key={idx} className="profile-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="profile-action-bar">
          <button 
            type="button" 
            className="action-circle pass-btn" 
            title="Pass"
            onClick={() => {
              setLiked(false);
              setSuperLiked(false);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button 
            type="button" 
            className={`action-circle super-btn ${superLiked ? 'active' : ''}`}
            title="Super Like"
            onClick={() => setSuperLiked(!superLiked)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={superLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>

          <button 
            type="button" 
            className={`action-circle like-btn ${liked ? 'active' : ''}`}
            title="Like"
            onClick={() => setLiked(!liked)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePreviewCard;
