import React, { useState } from 'react';
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DeleteAccountModal from './DeleteAccountModal';

export const DangerZone: React.FC = () => {
  const { logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of this account?')) {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }
  };

  return (
    <div className="danger-zone-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title" style={{ color: '#f87171' }}>
          <AlertTriangle size={24} color="#f87171" />
          Danger Zone
        </h2>
        <p className="section-pane-desc">
          Irreversible and destructive actions concerning your account access and profile data.
        </p>
      </div>

      {/* Logout Card */}
      <div className="danger-card">
        <div className="danger-card-info">
          <h4>Log Out of Connectly</h4>
          <p>End your active session on this device. You will need to sign in again to access your account.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--text-xs)',
            flexShrink: 0,
          }}
        >
          <LogOut size={16} />
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>

      {/* Delete Account Card */}
      <div className="danger-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
        <div className="danger-card-info">
          <h4 style={{ color: '#ef4444' }}>Delete Account</h4>
          <p>
            Permanently remove your Connectly account, photos, matches, and chat history. This action cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: '#dc2626',
            border: 'none',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--text-xs)',
            flexShrink: 0,
          }}
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default DangerZone;
