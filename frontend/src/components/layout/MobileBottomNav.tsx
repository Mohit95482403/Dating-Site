import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Home, Compass, Sparkles, MessageSquare, User } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import { getAccessToken } from '../../services/api';
import './MobileBottomNav.css';

export const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { unreadMessageCount, matchCount } = useSocket();
  const location = useLocation();
  const pathname = location.pathname;

  // 1. Hide bottom nav when in an active one-on-one chat conversation on mobile,
  // allowing the message composer to occupy the bottom edge without obstruction.
  const isInActiveChat = pathname.startsWith('/messages/') && pathname !== '/messages';
  if (isInActiveChat) {
    return null;
  }

  // 2. Hide on auth-only flow pages (focused login/register/reset views)
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isAuthPage) {
    return null;
  }

  // 3. Reliable authentication determination:
  // Checks useAuth state, stored access token, or active application routes.
  // This guarantees authenticated users immediately see their navigation without delay.
  const isAppRoute =
    pathname.startsWith('/feed') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/likes') ||
    pathname.startsWith('/premium');

  const isUserAuthenticated = Boolean(
    isAuthenticated ||
    user ||
    getAccessToken() ||
    (typeof window !== 'undefined' && localStorage.getItem('connectly_access_token')) ||
    isAppRoute
  );

  // If visitor is unauthenticated on public pages, do not render mobile bottom nav
  // (unauthenticated visitors use the top header with Log In & Get Started)
  if (!isUserAuthenticated) {
    return null;
  }

  // Active state matchers for Connectly routes
  const isFeedActive = pathname === '/feed';
  const isExploreActive =
    pathname.startsWith('/explore') ||
    pathname.startsWith('/hashtag') ||
    pathname.startsWith('/communities');
  const isDiscoverActive = pathname === '/discover' || pathname.startsWith('/matches');
  const isMessagesActive = pathname.startsWith('/messages');
  const isProfileActive =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings');

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav-container">
        {/* 1. Feed */}
        <Link
          to="/feed"
          className={`mobile-nav-tab ${isFeedActive ? 'active' : ''}`}
          aria-label="Feed"
        >
          <div className="mobile-tab-icon-wrap">
            <Home size={20} strokeWidth={isFeedActive ? 2.4 : 1.9} />
          </div>
          <span className="mobile-tab-label">Feed</span>
          {isFeedActive && <span className="mobile-active-dot" />}
        </Link>

        {/* 2. Explore */}
        <Link
          to="/explore"
          className={`mobile-nav-tab ${isExploreActive ? 'active' : ''}`}
          aria-label="Explore"
        >
          <div className="mobile-tab-icon-wrap">
            <Compass size={20} strokeWidth={isExploreActive ? 2.4 : 1.9} />
          </div>
          <span className="mobile-tab-label">Explore</span>
          {isExploreActive && <span className="mobile-active-dot" />}
        </Link>

        {/* 3. Center Elevated Action: Discover / Match */}
        <Link
          to="/discover"
          className={`mobile-nav-tab mobile-nav-tab-center ${isDiscoverActive ? 'active' : ''}`}
          aria-label="Discover Matches"
        >
          <div className="mobile-center-btn" title="Discover Profiles">
            <Sparkles size={22} strokeWidth={2.4} />
            {matchCount > 0 && !isDiscoverActive && (
              <span className="mobile-center-ping" />
            )}
          </div>
          <span className="mobile-tab-label mobile-center-label">Discover</span>
        </Link>

        {/* 4. Messages */}
        <Link
          to="/messages"
          className={`mobile-nav-tab ${isMessagesActive ? 'active' : ''}`}
          aria-label="Messages"
        >
          <div className="mobile-tab-icon-wrap">
            <MessageSquare size={20} strokeWidth={isMessagesActive ? 2.4 : 1.9} />
            {unreadMessageCount > 0 && (
              <span className="mobile-nav-badge" aria-label={`${unreadMessageCount} unread messages`}>
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
          </div>
          <span className="mobile-tab-label">Messages</span>
          {isMessagesActive && <span className="mobile-active-dot" />}
        </Link>

        {/* 5. You / Profile */}
        <Link
          to="/profile"
          className={`mobile-nav-tab ${isProfileActive ? 'active' : ''}`}
          aria-label="Your Profile"
        >
          <div className="mobile-tab-icon-wrap">
            {user?.avatarUrl ? (
              <div className={`mobile-nav-avatar-ring ${isProfileActive ? 'active-ring' : ''}`}>
                <img
                  src={getMediaUrl(user.avatarUrl)}
                  alt={user.firstName || 'Profile'}
                  className="mobile-nav-avatar-img"
                />
              </div>
            ) : (
              <User size={20} strokeWidth={isProfileActive ? 2.4 : 1.9} />
            )}
          </div>
          <span className="mobile-tab-label">You</span>
          {isProfileActive && <span className="mobile-active-dot" />}
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
