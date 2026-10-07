import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import SettingsService from '../../services/settings.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const canSubmit = password.length > 0 && confirmationPhrase === 'DELETE';

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      await SettingsService.deleteAccount({
        password,
        confirmation: confirmationPhrase,
      });

      // Clear auth context and redirect to home
      await logout();
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete account.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <div className="modal-card">
        <div className="modal-header">
          <AlertTriangle size={28} />
          <h3 id="delete-account-title" className="modal-title">
            Delete Account?
          </h3>
        </div>

        <form onSubmit={handleDelete} className="modal-body">
          <p style={{ margin: 0 }}>
            This action is <strong>permanent and irreversible</strong>. Your profile, matches, messages, photos,
            and personal data will be completely deleted from Connectly.
          </p>

          {errorMsg && (
            <div className="feedback-alert error" style={{ margin: 0 }}>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="settings-field-group">
            <label htmlFor="delete-account-pass" className="settings-label">
              Enter your password to continue:
            </label>
            <input
              id="delete-account-pass"
              type="password"
              className="settings-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter current password"
              required
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="delete-account-confirm" className="settings-label">
              Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm:
            </label>
            <input
              id="delete-account-confirm"
              type="text"
              className="settings-input"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              disabled={loading}
              placeholder="DELETE"
              required
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              style={{
                padding: 'var(--space-2) var(--space-5)',
                background: canSubmit && !loading ? '#dc2626' : '#7f1d1d',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
