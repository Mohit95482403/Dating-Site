import React from 'react';
import type { NotificationItem as NotificationItemType, NotificationFilter as FilterType } from '../../types/notification';
import NotificationItem from './NotificationItem';
import NotificationEmptyState from './NotificationEmptyState';

interface NotificationListProps {
  notifications: NotificationItemType[];
  filter: FilterType;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
  onResetFilter?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  filter,
  onMarkRead,
  onDelete,
  onResetFilter,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}) => {
  if (notifications.length === 0) {
    return <NotificationEmptyState filter={filter} onResetFilter={onResetFilter} />;
  }

  return (
    <div className="notifications-list-container">
      <div className="notifications-list">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
          />
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className="notifications-pagination-wrap">
          <button
            type="button"
            className="btn-load-more"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading older notifications...' : 'Load older notifications'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
