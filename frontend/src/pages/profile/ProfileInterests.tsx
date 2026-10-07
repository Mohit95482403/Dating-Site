import React from 'react';
import type { ProfileInterest } from '../../types/profile';
import { Heart, Compass } from 'lucide-react';

interface ProfileInterestsProps {
  interests: ProfileInterest[];
  onAddInterestsClick?: () => void;
}

// Map slugs to emoji icons for rich visual aesthetics
export const INTEREST_EMOJIS: Record<string, string> = {
  travel: '✈️',
  music: '🎵',
  photography: '📸',
  gaming: '🎮',
  fitness: '🏃',
  movies: '🎬',
  reading: '📚',
  cooking: '🍳',
  technology: '💻',
  art: '🎨',
  sports: '⚽',
  nature: '🌿',
  dancing: '💃',
  food: '🍕',
  business: '💼',
  entrepreneurship: '🚀',
  coding: '👨‍💻',
  fashion: '👗',
  volunteering: '🤝',
  adventure: '🧗',
  coffee: '☕',
  hiking: '🥾',
  yoga: '🧘',
  pets: '🐾',
};

export const ProfileInterests: React.FC<ProfileInterestsProps> = ({
  interests,
  onAddInterestsClick,
}) => {
  const hasInterests = interests && interests.length > 0;

  return (
    <div className="profile-section-card profile-interests-card">
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-box">
            <Heart size={18} className="section-icon" />
          </div>
          <h2 className="section-title">Interests & Passions</h2>
        </div>
        {hasInterests && (
          <span className="section-count-badge">{interests.length} selected</span>
        )}
      </div>

      <div className="section-card-body">
        {hasInterests ? (
          <div className="profile-interests-grid">
            {interests.map((interest) => {
              const emoji = INTEREST_EMOJIS[interest.slug.toLowerCase()] || '✨';
              return (
                <div key={interest.id} className="interest-chip">
                  <span className="interest-emoji">{emoji}</span>
                  <span className="interest-name">{interest.name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-section-state">
            <Compass size={28} className="empty-section-icon" />
            <p className="empty-section-text">No interests added yet.</p>
            {onAddInterestsClick && (
              <button
                type="button"
                className="empty-action-link"
                onClick={onAddInterestsClick}
              >
                + Choose your favorite interests
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileInterests;
