import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { FeedService } from '../../services/feed.service';

interface ReportContentModalProps {
  targetType: 'post' | 'comment' | 'story';
  targetId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or misleading',
  'Fake profile or impersonation',
  'Scam or fraud',
  'Violence or dangerous content',
  'Other',
];

export const ReportContentModal: React.FC<ReportContentModalProps> = ({
  targetType,
  targetId,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      await FeedService.reportContent({
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feed-modal-backdrop" onClick={onClose}>
      <div className="feed-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="feed-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h3 className="feed-modal-title">
              Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
            </h3>
          </div>
          <button type="button" className="feed-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle size={44} color="#10b981" />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Report submitted successfully
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Our moderation team will review this content promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Reason for reporting
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      padding: '6px 0',
                    }}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Additional Details (Optional)
              </label>
              <textarea
                className="comment-input-field"
                placeholder="Help us understand the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                style={{ width: '100%', minHeight: '60px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="composer-media-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="composer-submit-btn"
                style={{ background: '#ef4444' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportContentModal;
