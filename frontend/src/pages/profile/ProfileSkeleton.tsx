import React from 'react';

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="profile-skeleton-container" aria-busy="true" aria-label="Loading profile">
      <div className="profile-layout-grid">
        {/* Left Column: Gallery Skeleton */}
        <div className="profile-left-col">
          <div className="skeleton-box skeleton-gallery-main" />
          <div className="skeleton-thumbs-row">
            <div className="skeleton-box skeleton-thumb" />
            <div className="skeleton-box skeleton-thumb" />
            <div className="skeleton-box skeleton-thumb" />
          </div>
          <div className="skeleton-box skeleton-completion-card" />
        </div>

        {/* Right Column: Details & Cards Skeleton */}
        <div className="profile-right-col">
          <div className="skeleton-box skeleton-header-card" />
          <div className="skeleton-box skeleton-about-card" />
          <div className="skeleton-box skeleton-interests-card" />
          <div className="skeleton-box skeleton-details-card" />
          <div className="skeleton-box skeleton-preferences-card" />
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
