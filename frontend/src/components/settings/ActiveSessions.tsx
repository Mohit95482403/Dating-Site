import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Monitor, Globe, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';
import SettingsService from '../../services/settings.service';
import type { ActiveSessionItem } from '../../types/settings';

export const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SettingsService.getSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load active sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutOthers = async () => {
    if (!window.confirm('Are you sure you want to log out of all other sessions?')) {
      return;
    }

    try {
      setRevoking(true);
      setSuccessMsg(null);
      setErrorMsg(null);
      const res = await SettingsService.logoutOtherSessions();
      setSuccessMsg(res.message || 'All other devices have been logged out.');
      await loadSessions();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to log out other sessions.');
    } finally {
      setRevoking(false);
    }
  };

  const getDeviceIcon = (device: string, os: string) => {
    const d = (device || '').toLowerCase();
    const o = (os || '').toLowerCase();
    if (d.includes('mobile') || o.includes('android') || o.includes('ios')) {
      return <Smartphone size={22} />;
    }
    if (o.includes('windows') || o.includes('mac') || o.includes('linux')) {
      return <Laptop size={22} />;
    }
    return <Monitor size={22} />;
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  if (loading) {
    return (
      <div className="settings-empty-state">
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto var(--space-4)' }} />
        <p className="settings-empty-desc">Loading your active sessions...</p>
      </div>
    );
  }

  return (
    <div className="active-sessions-container">
      <div className="section-pane-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="section-pane-title">
              <Laptop size={24} color="var(--accent-pink)" />
              Active Sessions
            </h2>
            <p className="section-pane-desc">
              Review where you are currently signed in and terminate sessions on devices you no longer recognize.
            </p>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogoutOthers}
              disabled={revoking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: 'var(--space-2) var(--space-4)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: revoking ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              {revoking ? <Loader2 className="animate-spin" size={14} /> : <LogOut size={14} />}
              {revoking ? 'Logging out...' : 'Log out other devices'}
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="feedback-alert success" role="alert">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="feedback-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="sessions-list">
        {sessions.map((sess) => (
          <div key={sess.id} className={`session-card ${sess.isCurrent ? 'is-current' : ''}`}>
            <div className="session-meta-group">
              <div className="session-icon-wrap">
                {getDeviceIcon(sess.device, sess.os)}
              </div>
              <div className="session-info">
                <div className="session-title-line">
                  <span className="session-device-name">
                    {sess.os} • {sess.browser}
                  </span>
                  {sess.isCurrent && (
                    <span className="current-session-badge">Active Now (This Device)</span>
                  )}
                </div>
                <div className="session-details">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} /> IP: {sess.ipAddress || '127.0.0.1'}
                  </span>
                  {' • '}
                  <span>Signed in {new Date(sess.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="settings-empty-state">
            <div className="settings-empty-icon">💻</div>
            <div className="settings-empty-title">No Active Sessions Found</div>
            <p className="settings-empty-desc">Your session records will appear here as you log in.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessions;
