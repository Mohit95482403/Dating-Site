import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserX,
  Lock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { TrustService } from '../../services/trust.service';
import type { TrustSafetyAdminOverview, AccountRestrictionItem } from '../../types/trust';
import { useToast } from '../../context/ToastContext';

export const TrustSafetyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TrustSafetyAdminOverview | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);

  // Form state for issuing restriction
  const [targetUserId, setTargetUserId] = useState('');
  const [restrictionType, setRestrictionType] = useState('MESSAGE_RESTRICTED');
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState('24');

  const toast = useToast();

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await TrustService.getAdminOverview();
      setOverview(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load Trust & Safety overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    const userIdNum = parseInt(targetUserId, 10);
    if (!userIdNum || isNaN(userIdNum)) {
      toast.error('Please enter a valid numeric User ID.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please specify a valid enforcement reason.');
      return;
    }

    try {
      setIssueLoading(true);
      await TrustService.issueRestriction({
        userId: userIdNum,
        restrictionType,
        reason: reason.trim(),
        durationHours: durationHours ? parseInt(durationHours, 10) : undefined,
      });
      toast.success('Account restriction applied successfully.');
      setModalOpen(false);
      setTargetUserId('');
      setReason('');
      loadOverview();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to apply restriction.');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevokeRestriction = async (id: number) => {
    if (!window.confirm('Are you sure you want to lift this account restriction?')) return;
    try {
      await TrustService.revokeRestriction(id);
      toast.success('Restriction revoked successfully.');
      loadOverview();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke restriction.');
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
            <ShieldAlert size={24} color="#f43f5e" />
            Trust &amp; Safety Control Room
          </h1>
          <p className="admin-page-subtitle" style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '0.25rem' }}>
            Live abuse telemetry, centralized account restrictions, security incidents, and anti-spam controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadOverview}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f43f5e',
              border: 'none',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Apply Account Restriction
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-elevated, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span>Pending Verifications</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.5rem' }}>
              {overview.metrics.pendingVerifications}
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span>Verified Users</span>
              <ShieldCheck size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', marginTop: '0.5rem' }}>
              {overview.metrics.verifiedUsers}
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span>Restricted Accounts</span>
              <Lock size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem' }}>
              {overview.metrics.restrictedAccounts}
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span>Reports Today</span>
              <AlertTriangle size={16} color="#ec4899" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ec4899', marginTop: '0.5rem' }}>
              {overview.metrics.reportsToday}
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span>Security Incidents</span>
              <ShieldAlert size={16} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.5rem' }}>
              {overview.metrics.securityEventsRecorded}
            </div>
          </div>
        </div>
      )}

      {/* Active Restrictions Table */}
      <div style={{ background: 'var(--bg-elevated, #1e293b)', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserX size={18} color="#ef4444" />
          Active Account Restrictions &amp; Disciplinary Actions
        </h3>

        {!overview || overview.activeRestrictions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <p>No active disciplinary restrictions currently enforced. Community standing is clean.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="admin-table" style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>User ID</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Reason</th>
                  <th style={{ padding: '0.75rem' }}>Issued At</th>
                  <th style={{ padding: '0.75rem' }}>Expires</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {overview.activeRestrictions.map((rst: AccountRestrictionItem) => (
                  <tr key={rst.id} style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>User #{rst.userId}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        {rst.restrictionType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{rst.reason}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{new Date(rst.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                      {rst.expiresAt ? new Date(rst.expiresAt).toLocaleString() : 'Permanent'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Enforced</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => handleRevokeRestriction(rst.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Issuing Restriction */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} color="#f43f5e" />
              Apply Disciplinary Restriction
            </h3>

            <form onSubmit={handleIssueRestriction}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Target User ID *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 42"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Restriction Scope *
                </label>
                <select
                  value={restrictionType}
                  onChange={(e) => setRestrictionType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                >
                  <option value="MESSAGE_RESTRICTED">MESSAGE_RESTRICTED (Cannot send chat messages)</option>
                  <option value="LIKE_RESTRICTED">LIKE_RESTRICTED (Cannot swipe/send likes)</option>
                  <option value="COMMUNITY_RESTRICTED">COMMUNITY_RESTRICTED (Cannot post in groups/events)</option>
                  <option value="TEMPORARILY_LOCKED">TEMPORARILY_LOCKED (Account lock)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Duration (Hours, leave blank for permanent)
                </label>
                <input
                  type="number"
                  placeholder="24"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Moderation Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify violation (e.g. unsolicited spam, inappropriate conduct)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoading}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: issueLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {issueLoading ? 'Applying...' : 'Enforce Restriction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustSafetyPage;
