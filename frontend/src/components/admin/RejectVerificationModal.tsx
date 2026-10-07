import React, { useState } from 'react';
import { ShieldX, X } from 'lucide-react';

interface RejectVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificationId: number;
  userName?: string;
  onConfirm: (reason: string, adminNotes?: string) => Promise<void>;
}

export const RejectVerificationModal: React.FC<RejectVerificationModalProps> = ({
  isOpen,
  onClose,
  verificationId,
  userName = 'User',
  onConfirm,
}) => {
  const [reason, setReason] = useState('Document was blurry or illegible');
  const [customReason, setCustomReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'other' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Please provide a specific reason for rejection.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(finalReason, adminNotes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reject verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title" style={{ color: '#f87171' }}>
            <ShieldX size={20} />
            <span>Reject Verification Request #{verificationId}</span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <p style={{ marginBottom: '1rem' }}>
              You are rejecting the identity verification submission for <strong>{userName}</strong>.
              A notification with the rejection reason will be sent to the user so they can re-submit valid documentation.
            </p>

            <div className="admin-input-group">
              <label className="admin-input-label">Select Rejection Reason *</label>
              <select
                className="admin-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                <option value="Document was blurry or illegible">Document was blurry or illegible</option>
                <option value="Selfie does not clearly match identification photo">Selfie does not clearly match identification photo</option>
                <option value="Identification document is expired">Identification document is expired</option>
                <option value="Document type not accepted (must be government-issued ID)">Document type not accepted (must be government-issued ID)</option>
                <option value="Name on ID does not match account name">Name on ID does not match account name</option>
                <option value="other">Other (specify custom reason below)</option>
              </select>
            </div>

            {reason === 'other' && (
              <div className="admin-input-group">
                <label className="admin-input-label">Custom Reason *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Explain why the document was not approved..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            <div className="admin-input-group">
              <label className="admin-input-label">Internal Admin Notes (Optional)</label>
              <textarea
                className="admin-textarea"
                placeholder="Internal audit notes regarding this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={isSubmitting}
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
              {isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectVerificationModal;
