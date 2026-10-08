import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { getAccessToken } from '../services/api';
import { SOCKET_URL } from '../config/env';
import matchService from '../services/match.service';
import chatService from '../services/chat.service';
import notificationService from '../services/notification.service';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, Star, MessageSquare, Flame, Bell, X } from 'lucide-react';
import type { NotificationItem } from '../types/notification';
import { getMediaUrl } from '../utils/media';

interface RealtimeMatchPayload {
  matchId: number;
  userId: number;
  user?: {
    id: number;
    firstName: string;
    location?: { city?: string | null; state?: string | null };
    primaryPhoto?: { fileUrl: string };
  };
  matchedAt?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  matchCount: number;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  setMatchCount: React.Dispatch<React.SetStateAction<number>>;
  setUnreadMessageCount: React.Dispatch<React.SetStateAction<number>>;
  setUnreadNotificationCount: React.Dispatch<React.SetStateAction<number>>;
  refreshMatchCount: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  refreshNotificationCount: () => Promise<void>;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Floating toasts for matches and general notifications
  const [newMatchToast, setNewMatchToast] = useState<RealtimeMatchPayload | null>(null);
  const [activityToast, setActivityToast] = useState<NotificationItem | null>(null);
  const matchToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCountsFetchRef = useRef<number>(0);
  const navigate = useNavigate();

  const refreshAllCounts = useCallback(async () => {
    if (!isAuthenticated) {
      setMatchCount(0);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
      return;
    }

    const now = Date.now();
    // Throttle duplicate count queries within 2 seconds
    if (now - lastCountsFetchRef.current < 2000) return;
    lastCountsFetchRef.current = now;

    try {
      const [matches, unreadChat, unreadNotif] = await Promise.all([
        matchService.getMatchCount().catch(() => 0),
        chatService.getUnreadCount().catch(() => 0),
        notificationService.getUnreadCount().catch(() => 0),
      ]);
      setMatchCount(matches);
      setUnreadMessageCount(unreadChat);
      setUnreadNotificationCount(unreadNotif);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const refreshMatchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await matchService.getMatchCount();
      setMatchCount(count);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await chatService.getUnreadCount();
      setUnreadMessageCount(count);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const refreshNotificationCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadNotificationCount(count);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // Initial counts fetch on auth
  useEffect(() => {
    if (isAuthenticated) {
      refreshAllCounts();
    } else {
      setMatchCount(0);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
    }
  }, [isAuthenticated, refreshAllCounts]);

  // Socket connection lifecycle
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    const serverUrl = SOCKET_URL;

    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Synchronize counts on connect/reconnect
      refreshAllCounts();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time match notifications
    const handleNewMatch = (payload: RealtimeMatchPayload) => {
      setMatchCount((prev) => prev + 1);

      // Trigger custom event so active MatchesPage can update list instantly
      window.dispatchEvent(new CustomEvent('connectly:new-match', { detail: payload }));

      // Show floating notification toast
      setNewMatchToast(payload);
      if (matchToastTimerRef.current) clearTimeout(matchToastTimerRef.current);
      matchToastTimerRef.current = setTimeout(() => {
        setNewMatchToast(null);
      }, 7000);
    };

    newSocket.on('match:created', handleNewMatch);
    newSocket.on('match:new', handleNewMatch);

    newSocket.on('match:unmatched', () => {
      setMatchCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('connectly:unmatched'));
    });

    // Real-time direct message notification
    newSocket.on('message:received', (payload: any) => {
      setUnreadMessageCount((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent('connectly:message-received', { detail: payload }));
    });

    newSocket.on('message:read', (payload: any) => {
      refreshUnreadCount();
      window.dispatchEvent(new CustomEvent('connectly:message-read', { detail: payload }));
    });

    newSocket.on('presence:update', (payload: any) => {
      window.dispatchEvent(new CustomEvent('connectly:presence-update', { detail: payload }));
    });

    newSocket.on('message:status', (payload: any) => {
      window.dispatchEvent(new CustomEvent('connectly:message-status', { detail: payload }));
    });

    newSocket.on('message:reaction', (payload: any) => {
      window.dispatchEvent(new CustomEvent('connectly:message-reaction', { detail: payload }));
    });

    // Day 14: Real-time notifications
    newSocket.on('notification:new', (notification: NotificationItem) => {
      setUnreadNotificationCount((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent('connectly:notification-new', { detail: notification }));

      // Avoid double-toasting if match toast is already showing
      const isMatch = notification.type.toUpperCase() === 'MATCH_CREATED';
      if (!isMatch) {
        setActivityToast(notification);
        if (activityToastTimerRef.current) clearTimeout(activityToastTimerRef.current);
        activityToastTimerRef.current = setTimeout(() => {
          setActivityToast(null);
        }, 6000);
      }
    });

    newSocket.on('notification:read', (payload: { notificationId: number; unreadCount: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadNotificationCount(payload.unreadCount);
      } else {
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      }
      window.dispatchEvent(new CustomEvent('connectly:notification-read', { detail: payload }));
    });

    newSocket.on('notification:read-all', () => {
      setUnreadNotificationCount(0);
      window.dispatchEvent(new CustomEvent('connectly:notification-read-all'));
    });

    newSocket.on('notification:count-updated', (payload: { unreadCount: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadNotificationCount(payload.unreadCount);
      }
    });

    // Day 17: User moderation real-time termination
    newSocket.on('account:restricted', (payload: { restricted: boolean; reason: string }) => {
      window.dispatchEvent(new CustomEvent('connectly:account-restricted', { detail: payload }));
      alert(`Account Notice: Your account access has been restricted by Connectly Administration.\nReason: ${payload.reason || 'Safety moderation policy'}`);
      window.location.href = '/login';
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      if (matchToastTimerRef.current) clearTimeout(matchToastTimerRef.current);
      if (activityToastTimerRef.current) clearTimeout(activityToastTimerRef.current);
    };
  }, [isAuthenticated, user?.id, refreshMatchCount, refreshUnreadCount, refreshNotificationCount]);

  const handleMatchToastClick = () => {
    if (newMatchToast?.matchId) {
      navigate(`/matches/${newMatchToast.matchId}`);
    } else {
      navigate('/matches');
    }
    setNewMatchToast(null);
  };

  const handleActivityToastClick = (notif: NotificationItem) => {
    // Navigate intelligently based on reference
    if (notif.referenceType === 'conversation' && notif.referenceId) {
      navigate(`/messages/${notif.referenceId}`);
    } else if (notif.referenceType === 'match' && notif.referenceId) {
      navigate(`/matches/${notif.referenceId}`);
    } else if (notif.referenceType === 'user') {
      navigate('/notifications');
    } else {
      navigate('/notifications');
    }
    setActivityToast(null);
  };

  // Helper icon renderer for activity toast
  const renderToastIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('LIKE') && !t.includes('SUPER')) {
      return <Heart size={16} className="text-pink-400 fill-pink-400" />;
    }
    if (t.includes('SUPERLIKE')) {
      return <Star size={16} className="text-yellow-400 fill-yellow-400" />;
    }
    if (t.includes('MATCH')) {
      return <Sparkles size={16} className="text-purple-400" />;
    }
    if (t.includes('MESSAGE')) {
      return <MessageSquare size={16} className="text-sky-400" />;
    }
    if (t.includes('REACTION')) {
      return <Flame size={16} className="text-orange-400 fill-orange-400" />;
    }
    return <Bell size={16} className="text-indigo-400" />;
  };

  const contextValue = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      matchCount,
      unreadMessageCount,
      unreadNotificationCount,
      setMatchCount,
      setUnreadMessageCount,
      setUnreadNotificationCount,
      refreshMatchCount,
      refreshUnreadCount,
      refreshNotificationCount,
    }),
    [
      socket,
      isConnected,
      matchCount,
      unreadMessageCount,
      unreadNotificationCount,
      setMatchCount,
      setUnreadMessageCount,
      setUnreadNotificationCount,
      refreshMatchCount,
      refreshUnreadCount,
      refreshNotificationCount,
    ]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}

      {/* Floating Real-Time Match Notification Banner */}
      {newMatchToast && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 animate-bounce-in flex justify-end">
          <div
            onClick={handleMatchToastClick}
            className="flex items-center gap-4 bg-gradient-to-r from-pink-600/95 via-purple-600/95 to-indigo-700/95 text-white px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-pink-400/40 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            style={{ width: '100%', maxWidth: '420px', minWidth: 0 }}
          >
            <div className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 shadow-md">
              <img
                src={
                  getMediaUrl((newMatchToast.user as any)?.avatarUrl || newMatchToast.user?.primaryPhoto?.fileUrl) ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80'
                }
                alt={newMatchToast.user?.firstName || 'New Match'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-pink-500/10 pointer-events-none" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-200">
                <Sparkles size={13} className="text-yellow-300" />
                <span>It's a Match!</span>
              </div>
              <p className="text-sm font-semibold truncate text-white">
                You matched with {newMatchToast.user?.firstName || 'someone special'}!
              </p>
              <span className="text-xs text-white/80 underline decoration-pink-300">
                Tap to view profile →
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNewMatchToast(null);
              }}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss match notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Real-Time Activity Notification Toast (Day 14) */}
      {activityToast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 animate-slide-in flex justify-end">
          <div
            onClick={() => handleActivityToastClick(activityToast)}
            className="flex items-center gap-3 bg-neutral-900/95 text-white px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/15 cursor-pointer hover:border-pink-500/40 hover:scale-[1.02] transition-all duration-200"
            style={{ width: '100%', maxWidth: '400px', minWidth: 0 }}
          >
            {activityToast.actor?.avatarUrl ? (
              <div className="relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden border border-white/20 shadow-sm">
                <img
                  src={getMediaUrl(activityToast.actor.avatarUrl)}
                  alt={activityToast.actor.firstName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                {renderToastIcon(activityToast.type)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-300">
                {renderToastIcon(activityToast.type)}
                <span>{activityToast.title}</span>
              </div>
              <p className="text-sm text-neutral-200 truncate font-medium">
                {activityToast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivityToast(null);
              }}
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
