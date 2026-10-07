import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { User, Users, LogOut, LayoutDashboard, Heart, Compass, MessageSquare, Bell, Settings as SettingsIcon, Shield, Sparkles } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumBadge from '../premium/PremiumBadge';
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
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
                <span className="nav-avatar-icon">
                  <User size={15} />
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-dropdown glass-panel">
          <Link to="/" className="mobile-nav-link">Home</Link>
          <Link to="/how-it-works" className="mobile-nav-link">How It Works</Link>
          <Link to="/safety" className="mobile-nav-link">Safety & Trust</Link>
          <Link to="/about" className="mobile-nav-link">About Connectly</Link>
          <Link to="/discover" className="mobile-nav-link">Discover Profiles</Link>

          {isAuthenticated ? (
            <div className="mobile-actions">
              <Link to="/premium" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md" style={{ color: isPremium ? '#f472b6' : '#f59e0b', borderColor: isPremium ? 'rgba(236,72,153,0.4)' : 'rgba(245,158,11,0.4)' }}>
                  <Sparkles size={16} /> Connectly Premium {badge ? `(${badge})` : ''}
                </Button>
              </Link>
              <Link to="/feed" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Sparkles size={16} /> Feed & Stories
                </Button>
              </Link>
              <Link to="/explore" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Compass size={16} /> Explore &amp; Trending
                </Button>
              </Link>
              <Link to="/explore/communities" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Users size={16} /> Communities &amp; Groups
                </Button>
              </Link>
              <Link to="/likes/received" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Heart size={16} /> Who Liked You
                </Button>
              </Link>
              <Link to="/matches" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Heart size={16} /> Matches {matchCount > 0 ? `(${matchCount})` : ''}
                </Button>
              </Link>
              <Link to="/messages" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <MessageSquare size={16} /> Messages {unreadMessageCount > 0 ? `(${unreadMessageCount})` : ''}
                </Button>
              </Link>
              <Link to="/notifications" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Bell size={16} /> Activity & Notifications {unreadNotificationCount > 0 ? `(${unreadNotificationCount})` : ''}
                </Button>
              </Link>
              <Link to="/discover" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <Compass size={16} /> Discover Profiles
                </Button>
              </Link>
              <Link to="/dashboard" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <LayoutDashboard size={16} /> Dashboard ({user?.firstName})
                </Button>
              </Link>
              <Link to="/profile" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <User size={16} /> My Profile
                </Button>
              </Link>
              <Link to="/settings" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">
                  <SettingsIcon size={16} /> Settings &amp; Privacy
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" style={{ width: '100%' }}>
                  <Button variant="secondary" fullWidth size="md" style={{ color: '#818cf8', borderColor: 'rgba(99,102,241,0.4)' }}>
                    <Shield size={16} /> Admin Console
                  </Button>
                </Link>
              )}
              <Button variant="ghost" fullWidth size="md" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out
              </Button>
            </div>
          ) : (
            <div className="mobile-actions">
              <Link to="/login" style={{ width: '100%' }}>
                <Button variant="secondary" fullWidth size="md">Log In</Button>
              </Link>
              <Link to="/register" style={{ width: '100%' }}>
                <Button variant="primary" fullWidth size="md">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
