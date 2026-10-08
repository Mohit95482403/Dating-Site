import React, { useState, useEffect } from 'react';
import { UserX, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SettingsService from '../../services/settings.service';
import type { BlockedUserItem } from '../../types/settings';
import { getMediaUrl } from '../../utils/media';

interface BlockedUsersProps {
  onCountChange?: (count: number) => void;
}

export const BlockedUsers: React.FC<BlockedUsersProps> = ({ onCountChange }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SettingsService.getBlockedUsers();
      setBlockedUsers(data);
      if (onCountChange) onCountChange(data.length);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load blocked users list.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (targetUserId: number, displayName: string) => {
    try {
      setUnblockingId(targetUserId);
      setSuccessMsg(null);
      setErrorMsg(null);
      const res = await SettingsService.unblockUser(targetUserId);
      setSuccessMsg(res.message || `Unblocked ${displayName} successfully.`);
      const updated = blockedUsers.filter((u) => u.userId !== targetUserId);
      setBlockedUsers(updated);
      if (onCountChange) onCountChange(updated.length);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to unblock user.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return (
      <div className="settings-empty-state">
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto var(--space-4)' }} />
        <p className="settings-empty-desc">Loading blocked users...</p>
      </div>
    );
  }

  return (
    <div className="blocked-users-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <UserX size={24} color="var(--accent-pink)" />
          Blocked Users
        </h2>
        <p className="section-pane-desc">
          Blocked users cannot view your profile in Discovery, send you messages, or interact with you on Connectly.
        </p>
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

      <div className="blocked-users-list">
        {blockedUsers.map((item) => (
          <div key={item.id} className="blocked-user-card">
            <div className="blocked-user-profile">
              {item.avatarUrl ? (
                <img
                  src={getMediaUrl(item.avatarUrl)}
                  alt={item.firstName}
                  className="blocked-user-avatar"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="blocked-user-avatar-placeholder">
                  {item.firstName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h4 className="blocked-user-name">
                  {item.firstName} {item.lastName || ''}
                </h4>
                <p className="blocked-user-handle">
                  {item.username ? `@${item.username}` : `Blocked on ${new Date(item.blockedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleUnblock(item.userId, item.firstName)}
              disabled={unblockingId === item.userId}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
                cursor: unblockingId === item.userId ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {unblockingId === item.userId && <Loader2 className="animate-spin" size={14} />}
              {unblockingId === item.userId ? 'Unblocking...' : 'Unblock'}
            </button>
          </div>
        ))}

        {blockedUsers.length === 0 && (
          <div className="settings-empty-state">
            <div className="settings-empty-icon">🛡️</div>
            <div className="settings-empty-title">No blocked users</div>
            <p className="settings-empty-desc">
              You haven't blocked anyone yet. When you block a member, they will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedUsers;
