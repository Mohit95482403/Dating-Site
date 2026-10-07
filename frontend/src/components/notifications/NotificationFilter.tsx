import React from 'react';
import type { NotificationFilter as FilterType } from '../../types/notification';

interface NotificationFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  unreadCount: number;
  totalCount: number;
}

export const NotificationFilter: React.FC<NotificationFilterProps> = ({
  currentFilter,
  onFilterChange,
  unreadCount,
  totalCount,
}) => {
  return (
    <div className="notifications-filter-bar">
      <div className="filter-tabs-group">
        <button
          type="button"
          className={`filter-tab-btn ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span>All</span>
          <span className="filter-pill-count">{totalCount}</span>
        </button>

        <button
          type="button"
          className={`filter-tab-btn ${currentFilter === 'unread' ? 'active' : ''}`}
          onClick={() => onFilterChange('unread')}
        >
          <span>Unread</span>
          {unreadCount > 0 && <span className="filter-pill-count">{unreadCount}</span>}
        </button>
      </div>
    </div>
  );
};

export default NotificationFilter;
