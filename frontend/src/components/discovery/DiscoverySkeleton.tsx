import React from 'react';
import './Discovery.css';

export const DiscoverySkeleton: React.FC = () => {
  return (
    <div className="discovery-card-skeleton animate-pulse" aria-hidden="true">
      <div className="skeleton-photo-box">
        <div className="skeleton-shimmer" />
        <div className="skeleton-badge-pill" />
      </div>
      <div className="skeleton-details">
        <div className="skeleton-title-row">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-circle" />
        </div>
        <div className="skeleton-line skeleton-subtitle" />
        <div className="skeleton-line skeleton-bio" />
        <div className="skeleton-line skeleton-bio-short" />
        <div className="skeleton-chips-row">
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
      </div>
    </div>
  );
};

export default DiscoverySkeleton;
