import React from 'react';
import type { Profile, PublicUserProfile } from '../../types/profile';
import { MapPin, Edit3, Calendar } from 'lucide-react';
import Button from '../../components/common/Button';
import VerificationBadge from '../../components/profile/VerificationBadge';

interface ProfileHeaderProps {
  profile: Profile | PublicUserProfile;
  isVerified?: boolean;
  isOwnProfile?: boolean;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
  onEditClick?: () => void;
  actions?: React.ReactNode;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isVerified = false,
  isOwnProfile = true,
  isOnline = null,
  lastSeenAt = null,
  onEditClick,
  actions,
}) => {
  const fullName = profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.firstName;

  const locationString = [
    profile.location?.city,
    profile.location?.state,
    profile.location?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const verified = isVerified || profile.isVerified || profile.verificationStatus === 'verified';

  return (
    <div className="profile-header-card">
      <div className="profile-header-main">
        <div className="profile-header-info">
          <div className="profile-name-row">
            <h1 className="profile-name">
              {fullName}
              {profile.age !== null && profile.age !== undefined && (
                <span className="profile-age">, {profile.age}</span>
              )}
            </h1>

            {verified && <VerificationBadge isVerified={true} size="md" showText={true} />}
          </div>

          {/* Online / Presence status if privacy allows */}
          {isOnline !== null && isOnline !== undefined && (
            <div className="profile-presence-row">
              <span className={`presence-dot ${isOnline ? 'online' : 'offline'}`} />
              <span className="presence-label">
                {isOnline
                  ? 'Online'
                  : lastSeenAt
                  ? `Last seen ${new Date(lastSeenAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Offline'}
              </span>
            </div>
          )}

          <div className="profile-meta-row">
            {locationString ? (
              <span className="profile-meta-item">
                <MapPin size={15} className="meta-icon" />
                {locationString}
              </span>
            ) : (
              <span className="profile-meta-item text-muted">
                <MapPin size={15} className="meta-icon" />
                Location not set
              </span>
            )}

            {'gender' in profile && profile.gender && (
              <span className="profile-meta-item profile-gender-pill">
                {profile.gender.replace('_', ' ')}
              </span>
            )}

            {'dateOfBirth' in profile && profile.dateOfBirth && (
              <span className="profile-meta-item text-muted" title="Born">
                <Calendar size={14} className="meta-icon" />
                {new Date(profile.dateOfBirth).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        <div className="profile-header-actions">
          {isOwnProfile && onEditClick ? (
            <Button
              variant="outline"
              className="edit-profile-btn"
              onClick={onEditClick}
              aria-label="Edit Profile"
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </Button>
          ) : (
            actions
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
