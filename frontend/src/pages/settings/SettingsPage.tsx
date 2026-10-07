import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import SettingsSidebar from '../../components/settings/SettingsSidebar';
import AccountSettings from '../../components/settings/AccountSettings';
import PrivacySettings from '../../components/settings/PrivacySettings';
import SecuritySettings from '../../components/settings/SecuritySettings';
import ActiveSessions from '../../components/settings/ActiveSessions';
import NotificationSettings from '../../components/settings/NotificationSettings';
import DiscoverySettings from '../../components/settings/DiscoverySettings';
import BlockedUsers from '../../components/settings/BlockedUsers';
import DangerZone from '../../components/settings/DangerZone';
import SubscriptionSettings from '../../components/settings/SubscriptionSettings';
import PersonalizationSettingsTab from '../../components/personalization/PersonalizationSettingsTab';
import TrustCenterPage from './TrustCenterPage';
import { UserReportsList } from '../../components/trust/UserReportsList';
import SettingsService from '../../services/settings.service';
import { TrustService } from '../../services/trust.service';
import type { UserSettings, SettingsSectionId } from '../../types/settings';
import type { UserSubmittedReportItem } from '../../types/trust';
import '../../components/settings/Settings.css';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsSectionId) || 'account';

  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialTab);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [userReports, setUserReports] = useState<UserSubmittedReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') as SettingsSectionId;
    if (tab && tab !== activeSection) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeSection === 'reports') {
      loadReportsData();
    }
  }, [activeSection]);

  const loadReportsData = async () => {
    try {
      setReportsLoading(true);
      const reports = await TrustService.getUserReports();
      setUserReports(reports);
    } catch {
      // Ignore or empty
    } finally {
      setReportsLoading(false);
    }
  };

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [settingsData, blockedData, sessionsData] = await Promise.all([
        SettingsService.getSettings(),
        SettingsService.getBlockedUsers().catch(() => []),
        SettingsService.getSessions().catch(() => []),
      ]);
      setSettings(settingsData);
      setBlockedCount(blockedData.length);
      setSessionsCount(sessionsData.length || 1);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSection = (section: SettingsSectionId) => {
    setActiveSection(section);
    setSearchParams({ tab: section });
  };

  return (
    <div className="settings-page-container">
      {/* Header */}
      <header className="settings-header">
        <h1 className="settings-title">
          <SettingsIcon size={32} color="var(--accent-pink)" />
          <span>Account &amp; Privacy <span className="settings-title-gradient">Settings</span></span>
        </h1>
        <p className="settings-subtitle">
          Manage your personal details, privacy controls, active sessions, and communication preferences.
        </p>
      </header>

      {loading ? (
        <div className="settings-content-pane" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-pink)" style={{ marginBottom: 'var(--space-4)' }} />
          <p className="settings-empty-desc">Loading your preferences...</p>
        </div>
      ) : errorMsg ? (
        <div className="settings-content-pane">
          <div className="feedback-alert error" style={{ marginBottom: 'var(--space-6)' }}>
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadSettingsData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      ) : (
        <div className="settings-layout">
          {/* Left Navigation Sidebar */}
          <SettingsSidebar
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            blockedCount={blockedCount}
            sessionsCount={sessionsCount}
          />

          {/* Right Content Pane */}
          <main className="settings-content-pane" id="settings-main-content">
            {activeSection === 'account' && <AccountSettings />}

            {activeSection === 'subscription' && <SubscriptionSettings />}

            {activeSection === 'privacy' && settings && (
              <PrivacySettings settings={settings} onUpdate={setSettings} />
            )}

            {activeSection === 'security' && <SecuritySettings />}

            {activeSection === 'sessions' && <ActiveSessions />}

            {activeSection === 'notifications' && settings && (
              <NotificationSettings settings={settings} onUpdate={setSettings} />
            )}

            {activeSection === 'discovery' && settings && (
              <DiscoverySettings settings={settings} onUpdate={setSettings} />
            )}

            {activeSection === 'personalization' && <PersonalizationSettingsTab />}

            {activeSection === 'blocked' && (
              <BlockedUsers onCountChange={setBlockedCount} />
            )}

            {activeSection === 'trust' && <TrustCenterPage />}

            {activeSection === 'reports' && (
              <UserReportsList reports={userReports} loading={reportsLoading} />
            )}

            {activeSection === 'danger' && <DangerZone />}
          </main>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
