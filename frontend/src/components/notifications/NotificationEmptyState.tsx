import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';

interface NotificationEmptyStateProps {
  filter: 'all' | 'unread';
  onResetFilter?: () => void;
}

export const NotificationEmptyState: React.FC<NotificationEmptyStateProps> = ({
  filter,
  onResetFilter,
}) => {
  const isUnreadFilter = filter === 'unread';

  return (
    <div className="notifications-empty-state">
      <div className="empty-state-icon-box">
        {isUnreadFilter ? <CheckCircle2 size={36} /> : <Bell size={36} />}
      </div>

      <h3 className="empty-state-title">
        {isUnreadFilter ? 'No Unread Notifications' : "You're All Caught Up!"}
      </h3>

      <p className="empty-state-desc">
        {isUnreadFilter
          ? "You've read all your recent notifications. Check back soon for new likes, matches, and messages."
          : 'When members like your profile, send messages, or match with you, their activity will appear right here.'}
      </p>

      {isUnreadFilter && onResetFilter ? (
        <button
          type="button"
          className="btn-mark-all-read"
          onClick={onResetFilter}
        >
          View All Notifications
        </button>
      ) : (
        <Link to="/discover">
          <Button variant="primary" size="md">
            Explore Profiles
          </Button>
        </Link>
      )}
    </div>
  );
};

export default NotificationEmptyState;
