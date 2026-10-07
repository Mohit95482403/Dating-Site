import React, { useState } from 'react';
import { X, Flag, AlertCircle, CheckCircle } from 'lucide-react';
import { profileService } from '../../services/profile.service';
import { useToast } from '../../context/ToastContext';
import Button from '../common/Button';
import './ReportProfileModal.css';

interface ReportProfileModalProps {
  isOpen: boolean;
  targetUserId: number;
  targetUserName: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Fake profile',
  'Harassment',
  'Spam',
  'Inappropriate content',
  'Scam',
  'Underage',
  'Other',
];

export const ReportProfileModal: React.FC<ReportProfileModalProps> = ({
  isOpen,
  targetUserId,
  targetUserName,
  onClose,
}) => {
  const toast = useToast();

  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Please select a reason.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await profileService.reportProfile(targetUserId, selectedReason, description);
      setIsSuccess(true);
      toast.success('Report submitted to moderation.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-header-icon-box danger">
              <Flag size={20} className="text-rose-500" />
            </div>
            <div>
              <h2 className="modal-title">Report {targetUserName}&rsquo;s Profile</h2>
              <p className="modal-subtitle">Help keep our community safe and respectful</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="report-success-state">
            <div className="report-success-icon-box">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h3 className="report-success-title">Thank you for reporting</h3>
            <p className="report-success-desc">
              Our safety and moderation team will thoroughly review this profile against our community guidelines.
            </p>
            <Button variant="primary" onClick={onClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-modal-body">
            {error && (
              <div className="report-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="report-reasons-group">
              <label className="report-label">Reason for reporting</label>
              <div className="report-reasons-list">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="report-reason-item">
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="report-description-group">
              <label className="report-label" htmlFor="report-desc-input">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-desc-input"
                className="report-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Describe what occurred or why you believe this profile violates guidelines..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="report-char-count">{description.length} / 1000</span>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting || !selectedReason} style={{ background: '#e11d48', borderColor: '#e11d48' }}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportProfileModal;
