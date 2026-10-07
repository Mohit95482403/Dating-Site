import React from 'react';
import './Matches.css';

interface MatchSkeletonProps {
  count?: number;
}

export const MatchSkeleton: React.FC<MatchSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="matches-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`match-skeleton-${index}`} className="match-skeleton-card">
          <div className="skeleton-photo" />
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            <div className="skeleton-line skeleton-desc" />
            <div className="skeleton-actions">
              <div className="skeleton-btn" />
              <div className="skeleton-btn" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchSkeleton;
