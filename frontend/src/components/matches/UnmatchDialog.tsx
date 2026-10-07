import React, { useEffect, useRef } from 'react';
import { UserX } from 'lucide-react';
import './Matches.css';

interface UnmatchDialogProps {
  isOpen: boolean;
  partnerName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const UnmatchDialog: React.FC<UnmatchDialogProps> = ({
  isOpen,
  partnerName,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="unmatch-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unmatch-title"
      aria-describedby="unmatch-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="unmatch-dialog-card animate-bounce-in" ref={dialogRef}>
        <div className="unmatch-icon-wrap">
          <UserX size={32} />
        </div>

        <h3 id="unmatch-title" className="unmatch-dialog-title">
          Unmatch with {partnerName}?
        </h3>

        <p id="unmatch-desc" className="unmatch-dialog-desc">
          Are you sure? Unmatching will remove this connection and you will no longer see each other in Matches.
        </p>

        <div className="unmatch-dialog-actions">
          <button
            type="button"
            className="unmatch-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="unmatch-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Unmatching...' : 'Unmatch'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnmatchDialog;
