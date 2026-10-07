import React from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';

interface ProfileAboutProps {
  bio: string | null;
  onAddBioClick?: () => void;
}

export const ProfileAbout: React.FC<ProfileAboutProps> = ({ bio, onAddBioClick }) => {
  const hasBio = Boolean(bio && bio.trim().length > 0);

  return (
    <div className="profile-section-card profile-about-card">
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-box">
            <Sparkles size={18} className="section-icon" />
          </div>
          <h2 className="section-title">About Me</h2>
        </div>
      </div>

      <div className="section-card-body">
        {hasBio ? (
          <p className="profile-bio-text">{bio}</p>
        ) : (
          <div className="empty-section-state">
            <MessageCircle size={28} className="empty-section-icon" />
            <p className="empty-section-text">No bio added yet.</p>
            {onAddBioClick && (
              <button
                type="button"
                className="empty-action-link"
                onClick={onAddBioClick}
              >
                + Write a short bio
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileAbout;
