import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ShieldCheck,
  Bell,
  FileText,
  BarChart3,
  ExternalLink,
  Shield,
  CreditCard,
  BrainCircuit,
  Activity,
  X,
  LifeBuoy,
  Settings,
  Flag,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingReportsCount?: number;
  pendingVerificationsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  pendingReportsCount = 0,
  pendingVerificationsCount = 0,
}) => {
  const { user } = useAuth();

  return (
    <>
      {isOpen && <div className="admin-backdrop-mobile" onClick={onClose} />}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo-area" onClick={onClose}>
            <div className="admin-logo-icon">
              <Shield size={20} />
            </div>
            <div>
              <span className="admin-logo-text">Connectly</span>
              <span className="admin-badge-sub">Admin</span>
            </div>
          </Link>
          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav-group">
          <span className="admin-nav-label">Core Operations</span>

          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Users size={18} />
              <span>Users</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/reports"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <AlertTriangle size={18} />
              <span>Reports</span>
            </div>
            {pendingReportsCount > 0 && (
              <span className="admin-nav-badge">{pendingReportsCount}</span>
            )}
          </NavLink>

          <NavLink
            to="/admin/verification"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <ShieldCheck size={18} />
              <span>Verification</span>
            </div>
            {pendingVerificationsCount > 0 && (
              <span className="admin-nav-badge blue">{pendingVerificationsCount}</span>
            )}
          </NavLink>

          <NavLink
            to="/admin/content"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <FileText size={18} />
              <span>Content</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/trust-safety"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Shield size={18} color="#f43f5e" />
              <span>Trust &amp; Safety</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/support"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <LifeBuoy size={18} color="#38bdf8" />
              <span>Support Desk</span>
            </div>
          </NavLink>

          <span className="admin-nav-label" style={{ marginTop: '0.75rem' }}>Management & Logs</span>

          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Settings size={18} color="#fbbf24" />
              <span>Platform Settings</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/features"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Flag size={18} color="#ec4899" />
              <span>Feature Flags</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/notifications"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Bell size={18} />
              <span>Announcements</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/audit-logs"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <FileText size={18} />
              <span>Audit Logs</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/system-health"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <Activity size={18} color="#34d399" />
              <span>System Health</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/analytics"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <BarChart3 size={18} />
              <span>Analytics</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/subscriptions"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <CreditCard size={18} />
              <span>Subscriptions</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/recommendations"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="admin-nav-item-left">
              <BrainCircuit size={18} color="#ec4899" />
              <span>Recommendations</span>
            </div>
          </NavLink>

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <Link
              to="/dashboard"
              className="admin-nav-item"
              style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.08)' }}
              onClick={onClose}
            >
              <div className="admin-nav-item-left">
                <ExternalLink size={18} />
                <span>Return to App</span>
              </div>
            </Link>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-profile-chip">
            <div className="admin-avatar">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="admin-info">
              <span className="admin-info-name">{user?.firstName || 'Administrator'}</span>
              <span className="admin-info-role">Security Ops</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
