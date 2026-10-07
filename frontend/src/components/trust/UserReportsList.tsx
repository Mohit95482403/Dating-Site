import React from 'react';
import type { UserSubmittedReportItem } from '../../types/trust';
import './trust.css';

interface UserReportsListProps {
  reports: UserSubmittedReportItem[];
  loading?: boolean;
}

export const UserReportsList: React.FC<UserReportsListProps> = ({ reports, loading }) => {
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTION_TAKEN':
      case 'RESOLVED':
        return <span className="trust-status-badge verified">✓ Action Taken</span>;
      case 'UNDER_REVIEW':
      case 'INVESTIGATING':
        return <span className="trust-status-badge pending">⏳ Under Review</span>;
      case 'DISMISSED':
        return <span className="trust-status-badge rejected">Dismissed</span>;
      case 'CLOSED':
        return <span className="trust-status-badge closed">Closed</span>;
      default:
        return <span className="trust-status-badge submitted">Submitted</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="trust-card">
      <div className="trust-card-header">
        <div className="trust-card-title-group">
          <span className="trust-card-icon">🚩</span>
          <div>
            <h3 className="trust-card-title">Your Submitted Reports</h3>
            <p className="trust-card-subtitle">
              Transparency tracking for safety reports you've submitted to our moderation team.
            </p>
          </div>
        </div>
      </div>

      <div className="trust-card-body">
        {loading ? (
          <div className="trust-loading-box">
            <div className="trust-spinner" />
            <p>Loading your reports history...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="trust-empty-box">
            <span>🛡️</span>
            <p>You haven't submitted any reports. Connectly is committed to keeping you safe.</p>
          </div>
        ) : (
          <div className="trust-table-wrapper">
            <table className="trust-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target / Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => (
                  <tr key={rep.id}>
                    <td>
                      <span className="trust-report-type">{rep.targetType || 'User'}</span>
                    </td>
                    <td>
                      <strong>{rep.targetName || `ID #${rep.targetId || rep.id}`}</strong>
                    </td>
                    <td>{formatDate(rep.createdAt)}</td>
                    <td>{getStatusBadge(rep.status)}</td>
                    <td>
                      <span className="trust-text-muted" style={{ maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rep.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
