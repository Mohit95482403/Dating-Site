import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface SuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName?: string;
  onConfirm: (reason: string) => Promise<void>;
}

export const SuspendUserModal: React.FC<SuspendUserModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName = 'User',
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for account suspension.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to suspend user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title" style={{ color: '#fbbf24' }}>
            <AlertTriangle size={20} />
            <span>Suspend User Account</span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <p style={{ marginBottom: '1rem' }}>
              Are you sure you want to suspend <strong>{userName} (ID: #{userId})</strong>?
              This will immediately revoke their active sessions and disconnect their connection.
            </p>

            <div className="admin-input-group">
              <label className="admin-input-label">Reason for Suspension *</label>
              <textarea
                className="admin-textarea"
                placeholder="Enter justification (e.g., Inappropriate profile prompts, spam violations)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {error && (
              <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-warning"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Suspending...' : 'Suspend Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuspendUserModal;
