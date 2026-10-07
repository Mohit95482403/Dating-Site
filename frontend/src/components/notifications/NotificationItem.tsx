import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Star,
  Sparkles,
  MessageSquare,
  Flame,
  Bell,
  Trash2,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { NotificationItem as NotificationItemType } from '../../types/notification';

interface NotificationItemProps {
  notification: NotificationItemType;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const formatNotificationTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
}) => {
  const navigate = useNavigate();
  const timeFormatted = formatNotificationTime(notification.createdAt);

  // Render category badge icon
  const renderBadge = () => {
    const t = notification.type.toUpperCase();
    if (t.includes('LIKE') && !t.includes('SUPER')) {
      return (
        <div className="notification-type-badge badge-like" title="Like">
          <Heart size={11} fill="currentColor" />
        </div>
      );
    }
    if (t.includes('SUPERLIKE')) {
      return (
        <div className="notification-type-badge badge-superlike" title="Super Like">
          <Star size={11} fill="currentColor" />
        </div>
      );
    }
    if (t.includes('MATCH')) {
      return (
        <div className="notification-type-badge badge-match" title="Match">
          <Sparkles size={11} />
        </div>
      );
    }
    if (t.includes('MESSAGE')) {
      return (
        <div className="notification-type-badge badge-message" title="Message">
          <MessageSquare size={11} />
        </div>
      );
    }
    if (t.includes('REACTION')) {
      return (
        <div className="notification-type-badge badge-reaction" title="Reaction">
          <Flame size={11} fill="currentColor" />
        </div>
      );
    }
    return (
      <div className="notification-type-badge badge-system" title="System">
        <Bell size={11} />
      </div>
    );
  };

  const handleCardClick = () => {
    // If unread, mark as read
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }

    // Navigate to appropriate application screen
    const t = notification.type.toUpperCase();
    if (notification.referenceType === 'conversation' && notification.referenceId) {
      navigate(`/messages/${notification.referenceId}`);
    } else if (notification.referenceType === 'match' && notification.referenceId) {
      navigate(`/matches/${notification.referenceId}`);
    } else if (t.includes('MATCH')) {
      navigate('/matches');
    } else if (t.includes('LIKE') || t.includes('SUPERLIKE')) {
      navigate('/discover');
    }
  };

  return (
    <div
      className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Actor Avatar with Category Badge */}
      <div className="notification-avatar-wrap">
        {notification.actor?.avatarUrl ? (
          <img
            src={notification.actor.avatarUrl}
            alt={notification.actor.firstName || 'Member'}
            className="notification-avatar-img"
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {notification.actor?.firstName ? notification.actor.firstName[0].toUpperCase() : 'C'}
          </div>
        )}
        {renderBadge()}
      </div>

      {/* Notification Body */}
      <div className="notification-body">
        <div className="notification-card-header">
          <h4 className="notification-card-title">{notification.title}</h4>
          <span className="notification-card-time">{timeFormatted}</span>
        </div>

        <p className="notification-card-message">{notification.message}</p>

        <div className="notification-card-actions">
          <span className="notification-action-link">
            <span>View activity</span>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>

      {/* Card Controls */}
      <div className="notification-card-controls">
        {!notification.isRead && (
          <button
            type="button"
            className="btn-card-action"
            title="Mark as read"
            aria-label="Mark as read"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check size={16} />
          </button>
        )}

        <button
          type="button"
          className="btn-card-action btn-card-delete"
          title="Delete notification"
          aria-label="Delete notification"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 size={15} />
        </button>

        {!notification.isRead && <div className="unread-pulse-dot" />}
      </div>
    </div>
  );
};

export default NotificationItem;
