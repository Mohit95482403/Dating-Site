import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { User, Users, LogOut, LayoutDashboard, Heart, Bell, Settings as SettingsIcon, Shield, Sparkles, X } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumBadge from '../premium/PremiumBadge';
import { getMediaUrl } from '../../utils/media';
import MobileBottomNav from './MobileBottomNav';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { matchCount, unreadMessageCount, unreadNotificationCount } = useSocket();
  const { isPremium, badge } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className={`navbar-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <span className="brand-title">Connectly</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="navbar-nav">
          {isAuthenticated ? (
            <>
              <Link to="/feed" className={`nav-link ${location.pathname === '/feed' ? 'active' : ''}`}>
                Feed
              </Link>
              <Link to="/explore" className={`nav-link ${location.pathname === '/explore' || location.pathname.startsWith('/hashtag') ? 'active' : ''}`}>
                Explore
              </Link>
              <Link to="/explore/communities" className={`nav-link ${location.pathname.startsWith('/communities') || location.pathname === '/explore/communities' ? 'active' : ''}`}>
                Communities
              </Link>
              <Link to="/discover" className={`nav-link ${location.pathname === '/discover' ? 'active' : ''}`}>
                Discover
              </Link>
              <Link to="/matches" className={`nav-link badge-link ${location.pathname.startsWith('/matches') ? 'active' : ''}`}>
                Matches
                {matchCount > 0 && (
                  <span className="mini-badge-count">{matchCount}</span>
                )}
              </Link>
              <Link to="/messages" className={`nav-link badge-link ${location.pathname.startsWith('/messages') ? 'active' : ''}`}>
                Messages
                {unreadMessageCount > 0 && (
                  <span className="mini-badge-count">{unreadMessageCount}</span>
                )}
              </Link>
              <Link to="/notifications" className={`nav-link badge-link ${location.pathname.startsWith('/notifications') ? 'active' : ''}`} title="Activity & Notifications">
                <span className="nav-link-inner">
                  <Bell size={15} />
                  <span>Activity</span>
                </span>
                {unreadNotificationCount > 0 && (
                  <span className="mini-badge-count">{unreadNotificationCount}</span>
                )}
              </Link>
              <Link to="/likes/received" className={`nav-link ${location.pathname === '/likes/received' ? 'active' : ''}`} title="See Who Liked You">
                Likes
              </Link>
              <Link to="/premium" className={`nav-link nav-link-premium ${location.pathname === '/premium' ? 'active' : ''}`} style={{ color: isPremium ? '#f472b6' : '#f59e0b', fontWeight: 600 }}>
                <span className="nav-link-inner">
                  <Sparkles size={14} />
                  <span>Premium</span>
                </span>
              </Link>
              <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
                Profile
              </Link>
              <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`} title="Settings & Privacy">
                Settings
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className={`nav-link nav-link-admin ${location.pathname.startsWith('/admin') ? 'active' : ''}`} style={{ color: '#818cf8', fontWeight: 600 }}>
                  <span className="nav-link-inner">
                    <Shield size={14} />
                    <span>Admin</span>
                  </span>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/how-it-works" className={`nav-link ${location.pathname === '/how-it-works' ? 'active' : ''}`}>
                How It Works
              </Link>
              <Link to="/safety" className={`nav-link ${location.pathname === '/safety' ? 'active' : ''}`}>
                Safety
              </Link>
              <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>
                About
              </Link>
              <Link to="/discover" className="nav-link badge-link">
                Discover
                <span className="mini-badge">App</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Account Controls & Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="auth-nav-user-group">
              <Link to="/dashboard" className="nav-user-chip" title="Go to Dashboard">
                <span className="nav-avatar-icon" style={{ overflow: 'hidden' }}>
                  {user?.avatarUrl ? (
                    <img
                      src={getMediaUrl(user.avatarUrl)}
                      alt={user.firstName || 'Profile'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={15} />
                  )}
                </span>
                <span className="nav-user-name">{user?.firstName || 'Account'}</span>
                {badge && <PremiumBadge badge={badge} size="sm" />}
              </Link>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleLogout}
                title="Log out of Connectly"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>

              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}

          {/* Mobile header controls */}
          {isAuthenticated && (
            <Link
              to="/notifications"
              className={`mobile-top-bell-btn ${location.pathname.startsWith('/notifications') ? 'active' : ''}`}
              aria-label="Activity & Notifications"
              title="Activity & Notifications"
            >
              <Bell size={19} strokeWidth={location.pathname.startsWith('/notifications') ? 2.4 : 1.9} />
              {unreadNotificationCount > 0 && (
                <span className="mobile-top-bell-badge">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button 
            type="button" 
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Modern Mobile Slide-In Glass Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-drawer-sheet" role="dialog" aria-modal="true" aria-label="Navigation Menu">
            <div className="mobile-drawer-header">
              {isAuthenticated ? (
                <div className="mobile-drawer-user-info">
                  <div className="mobile-drawer-avatar">
                    {user?.avatarUrl ? (
                      <img src={getMediaUrl(user.avatarUrl)} alt={user.firstName || 'Profile'} />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="mobile-drawer-user-text">
                    <div className="mobile-drawer-user-name">
                      {user?.firstName} {user?.lastName || ''}
                      {badge && <PremiumBadge badge={badge} size="sm" />}
                    </div>
                    <div className="mobile-drawer-user-email">{user?.email}</div>
                  </div>
                </div>
              ) : (
                <div className="mobile-drawer-brand">
                  <span className="brand-title">Connectly</span>
                </div>
              )}
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-drawer-content">
              {isAuthenticated ? (
                <>
                  <div className="mobile-drawer-section-title">Experience</div>
                  <Link to="/premium" className="mobile-drawer-item mobile-item-premium">
                    <Sparkles size={18} />
                    <span>Connectly Premium</span>
                    <span className="mobile-drawer-pill-gold">{isPremium ? 'Active' : 'Upgrade'}</span>
                  </Link>
                  <Link to="/explore/communities" className="mobile-drawer-item">
                    <Users size={18} />
                    <span>Communities &amp; Groups</span>
                  </Link>
                  <Link to="/matches" className="mobile-drawer-item">
                    <Heart size={18} />
                    <span>Matches</span>
                    {matchCount > 0 && <span className="mobile-drawer-count">{matchCount}</span>}
                  </Link>
                  <Link to="/likes/received" className="mobile-drawer-item">
                    <Heart size={18} />
                    <span>Who Liked You</span>
                  </Link>

                  <div className="mobile-drawer-section-title">Account</div>
                  <Link to="/dashboard" className="mobile-drawer-item">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/profile" className="mobile-drawer-item">
                    <User size={18} />
                    <span>My Profile</span>
                  </Link>
                  <Link to="/settings" className="mobile-drawer-item">
                    <SettingsIcon size={18} />
                    <span>Settings &amp; Privacy</span>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="mobile-drawer-item mobile-item-admin">
                      <Shield size={18} />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <div className="mobile-drawer-divider" />
                  <button type="button" className="mobile-drawer-item mobile-item-logout" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className="mobile-drawer-item">
                    <span>Home</span>
                  </Link>
                  <Link to="/discover" className="mobile-drawer-item">
                    <span>Discover Profiles</span>
                  </Link>
                  <Link to="/how-it-works" className="mobile-drawer-item">
                    <span>How It Works</span>
                  </Link>
                  <Link to="/safety" className="mobile-drawer-item">
                    <span>Safety &amp; Trust</span>
                  </Link>
                  <Link to="/about" className="mobile-drawer-item">
                    <span>About Connectly</span>
                  </Link>
                  <div className="mobile-drawer-divider" />
                  <div className="mobile-drawer-auth-buttons">
                    <Link to="/login" style={{ width: '100%' }}>
                      <Button variant="secondary" fullWidth size="md">Log In</Button>
                    </Link>
                    <Link to="/register" style={{ width: '100%' }}>
                      <Button variant="primary" fullWidth size="md">Get Started</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
    <MobileBottomNav />
  </>
);
};

export default Navbar;
