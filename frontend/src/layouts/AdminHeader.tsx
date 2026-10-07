import React from 'react';
import { Menu, Shield, RefreshCw, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface AdminHeaderProps {
  onToggleMobile: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenCommandPalette?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobile,
  onRefresh,
  isRefreshing = false,
  onOpenCommandPalette,
}) => {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path === '/admin') return 'Platform Overview';
    if (path.startsWith('/admin/users')) return 'User Moderation & Safety';
    if (path.startsWith('/admin/reports')) return 'Report Resolution Center';
    if (path.startsWith('/admin/verification')) return 'Identity Verification Desk';
    if (path.startsWith('/admin/support')) return 'User Support & Help Desk';
    if (path.startsWith('/admin/settings')) return 'Platform Operations & Settings';
    if (path.startsWith('/admin/features')) return 'Dynamic Feature Flags';
    if (path.startsWith('/admin/subscriptions')) return 'Subscriptions & Monetization';
    if (path.startsWith('/admin/notifications')) return 'System Announcements';
    if (path.startsWith('/admin/audit-logs')) return 'Compliance & Audit Log';
    if (path.startsWith('/admin/system-health')) return 'System Health & Security Observability';
    if (path.startsWith('/admin/analytics')) return 'Platform Performance & Analytics';
    if (path.startsWith('/admin/recommendations')) return 'Recommendation Intelligence';
    return 'Admin Console';
  };

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="admin-mobile-toggle"
          onClick={onToggleMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="admin-header-title">
          <Shield size={18} className="text-indigo-400" />
          <span>{getPageTitle(location.pathname)}</span>
        </div>
      </div>

      <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Quick Command Palette trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
        >
          <Search size={14} color="#818cf8" />
          <span className="admin-search-label">Search platform...</span>
          <span
            style={{
              fontSize: '0.68rem',
              padding: '0.1rem 0.35rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
            }}
          >
            Ctrl K
          </span>
        </button>

        {onRefresh && (
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Sync'}</span>
          </button>
        )}

        <div className="admin-status-indicator">
          <span className="admin-status-dot" />
          <span>Gateway Active</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
