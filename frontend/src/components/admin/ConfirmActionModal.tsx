import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  onConfirm: () => Promise<void>;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonClass = () => {
    if (confirmVariant === 'danger') return 'admin-btn admin-btn-danger';
    if (confirmVariant === 'warning') return 'admin-btn admin-btn-warning';
    if (confirmVariant === 'success') return 'admin-btn admin-btn-success';
    return 'admin-btn admin-btn-primary';
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <AlertCircle size={20} className="text-indigo-400" />
            <span>{title}</span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-modal-body">
          <p>{message}</p>
          {error && (
            <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.75rem' }}>
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
            type="button"
            className={getButtonClass()}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
