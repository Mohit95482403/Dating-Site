import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Home, Compass, Sparkles, MessageSquare, User, Shield, LogIn } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import './MobileBottomNav.css';

export const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { unreadMessageCount, matchCount } = useSocket();
  const location = useLocation();
  const pathname = location.pathname;

  // Hide bottom nav when in an active one-on-one chat conversation on mobile,
  // allowing the message composer to occupy the bottom edge without obstruction.
  const isInActiveChat = pathname.startsWith('/messages/') && pathname !== '/messages';
  if (isInActiveChat) {
    return null;
  }

  // Hide on auth-only flow pages if desired (e.g. focused login/register views)
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isAuthPage) {
    return null;
  }

  // Active state matchers
  const isHomeActive = pathname === '/feed' || pathname === '/';
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
        {isAuthenticated ? (
          <>
            {/* 1. Home / Feed */}
            <Link
              to="/feed"
              className={`mobile-nav-tab ${isHomeActive ? 'active' : ''}`}
              aria-label="Feed"
            >
              <div className="mobile-tab-icon-wrap">
                <Home size={20} strokeWidth={isHomeActive ? 2.4 : 1.9} />
              </div>
              <span className="mobile-tab-label">Feed</span>
              {isHomeActive && <span className="mobile-active-dot" />}
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
          </>
        ) : (
          /* Guest Experience Navigation */
          <>
            <Link
              to="/"
              className={`mobile-nav-tab ${pathname === '/' ? 'active' : ''}`}
              aria-label="Home"
            >
              <div className="mobile-tab-icon-wrap">
                <Home size={20} strokeWidth={pathname === '/' ? 2.4 : 1.9} />
              </div>
              <span className="mobile-tab-label">Home</span>
              {pathname === '/' && <span className="mobile-active-dot" />}
            </Link>

            <Link
              to="/discover"
              className={`mobile-nav-tab ${pathname === '/discover' ? 'active' : ''}`}
              aria-label="Discover"
            >
              <div className="mobile-tab-icon-wrap">
                <Compass size={20} strokeWidth={pathname === '/discover' ? 2.4 : 1.9} />
              </div>
              <span className="mobile-tab-label">Discover</span>
              {pathname === '/discover' && <span className="mobile-active-dot" />}
            </Link>

            {/* Guest Center Action: How It Works / Get Started */}
            <Link
              to="/how-it-works"
              className={`mobile-nav-tab mobile-nav-tab-center ${pathname === '/how-it-works' ? 'active' : ''}`}
              aria-label="How Connectly Works"
            >
              <div className="mobile-center-btn">
                <Sparkles size={22} strokeWidth={2.4} />
              </div>
              <span className="mobile-tab-label mobile-center-label">Explore</span>
            </Link>

            <Link
              to="/safety"
              className={`mobile-nav-tab ${pathname === '/safety' ? 'active' : ''}`}
              aria-label="Trust & Safety"
            >
              <div className="mobile-tab-icon-wrap">
                <Shield size={20} strokeWidth={pathname === '/safety' ? 2.4 : 1.9} />
              </div>
              <span className="mobile-tab-label">Safety</span>
              {pathname === '/safety' && <span className="mobile-active-dot" />}
            </Link>

            <Link
              to="/login"
              className="mobile-nav-tab"
              aria-label="Log In"
            >
              <div className="mobile-tab-icon-wrap">
                <LogIn size={20} strokeWidth={1.9} />
              </div>
              <span className="mobile-tab-label">Log In</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
