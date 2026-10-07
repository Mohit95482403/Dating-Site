import React from 'react';
import type { ProfileLocation } from '../../types/profile';
import { Briefcase, GraduationCap, MapPin, User, Compass } from 'lucide-react';

interface ProfileDetailsProps {
  occupation: string | null;
  education: string | null;
  location: ProfileLocation;
  gender: string | null;
  onEditClick?: () => void;
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({
  occupation,
  education,
  location,
  gender,
  onEditClick,
}) => {
  const fullLocation = [location.city, location.state, location.country]
    .filter(Boolean)
    .join(', ');

  const detailsList = [
    {
      id: 'occupation',
      icon: Briefcase,
      label: 'Occupation',
      value: occupation,
      fallback: 'Not specified',
    },
    {
      id: 'education',
      icon: GraduationCap,
      label: 'Education',
      value: education,
      fallback: 'Not specified',
    },
    {
      id: 'location',
      icon: MapPin,
      label: 'Location',
      value: fullLocation || null,
      fallback: 'Not specified',
    },
    {
      id: 'gender',
      icon: User,
      label: 'Gender',
      value: gender ? gender.replace('_', ' ') : null,
      fallback: 'Not specified',
    },
  ];

  const hasAnyDetail = detailsList.some((d) => Boolean(d.value));

  return (
    <div className="profile-section-card profile-details-card">
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-box">
            <Compass size={18} className="section-icon" />
          </div>
          <h2 className="section-title">Lifestyle & Background</h2>
        </div>
      </div>

      <div className="section-card-body">
        {hasAnyDetail ? (
          <div className="profile-details-grid">
            {detailsList.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="profile-detail-row">
                  <div className="detail-icon-pill">
                    <Icon size={16} />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">{item.label}</span>
                    <span className={`detail-value ${!item.value ? 'text-muted' : ''}`}>
                      {item.value || item.fallback}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-section-state">
            <p className="empty-section-text">No background details added yet.</p>
            {onEditClick && (
              <button
                type="button"
                className="empty-action-link"
                onClick={onEditClick}
              >
                + Add lifestyle information
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDetails;
