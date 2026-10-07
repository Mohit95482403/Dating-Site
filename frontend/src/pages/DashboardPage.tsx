import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { authService } from '../services/auth.service';
import personalizationService from '../services/personalization.service';
import type { Session } from '../types/auth';
import type { PersonalizedHomeResponse, FeedbackType, ScoredRecommendation } from '../types/personalization';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import { useToast } from '../hooks/useToast';
import RecommendationCard from '../components/personalization/RecommendationCard';
import { 
  Sparkles, 
  ShieldCheck, 
  Compass, 
  Heart, 
  MessageSquare, 
  User as UserIcon, 
  Laptop, 
  LogOut, 
  Smartphone,
  Globe,
  RotateCw,
  Users,
  Calendar,
  Flame,
  ArrowRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import './DashboardPage.css';
import '../components/personalization/personalization.css';

export const DashboardPage: React.FC = () => {
  const { user, logout, logoutAll } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Day 26: Personalized Home State
  const [homeData, setHomeData] = useState<PersonalizedHomeResponse | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPersonalizedHome = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const data = await personalizationService.getPersonalizedHome(force);
      setHomeData(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoadingHome(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonalizedHome(false);

    // Sessions loader
    let isMounted = true;
    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const list = await authService.getSessions();
        if (isMounted) setSessions(list);
      } catch {
        // sessions endpoint is secondary
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    };
    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [fetchPersonalizedHome]);

  // Real-time recommendation updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleRecommendationsUpdated = (_payload: { reason?: string }) => {
      // Seamless background update
      fetchPersonalizedHome(true);
    };

    socket.on('recommendations:updated', handleRecommendationsUpdated);
    return () => {
      socket.off('recommendations:updated', handleRecommendationsUpdated);
    };
  }, [socket, fetchPersonalizedHome]);

  const handleFeedback = async (
    recommendationType: any,
    entityId: string | number,
    feedbackType: FeedbackType
  ) => {
    try {
      await personalizationService.submitFeedback(recommendationType, entityId, feedbackType);
      toast.success(feedbackType === 'NOT_INTERESTED' ? 'Recommendation dismissed' : 'Preferences updated');

      // Optimistically remove from state
      if (homeData) {
        const strId = String(entityId);
        setHomeData({
          ...homeData,
          people: homeData.people.filter((p) => String(p.item.user_id) !== strId),
          communities: homeData.communities.filter((c) => String(c.item.id) !== strId),
          events: homeData.events.filter((e) => String(e.item.id) !== strId),
          posts: homeData.posts.filter((po) => String(po.item.id) !== strId),
          trending: homeData.trending.filter((t) => String(t.item.id) !== strId),
        });
      }
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  const handleActionClick = (recommendation: ScoredRecommendation<any>) => {
    const { item, recommendationType } = recommendation;
    personalizationService.recordExposure(recommendationType, item.id || item.user_id, 'CLICKED');

    switch (recommendationType) {
      case 'PEOPLE':
        navigate(`/profile/${item.user_id}`);
        break;
      case 'COMMUNITY':
        navigate(`/communities/${item.slug || item.id}`);
        break;
      case 'EVENT':
        navigate(`/communities/${item.community_slug || 'events'}`);
        break;
      case 'POST':
        navigate(`/feed?post=${item.id}`);
        break;
      case 'TRENDING':
        navigate(`/explore?q=%23${encodeURIComponent(item.name)}`);
        break;
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out of all active devices?')) {
      return;
    }
    setLoggingOut(true);
    try {
      await logoutAll();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked successfully.');
    } catch {
      toast.error('Failed to revoke session.');
    }
  };

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-page">
      <Container>
        {/* Profile Completion Callout (Day 6 Onboarding) */}
        {!user?.isProfileComplete && (
          <div className="onboarding-callout-banner glass-panel">
            <div className="callout-text-wrap">
              <span className="callout-pill">Profile Setup Incomplete</span>
              <h3>Finish your profile to start matching!</h3>
              <p>Add your bio, interests, and photos so other members can discover your vibe.</p>
            </div>
            <Link to="/onboarding" className="callout-action-link">
              <Button variant="glow" size="md" className="callout-btn">
                Complete Onboarding →
              </Button>
            </Link>
          </div>
        )}

        {/* Personalized Home Greeting Banner */}
        <div className="personalized-home-header glass-panel">
          <div className="personalized-greeting-wrap">
            <h1>
              {getGreetingTime()}, <span className="highlight-name">{user?.firstName || 'Friend'}</span>
            </h1>
            <p>Your personalized Connectly experience • Continually learning what sparks your passion</p>
          </div>

          <button
            className="refresh-recommendations-btn"
            onClick={() => fetchPersonalizedHome(true)}
            disabled={refreshing}
            title="Refresh personalized recommendations"
          >
            <RotateCw size={15} className={`refresh-icon ${refreshing ? 'spinning' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh For You'}</span>
          </button>
        </div>

        {/* ────────── SECTION 1: PEOPLE YOU MAY LIKE ────────── */}
        {loadingHome ? (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <Sparkles size={20} className="section-accent-icon" /> People You May Like
              </h3>
            </div>
            <div className="cards-horizontal-grid">
              <div className="recommendation-skeleton-card" />
              <div className="recommendation-skeleton-card" />
              <div className="recommendation-skeleton-card" />
              <div className="recommendation-skeleton-card" />
            </div>
          </div>
        ) : homeData && homeData.people.length > 0 ? (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <Sparkles size={20} className="section-accent-icon" /> People You May Like
              </h3>
              <Link to="/discover" className="section-link-more">
                Explore All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="cards-horizontal-grid">
              {homeData.people.map((rec) => (
                <RecommendationCard
                  key={rec.item.user_id}
                  recommendation={rec}
                  onFeedback={handleFeedback}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* ────────── SECTION 2: COMMUNITIES FOR YOU ────────── */}
        {homeData && homeData.communities.length > 0 && (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <Users size={20} className="section-accent-icon" /> Communities For You
              </h3>
              <Link to="/communities" className="section-link-more">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="cards-horizontal-grid">
              {homeData.communities.map((rec) => (
                <RecommendationCard
                  key={rec.item.id}
                  recommendation={rec}
                  onFeedback={handleFeedback}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ────────── SECTION 3: EVENTS FOR YOU ────────── */}
        {homeData && homeData.events.length > 0 && (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <Calendar size={20} className="section-accent-icon" /> Events You May Like
              </h3>
              <Link to="/communities" className="section-link-more">
                Explore Events <ArrowRight size={14} />
              </Link>
            </div>
            <div className="cards-horizontal-grid">
              {homeData.events.map((rec) => (
                <RecommendationCard
                  key={rec.item.id}
                  recommendation={rec}
                  onFeedback={handleFeedback}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ────────── SECTION 4: TRENDING FOR YOU ────────── */}
        {homeData && homeData.trending.length > 0 && (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <TrendingUp size={20} className="section-accent-icon" /> Trending For You
              </h3>
              <Link to="/explore" className="section-link-more">
                Explore Trends <ArrowRight size={14} />
              </Link>
            </div>
            <div className="cards-horizontal-grid">
              {homeData.trending.map((rec) => (
                <RecommendationCard
                  key={rec.item.id}
                  recommendation={rec}
                  onFeedback={handleFeedback}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ────────── SECTION 5: POSTS YOU MAY LIKE ────────── */}
        {homeData && homeData.posts.length > 0 && (
          <div className="personalized-section-block">
            <div className="section-header-row">
              <h3 className="section-header-title">
                <Flame size={20} className="section-accent-icon" /> Posts You May Like
              </h3>
              <Link to="/feed" className="section-link-more">
                Open Feed <ArrowRight size={14} />
              </Link>
            </div>
            <div className="cards-horizontal-grid">
              {homeData.posts.map((rec) => (
                <RecommendationCard
                  key={rec.item.id}
                  recommendation={rec}
                  onFeedback={handleFeedback}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Welcome & Account Summary Card */}
        <div className="dashboard-hero-card glass-panel intelligence-hub-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge">
              <BrainCircuit size={14} className="sparkle-icon" />
              <span>Connectly Intelligence Hub • Day 26 Behavioral Personalization</span>
            </div>
            <h2 className="dashboard-title intelligence-hub-title">
              Connected as <span className="highlight-name">{user?.firstName || 'Friend'}</span>
            </h2>
            <p className="dashboard-subtitle">
              Your preferences are continuously updated with complete data transparency and security.
            </p>

            <div className="user-meta-tags">
              <span className="meta-tag">
                <ShieldCheck size={14} className="meta-icon verified" />
                {user?.isEmailVerified ? 'Email Verified' : 'Account Active'}
              </span>
              <span className="meta-tag">
                Role: <strong>{user?.role?.toUpperCase()}</strong>
              </span>
              <span className="meta-tag">
                ID: <strong>#{user?.id}</strong>
              </span>
              <span className="meta-tag email-tag">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="dashboard-hero-actions">
            <Button
              variant="outline"
              size="md"
              onClick={handleLogout}
              disabled={loggingOut}
              className="dashboard-signout-btn"
            >
              <LogOut size={16} />
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Feature Navigation Cards */}
        <h2 className="section-title">Explore Your Connectly Hub</h2>
        <div className="feature-grid">
          <Link to="/discover" className="feature-card glass-panel">
            <div className="feature-icon-wrap discover-icon">
              <Compass size={24} />
            </div>
            <h3>Discover Profiles</h3>
            <p>Browse high-vibe compatibility profiles in your area.</p>
            <span className="feature-link-text">Launch Discovery →</span>
          </Link>

          <Link to="/communities" className="feature-card glass-panel">
            <div className="feature-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Users size={24} />
            </div>
            <h3>Communities & Groups</h3>
            <p>Join vibrant lifestyle clubs, shared hobbies, and meetups.</p>
            <span className="feature-link-text">Explore Communities →</span>
          </Link>

          <Link to="/matches" className="feature-card glass-panel">
            <div className="feature-icon-wrap matches-icon">
              <Heart size={24} />
            </div>
            <h3>Mutual Matches</h3>
            <p>See mutual connections and view shared interests.</p>
            <span className="feature-link-text">View Matches →</span>
          </Link>

          <Link to="/messages" className="feature-card glass-panel">
            <div className="feature-icon-wrap messages-icon">
              <MessageSquare size={24} />
            </div>
            <h3>Real-Time Messenger</h3>
            <p>Instant chat with typing indicators and read receipts.</p>
            <span className="feature-link-text">Open Chats →</span>
          </Link>

          <Link to="/settings?tab=personalization" className="feature-card glass-panel">
            <div className="feature-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
              <BrainCircuit size={24} />
            </div>
            <h3>Personalization Settings</h3>
            <p>Configure discovery algorithms, interest models, and reset options.</p>
            <span className="feature-link-text">Manage Preferences →</span>
          </Link>

          <Link to="/profile" className="feature-card glass-panel">
            <div className="feature-icon-wrap profile-icon">
              <UserIcon size={24} />
            </div>
            <h3>Edit Profile</h3>
            <p>Update your bio, photos, and discovery filters.</p>
            <span className="feature-link-text">Edit Profile →</span>
          </Link>
        </div>

        {/* Active Sessions */}
        <div className="sessions-card glass-panel">
          <div className="sessions-card-header">
            <div>
              <h3>Active Device Sessions</h3>
              <p>Review active logins associated with your Connectly account.</p>
            </div>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                disabled={loggingOut}
                className="logout-all-btn"
              >
                Log Out All Other Devices
              </Button>
            )}
          </div>

          {loadingSessions ? (
            <div className="sessions-loading">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="sessions-loading">Current browser session is active.</div>
          ) : (
            <div className="sessions-list">
              {sessions.map((sess) => {
                const isMobile = sess.userAgent?.toLowerCase().includes('mobile');
                return (
                  <div key={sess.id} className="session-item">
                    <div className="session-icon">
                      {isMobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                    </div>
                    <div className="session-info">
                      <div className="session-title">
                        <span>{sess.userAgent?.substring(0, 50) || 'Unknown Browser / Device'}</span>
                        {sess.isCurrent && <span className="current-badge">This Device</span>}
                      </div>
                      <div className="session-meta">
                        <span>
                          <Globe size={12} /> IP: {sess.ipAddress || '127.0.0.1'}
                        </span>
                        <span>•</span>
                        <span>Logged in: {new Date(sess.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!sess.isCurrent && (
                      <button
                        type="button"
                        className="session-revoke-btn"
                        onClick={() => handleRevokeSession(sess.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default DashboardPage;
