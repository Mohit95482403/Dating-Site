import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName?: string;
  onConfirm: (reason: string) => Promise<void>;
}

export const BanUserModal: React.FC<BanUserModalProps> = ({
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
      setError('Please provide a specific reason for banning the user.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to ban user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title" style={{ color: '#ef4444' }}>
            <ShieldAlert size={20} />
            <span>Permanent Account Ban</span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              <strong>Warning:</strong> This will permanently ban <strong>{userName} (ID: #{userId})</strong> from Connectly.
              Their active tokens will be invalidated immediately and all WebSocket connections dropped.
            </div>

            <div className="admin-input-group">
              <label className="admin-input-label">Ban Justification *</label>
              <textarea
                className="admin-textarea"
                placeholder="Enter formal justification (e.g., Harassment, underage violation, fraudulent scam activity)..."
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
              className="admin-btn admin-btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Banning...' : 'Confirm Permanent Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BanUserModal;
