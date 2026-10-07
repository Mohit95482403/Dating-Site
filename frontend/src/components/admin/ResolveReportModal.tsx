import React, { useState } from 'react';
import { AlertCircle, X, Shield, AlertTriangle, UserX, CheckCircle } from 'lucide-react';

interface ResolveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportedUserName?: string;
  reportReason?: string;
  onConfirm: (data: {
    action: 'dismiss' | 'warn' | 'suspend' | 'ban';
    resolutionNotes: string;
    warningMessage?: string;
  }) => Promise<void>;
}

export const ResolveReportModal: React.FC<ResolveReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportedUserName = 'Reported User',
  reportReason = 'Flagged content',
  onConfirm,
}) => {
  const [action, setAction] = useState<'dismiss' | 'warn' | 'suspend' | 'ban'>('dismiss');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Please provide administrative resolution notes explaining this determination.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm({
        action,
        resolutionNotes: resolutionNotes.trim(),
        warningMessage: action === 'warn' ? warningMessage.trim() : undefined,
      });
      setResolutionNotes('');
      setWarningMessage('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <Shield size={20} className="text-indigo-400" />
            <span>Resolve Report #{reportId}</span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{
              background: '#0d0f18',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <div><strong>Target:</strong> {reportedUserName}</div>
              <div style={{ marginTop: '0.25rem', color: '#94a3b8' }}>
                <strong>Reason:</strong> {reportReason}
              </div>
            </div>

            <div className="admin-input-group">
              <label className="admin-input-label">Select Administrative Action *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAction('dismiss')}
                  className={`admin-btn ${action === 'dismiss' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                  style={{ justifyContent: 'center', padding: '0.6rem' }}
                >
                  <CheckCircle size={15} />
                  <span>Dismiss Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('warn')}
                  className={`admin-btn ${action === 'warn' ? 'admin-btn-warning' : 'admin-btn-outline'}`}
                  style={{ justifyContent: 'center', padding: '0.6rem' }}
                >
                  <AlertCircle size={15} />
                  <span>Issue Warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('suspend')}
                  className={`admin-btn ${action === 'suspend' ? 'admin-btn-warning' : 'admin-btn-outline'}`}
                  style={{ justifyContent: 'center', padding: '0.6rem' }}
                >
                  <AlertTriangle size={15} />
                  <span>Suspend User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('ban')}
                  className={`admin-btn ${action === 'ban' ? 'admin-btn-danger' : 'admin-btn-outline'}`}
                  style={{ justifyContent: 'center', padding: '0.6rem' }}
                >
                  <UserX size={15} />
                  <span>Ban User</span>
                </button>
              </div>
            </div>

            {action === 'warn' && (
              <div className="admin-input-group">
                <label className="admin-input-label">Custom Warning Message to User</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g., Your profile contains content that violates Connectly community standards..."
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="admin-input-group">
              <label className="admin-input-label">Resolution Notes & Findings *</label>
              <textarea
                className="admin-textarea"
                placeholder="Explain the administrative determination and review findings..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
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
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveReportModal;
