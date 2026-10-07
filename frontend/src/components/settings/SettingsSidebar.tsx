import React from 'react';
import {
  User,
  Shield,
  KeyRound,
  Bell,
  Compass,
  UserX,
  Laptop,
  AlertTriangle,
  Sparkles,
  BrainCircuit,
} from 'lucide-react';
import type { SettingsSectionId } from '../../types/settings';

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  blockedCount?: number;
  sessionsCount?: number;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSelectSection,
  blockedCount = 0,
  sessionsCount = 1,
}) => {
  return (
    <aside className="settings-sidebar" aria-label="Settings navigation">
      <div className="sidebar-category-label">Account</div>
      <ul className="settings-nav-list">
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'account' ? 'active' : ''}`}
            onClick={() => onSelectSection('account')}
          >
            <User size={18} />
            <span>Account Info</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'subscription' ? 'active' : ''}`}
            onClick={() => onSelectSection('subscription')}
          >
            <Sparkles size={18} color="#ec4899" />
            <span>Membership &amp; Billing</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-category-label">Privacy & Security</div>
      <ul className="settings-nav-list">
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'privacy' ? 'active' : ''}`}
            onClick={() => onSelectSection('privacy')}
          >
            <Shield size={18} />
            <span>Privacy</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'security' ? 'active' : ''}`}
            onClick={() => onSelectSection('security')}
          >
            <KeyRound size={18} />
            <span>Password & Security</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'sessions' ? 'active' : ''}`}
            onClick={() => onSelectSection('sessions')}
          >
            <Laptop size={18} />
            <span>Active Sessions</span>
            {sessionsCount > 0 && <span className="settings-nav-badge">{sessionsCount}</span>}
          </button>
        </li>
      </ul>

      <div className="sidebar-category-label">Preferences</div>
      <ul className="settings-nav-list">
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => onSelectSection('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'discovery' ? 'active' : ''}`}
            onClick={() => onSelectSection('discovery')}
          >
            <Compass size={18} />
            <span>Discovery</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'personalization' ? 'active' : ''}`}
            onClick={() => onSelectSection('personalization')}
          >
            <BrainCircuit size={18} color="#f43f5e" />
            <span>AI Personalization</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-category-label">Safety & Trust</div>
      <ul className="settings-nav-list">
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'trust' ? 'active' : ''}`}
            onClick={() => onSelectSection('trust')}
          >
            <Shield size={18} color="#10b981" />
            <span>Trust &amp; Verification</span>
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'blocked' ? 'active' : ''}`}
            onClick={() => onSelectSection('blocked')}
          >
            <UserX size={18} />
            <span>Blocked Users</span>
            {blockedCount > 0 && <span className="settings-nav-badge">{blockedCount}</span>}
          </button>
        </li>
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button ${activeSection === 'reports' ? 'active' : ''}`}
            onClick={() => onSelectSection('reports')}
          >
            <AlertTriangle size={18} color="#f59e0b" />
            <span>Report History</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-category-label">Danger</div>
      <ul className="settings-nav-list">
        <li className="settings-nav-item">
          <button
            type="button"
            className={`settings-nav-button danger ${activeSection === 'danger' ? 'active' : ''}`}
            onClick={() => onSelectSection('danger')}
          >
            <AlertTriangle size={18} />
            <span>Danger Zone</span>
          </button>
        </li>
      </ul>
    </aside>
  );
};

export default SettingsSidebar;
