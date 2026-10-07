import React from 'react';

export const NotificationSkeleton: React.FC = () => {
  return (
    <div className="notifications-list">
      {[1, 2, 3, 4, 5].map((idx) => (
        <div key={idx} className="notification-skeleton-card">
          <div className="skeleton-avatar" />
          <div className="skeleton-content">
            <div className="skeleton-line short" />
            <div className="skeleton-line long" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSkeleton;
