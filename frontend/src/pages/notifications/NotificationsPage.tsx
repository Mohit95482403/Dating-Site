import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react';
import notificationService from '../../services/notification.service';
import { useSocket } from '../../hooks/useSocket';
import NotificationFilter from '../../components/notifications/NotificationFilter';
import NotificationList from '../../components/notifications/NotificationList';
import NotificationSkeleton from '../../components/notifications/NotificationSkeleton';
import '../../components/notifications/Notifications.css';
import type {
  NotificationItem,
  NotificationFilter as FilterType,
} from '../../types/notification';

export const NotificationsPage: React.FC = () => {
  const { unreadNotificationCount, setUnreadNotificationCount } = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch notifications
  const loadNotifications = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const data = await notificationService.getNotifications({
          page: targetPage,
          limit: 20,
          filter,
        });

        if (append) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }

        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
        setUnreadNotificationCount(data.unreadCount);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, setUnreadNotificationCount]
  );

  // Load on filter change or mount
  useEffect(() => {
    setPage(1);
    loadNotifications(1, false);
  }, [filter, loadNotifications]);

  // Listen to real-time custom events from SocketContext
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      const newNotif = customEvent.detail;
      if (!newNotif) return;

      setNotifications((prev) => {
        // Prevent duplicate prepend
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        // If filter is unread and notif is unread, or filter is all: prepend
        if (filter === 'all' || (filter === 'unread' && !newNotif.isRead)) {
          return [newNotif, ...prev];
        }
        return prev;
      });
      setTotalCount((prev) => prev + 1);
    };

    const handleReadNotification = (e: Event) => {
      const customEvent = e as CustomEvent<{ notificationId: number }>;
      const { notificationId } = customEvent.detail || {};
      if (notificationId) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    };

    const handleReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    window.addEventListener('connectly:notification-new', handleNewNotification);
    window.addEventListener('connectly:notification-read', handleReadNotification);
    window.addEventListener('connectly:notification-read-all', handleReadAll);

    return () => {
      window.removeEventListener('connectly:notification-new', handleNewNotification);
      window.removeEventListener('connectly:notification-read', handleReadNotification);
      window.removeEventListener('connectly:notification-read-all', handleReadAll);
    };
  }, [filter]);

  // Mark single notification as read
  const handleMarkRead = async (id: number) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await notificationService.markAsRead(id);
      setUnreadNotificationCount(res.unreadCount);
    } catch {
      // Rollback on failure
      loadNotifications(1, false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadNotificationCount === 0 || actionInProgress) return;
    setActionInProgress(true);

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch {
      // Rollback on failure
      loadNotifications(1, false);
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete notification
  const handleDelete = async (id: number) => {
    const target = notifications.find((n) => n.id === id);
    const wasUnread = target && !target.isRead;

    // Optimistic remove
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    if (wasUnread) {
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const res = await notificationService.deleteNotification(id);
      setUnreadNotificationCount(res.unreadCount);
    } catch {
      // Rollback on failure
      loadNotifications(1, false);
    }
  };

  // Load more pagination
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      loadNotifications(page + 1, true);
    }
  };

  return (
    <div className="notifications-page-container">
      {/* Header Banner */}
      <div className="notifications-header-card">
        <div className="notifications-header-left">
          <div className="notifications-header-icon">
            <Bell size={26} />
          </div>
          <div>
            <h1 className="notifications-title">Activity & Notifications</h1>
            <p className="notifications-subtitle">
              Stay updated on who likes, matches, and connects with you.
            </p>
          </div>
        </div>

        <div className="notifications-header-actions">
          <button
            type="button"
            className="btn-mark-all-read"
            onClick={handleMarkAllRead}
            disabled={unreadNotificationCount === 0 || actionInProgress}
            title="Mark all notifications as read"
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <NotificationFilter
        currentFilter={filter}
        onFilterChange={(newFilter) => setFilter(newFilter)}
        unreadCount={unreadNotificationCount}
        totalCount={totalCount}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadNotifications(1, false)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main List / Skeleton */}
      {loading ? (
        <NotificationSkeleton />
      ) : (
        <NotificationList
          notifications={notifications}
          filter={filter}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onResetFilter={() => setFilter('all')}
          hasMore={page < totalPages}
          onLoadMore={handleLoadMore}
          loadingMore={loadingMore}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
