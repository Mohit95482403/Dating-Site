import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminUserDetail } from '../../types/admin';
import { SuspendUserModal } from '../../components/admin/SuspendUserModal';
import { BanUserModal } from '../../components/admin/BanUserModal';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { useToast } from '../../context/ToastContext';
import { getMediaUrl } from '../../utils/media';

export const AdminUserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [showResetSessionsModal, setShowResetSessionsModal] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getUserDetail(Number(userId));
      setDetail(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch user details.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSuspend = async (reason: string) => {
    if (!detail) return;
    await adminService.suspendUser(detail.account.id, reason);
    toast.success('Account suspended successfully.');
    fetchDetail();
  };

  const handleBan = async (reason: string) => {
    if (!detail) return;
    await adminService.banUser(detail.account.id, reason);
    toast.success('Account banned permanently.');
    fetchDetail();
  };

  const handleUnsuspend = async () => {
    if (!detail) return;
    await adminService.unsuspendUser(detail.account.id);
    toast.success('Suspension lifted.');
    fetchDetail();
  };

  const handleUnban = async () => {
    if (!detail) return;
    await adminService.unbanUser(detail.account.id);
    toast.success('Ban removed.');
    fetchDetail();
  };

  const handleResetSessions = async () => {
    if (!detail) return;
    await adminService.resetSessions(detail.account.id);
    toast.success('Active sessions revoked.');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
        <p>Loading user inspection profile...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <AlertTriangle size={32} color="#f87171" style={{ margin: '0 auto 0.75rem' }} />
        <h3 style={{ color: '#ffffff' }}>User Not Found</h3>
        <p style={{ color: '#94a3b8', margin: '0.5rem 0 1.25rem' }}>{error || 'Unable to retrieve user record.'}</p>
        <button type="button" className="admin-btn admin-btn-outline" onClick={() => navigate('/admin/users')}>
          Return to Users Directory
        </button>
      </div>
    );
  }

  const { account, profile, safety, activity, moderationHistory } = detail;

  return (
    <div>
      {/* Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/admin/users" className="admin-btn admin-btn-outline" style={{ padding: '0.4rem 0.75rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Users</span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>
            {profile.firstName || 'Member'} {profile.lastName || ''} (ID: #{account.id})
          </h1>
        </div>

        {/* Action Buttons */}
        {account.role !== 'admin' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {account.status === 'suspended' ? (
              <button
                type="button"
                className="admin-btn admin-btn-success"
                onClick={() => setShowUnsuspendModal(true)}
              >
                <RotateCcw size={14} />
                <span>Lift Suspension</span>
              </button>
            ) : account.status === 'banned' ? (
              <button
                type="button"
                className="admin-btn admin-btn-success"
                onClick={() => setShowUnbanModal(true)}
              >
                <RotateCcw size={14} />
                <span>Remove Ban</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn-warning"
                  onClick={() => setShowSuspendModal(true)}
                >
                  <AlertTriangle size={14} />
                  <span>Suspend</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={() => setShowBanModal(true)}
                >
                  <ShieldAlert size={14} />
                  <span>Ban Account</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => setShowResetSessionsModal(true)}
            >
              <KeyRound size={14} />
              <span>Reset Sessions</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* 1. Account Section */}
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: '1rem' }}>
            <Shield size={18} className="text-indigo-400" />
            <span>Account Security & Status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Status:</span>
              <span className={`admin-status-badge ${account.status}`}>{account.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Email:</span>
              <span style={{ color: '#ffffff' }}>{account.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Role:</span>
              <span style={{ color: '#ffffff', textTransform: 'capitalize' }}>{account.role}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Email Verified:</span>
              <span style={{ color: account.isEmailVerified ? '#34d399' : '#f87171' }}>
                {account.isEmailVerified ? 'Yes' : 'No'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Registration:</span>
              <span style={{ color: '#ffffff' }}>{new Date(account.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Last Active:</span>
              <span style={{ color: '#ffffff' }}>
                {account.lastSeenAt ? new Date(account.lastSeenAt).toLocaleString() : (account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : 'Never')}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Safety & Risk Signals */}
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} className="text-pink-400" />
            <span>Safety & Risk Assessment</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Reports Received:</span>
              <span style={{ fontWeight: 700, color: safety.reportsReceived > 0 ? '#f87171' : '#34d399' }}>
                {safety.reportsReceived} reports
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Reports Submitted:</span>
              <span style={{ color: '#ffffff' }}>{safety.reportsSubmitted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Block Involvements:</span>
              <span style={{ color: '#ffffff' }}>{safety.blocksCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Identity Verification:</span>
              <span style={{ textTransform: 'capitalize', color: safety.verificationStatus === 'verified' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {safety.verificationStatus.replace('_', ' ')}
              </span>
            </div>
            {safety.verificationDocumentUrl && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>ID Document:</span>
                <a
                  href={safety.verificationDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span>View Doc</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 3. Platform Activity */}
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: '1rem' }}>
            <Heart size={18} className="text-red-400" />
            <span>Platform Activity Metrics</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Active Matches:</span>
              <span style={{ fontWeight: 700, color: '#ec4899' }}>{activity.matchesCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Messages Sent:</span>
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>{activity.messagesSentCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Profile Completion:</span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{profile.completionPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Profile Inspection & Media Gallery */}
      <div className="admin-card">
        <div className="admin-card-title" style={{ marginBottom: '1rem' }}>
          <span>Profile Photos ({profile.photos.length})</span>
        </div>

        {profile.photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {profile.photos.map((p) => (
              <div
                key={p.id}
                style={{
                  height: '160px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: p.isPrimary ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <img src={getMediaUrl(p.fileUrl)} alt="User media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {p.isPrimary && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: '#6366f1',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px'
                  }}>
                    PRIMARY
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>No uploaded photos found.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <span className="admin-input-label">Bio Description</span>
            <div style={{ background: '#0d0f18', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', minHeight: '60px', fontSize: '0.88rem' }}>
              {profile.bio || 'No biography written.'}
            </div>
          </div>

          <div>
            <span className="admin-input-label">Interests ({profile.interests.length})</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: '#0d0f18', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {profile.interests.length > 0 ? (
                profile.interests.map((it) => (
                  <span
                    key={it.id}
                    style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem' }}
                  >
                    #{it.name}
                  </span>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>None selected</span>
              )}
            </div>
          </div>
        </div>

        {profile.prompts.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <span className="admin-input-label">Profile Prompts</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.4rem' }}>
              {profile.prompts.map((pr) => (
                <div key={pr.id} style={{ background: '#0d0f18', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.25rem' }}>{pr.promptText}</div>
                  <div style={{ fontSize: '0.88rem', color: '#ffffff' }}>"{pr.answerText}"</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Moderation Actions History */}
      <div className="admin-card">
        <div className="admin-card-title" style={{ marginBottom: '1rem' }}>
          <ShieldAlert size={18} className="text-yellow-400" />
          <span>Moderation History Log ({moderationHistory.length})</span>
        </div>

        {moderationHistory.length > 0 ? (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Reason / Justification</th>
                  <th>Moderating Admin</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {moderationHistory.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={`admin-status-badge ${m.action.toLowerCase().includes('suspend') ? 'suspended' : m.action.toLowerCase().includes('ban') ? 'banned' : 'active'}`}>
                        {m.action}
                      </span>
                    </td>
                    <td>{m.reason}</td>
                    <td>{m.adminName} (ID: #{m.adminId})</td>
                    <td>{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No disciplinary or moderation actions have been recorded against this user.</p>
        )}
      </div>

      {/* Modals */}
      <SuspendUserModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        userId={account.id}
        userName={profile.firstName || 'User'}
        onConfirm={handleSuspend}
      />

      <BanUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        userId={account.id}
        userName={profile.firstName || 'User'}
        onConfirm={handleBan}
      />

      <ConfirmActionModal
        isOpen={showUnsuspendModal}
        onClose={() => setShowUnsuspendModal(false)}
        title="Lift Account Suspension"
        message={`Reactivate account access for ${profile.firstName || 'User'} (${account.email})?`}
        confirmText="Lift Suspension"
        confirmVariant="success"
        onConfirm={handleUnsuspend}
      />

      <ConfirmActionModal
        isOpen={showUnbanModal}
        onClose={() => setShowUnbanModal(false)}
        title="Remove Permanent Ban"
        message={`Restore platform privileges for ${profile.firstName || 'User'} (${account.email})?`}
        confirmText="Remove Ban"
        confirmVariant="success"
        onConfirm={handleUnban}
      />

      <ConfirmActionModal
        isOpen={showResetSessionsModal}
        onClose={() => setShowResetSessionsModal(false)}
        title="Revoke Active Sessions"
        message={`Force disconnect and invalidate all sessions for ${profile.firstName || 'User'}?`}
        confirmText="Revoke Sessions"
        confirmVariant="warning"
        onConfirm={handleResetSessions}
      />
    </div>
  );
};

export default AdminUserDetailsPage;
