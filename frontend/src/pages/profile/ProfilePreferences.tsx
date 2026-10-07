import React from 'react';
import type { ProfilePreferences as PreferencesType } from '../../types/profile';
import { Sliders, Users, CalendarRange, Navigation, Target } from 'lucide-react';

interface ProfilePreferencesProps {
  preferences: PreferencesType | null;
  onEditClick?: () => void;
}

// Format preferred gender to friendly label
const formatGender = (gender: string | undefined): string => {
  switch (gender?.toLowerCase()) {
    case 'female':
      return 'Women';
    case 'male':
      return 'Men';
    case 'all':
      return 'Everyone';
    case 'non_binary':
      return 'Non-Binary';
    default:
      return 'Everyone';
  }
};

// Format relationship goal to friendly label
const formatGoal = (goal: string | undefined): string => {
  switch (goal?.toLowerCase()) {
    case 'dating':
      return 'Dating & Romance';
    case 'long_term':
      return 'Long-term Relationship';
    case 'friendship':
      return 'New Friends';
    case 'casual':
      return 'Casual Dating';
    case 'marriage':
      return 'Marriage / Life Partner';
    case 'not_sure':
      return 'Still Figuring It Out';
    default:
      return 'Open to Possibilities';
  }
};

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({
  preferences,
  onEditClick,
}) => {
  if (!preferences) {
    return (
      <div className="profile-section-card profile-preferences-card">
        <div className="section-card-header">
          <div className="section-title-wrap">
            <div className="section-icon-box">
              <Sliders size={18} className="section-icon" />
            </div>
            <h2 className="section-title">Dating Preferences</h2>
          </div>
        </div>
        <div className="section-card-body">
          <div className="empty-section-state">
            <p className="empty-section-text">No preferences configured yet.</p>
            {onEditClick && (
              <button
                type="button"
                className="empty-action-link"
                onClick={onEditClick}
              >
                + Set your dating preferences
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const prefItems = [
    {
      id: 'interested_in',
      icon: Users,
      label: 'Interested In',
      value: formatGender(preferences.preferredGender),
    },
    {
      id: 'age_range',
      icon: CalendarRange,
      label: 'Age Range',
      value: `${preferences.minAge} – ${preferences.maxAge} years`,
    },
    {
      id: 'distance',
      icon: Navigation,
      label: 'Max Distance',
      value: `Within ${preferences.maxDistanceKm} km`,
    },
    {
      id: 'relationship_goal',
      icon: Target,
      label: 'Relationship Goal',
      value: formatGoal(preferences.relationshipGoal),
    },
  ];

  return (
    <div className="profile-section-card profile-preferences-card">
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-box">
            <Sliders size={18} className="section-icon" />
          </div>
          <h2 className="section-title">Dating Preferences</h2>
        </div>
      </div>

      <div className="section-card-body">
        <div className="profile-preferences-grid">
          {prefItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="preference-card-item">
                <div className="pref-icon-pill">
                  <Icon size={16} />
                </div>
                <div className="pref-info">
                  <span className="pref-label">{item.label}</span>
                  <span className="pref-value">{item.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProfilePreferences;
