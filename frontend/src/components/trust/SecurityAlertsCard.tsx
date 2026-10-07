import React from 'react';
import type { SecurityEventItem } from '../../types/trust';
import './trust.css';

interface SecurityAlertsCardProps {
  events: SecurityEventItem[];
  loading?: boolean;
}

export const SecurityAlertsCard: React.FC<SecurityAlertsCardProps> = ({ events, loading }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS':
        return '🟢';
      case 'LOGIN_FAILED':
        return '🔴';
      case 'PASSWORD_CHANGED':
        return '🔑';
      case '2FA_ENABLED':
      case '2FA_VERIFIED':
        return '🛡️';
      case '2FA_DISABLED':
        return '⚠️';
      case 'SESSION_REVOKED':
      case 'ALL_SESSIONS_REVOKED':
        return '🚪';
      case 'PHONE_VERIFIED':
      case 'EMAIL_VERIFIED':
        return '✅';
      case 'IDENTITY_VERIFIED':
        return '⭐';
      default:
        return '🔒';
    }
  };

  const getEventLabel = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="trust-card">
      <div className="trust-card-header">
        <div className="trust-card-title-group">
          <span className="trust-card-icon">📜</span>
          <div>
            <h3 className="trust-card-title">Recent Security Activity</h3>
            <p className="trust-card-subtitle">
              Audit log of logins, credential updates, and authentication state changes.
            </p>
          </div>
        </div>
      </div>

      <div className="trust-card-body">
        {loading ? (
          <div className="trust-loading-box">
            <div className="trust-spinner" />
            <p>Loading security audit log...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="trust-empty-box">
            <span>🛡️</span>
            <p>No recent security events recorded.</p>
          </div>
        ) : (
          <div className="trust-events-timeline">
            {events.map((evt) => (
              <div key={evt.id} className="trust-event-item">
                <div className="trust-event-badge">{getEventIcon(evt.eventType)}</div>
                <div className="trust-event-details">
                  <div className="trust-event-headline">
                    <strong>{getEventLabel(evt.eventType)}</strong>
                    <span className="trust-event-time">{formatDate(evt.createdAt)}</span>
                  </div>
                  <div className="trust-event-meta">
                    {evt.deviceInfo && <span>Device: {evt.deviceInfo}</span>}
                    {evt.ipAddress && <span>• IP: {evt.ipAddress}</span>}
                  </div>
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="trust-event-meta" style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                      {Object.entries(evt.metadata)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' | ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
