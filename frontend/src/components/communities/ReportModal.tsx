import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { CommunityService } from '../../services/community.service';

interface ReportModalProps {
  communityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ communityId, isOpen, onClose }) => {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await CommunityService.report(communityId, {
        targetType: 'community',
        targetId: communityId,
        reason,
        details: details.trim() || undefined,
      });
      alert('Report submitted to Connectly Trust & Safety. Thank you for keeping our community safe. 🛡️');
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div className="community-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="community-modal-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <ShieldAlert size={20} /> Report Community
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group-custom">
            <label>Reason for Report *</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="spam">Spam or Commercial Solicitation</option>
              <option value="harassment">Harassment or Hate Speech</option>
              <option value="inappropriate_content">Inappropriate / Explicit Content</option>
              <option value="fake_account">Fake Group / Impersonation</option>
              <option value="scam">Scam / Fraudulent Activities</option>
              <option value="other">Other Guidelines Violation</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label>Additional Details (Optional)</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any context that will help our safety moderators investigate..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn-outline-glass" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              style={{ background: '#ef4444' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
