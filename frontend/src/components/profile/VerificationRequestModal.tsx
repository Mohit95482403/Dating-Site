import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Upload, AlertCircle, Lock, FileCheck, Loader2, FileText } from 'lucide-react';
import { profileService } from '../../services/profile.service';
import { useToast } from '../../context/ToastContext';
import Button from '../common/Button';
import type { VerificationStatusResponse } from '../../types/profile';
import './VerificationRequestModal.css';

interface VerificationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: VerificationStatusResponse) => void;
}

export const VerificationRequestModal: React.FC<VerificationRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Prevent background scrolling when modal is open and restore cleanly on close/unmount
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
    };
  }, [isOpen]);

  // Handle ESC key to dismiss modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isSubmitting, onClose]);

  // Cleanup object URL on unmount or file reset
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = useCallback((file: File) => {
    setError(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP) or PDF document.');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a photo or identity document to submit.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await profileService.submitVerification(selectedFile);
      toast.success('Verification submitted! Our team will review your document shortly.');
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit verification request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen || !isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="verification-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div
        className="verification-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="verification-modal-header">
          <div className="verification-modal-header-lead">
            <div className="verification-modal-header-icon-box" aria-hidden="true">
              <ShieldCheck size={22} className="text-cyan-400" />
            </div>
            <div className="verification-modal-titles">
              <h2 id="verification-modal-title" className="verification-modal-title">
                Get Profile Verified
              </h2>
              <p className="verification-modal-subtitle">
                Earn a verified badge and boost your profile credibility
              </p>
            </div>
          </div>
          <button
            type="button"
            className="verification-modal-close-btn"
            onClick={onClose}
            aria-label="Close verification modal"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Component Wrapping Body & Sticky Footer */}
        <form onSubmit={handleSubmit} className="verification-modal-form">
          {/* Scrollable Body */}
          <div className="verification-modal-body">
            {error && (
              <div className="verification-error-alert" role="alert">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span className="verification-error-text">{error}</span>
              </div>
            )}

            <div className="verification-instructions">
              <h4 className="instructions-title">Instructions:</h4>
              <ul className="instructions-list">
                <li>Upload a clear photo holding a paper with &ldquo;Connectly&rdquo; and today&rsquo;s date, or a valid ID/passport.</li>
                <li>Ensure your face and document details are clearly visible and legible.</li>
                <li>Accepted formats: JPEG, PNG, WebP, or PDF up to 10MB.</li>
              </ul>
            </div>

            {/* Upload Area */}
            <div className="verification-upload-zone">
              {previewUrl && selectedFile ? (
                <div className="verification-preview-wrap">
                  <div className="verification-preview-image-box">
                    {selectedFile.type === 'application/pdf' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem', gap: '0.65rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                          <FileText size={32} />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>PDF Document Selected</span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ready for verified compliance upload</span>
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Document Preview"
                        className="verification-preview-img"
                      />
                    )}
                  </div>
                  <div className="verification-preview-details">
                    <div className="verification-preview-meta">
                      <FileCheck size={16} className="text-cyan-400 flex-shrink-0" />
                      <span className="verification-preview-filename" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <span className="verification-preview-filesize">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      className="verification-remove-file-btn"
                      onClick={handleRemove}
                      title="Remove selected file and choose another"
                    >
                      <X size={15} />
                      <span>Change File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`verification-dropzone ${isDragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload document area. Click to choose file or drag and drop image or PDF"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                  />
                  <div className="dropzone-icon-circle">
                    <Upload size={24} />
                  </div>
                  <div className="dropzone-content-text">
                    <p className="dropzone-text">Click to choose image or drag &amp; drop</p>
                    <span className="dropzone-hint">JPEG, PNG, WebP, or PDF (Max 10MB)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & Security Note */}
            <div className="verification-privacy-badge">
              <Lock size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="verification-privacy-text">
                <strong>Strictly Confidential:</strong> Your document is encrypted and never displayed publicly. Only authorized compliance moderators can review it.
              </p>
            </div>
          </div>

          {/* Stable Footer (Non-overlapping) */}
          <div className="verification-modal-footer">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="verification-btn-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!selectedFile || isSubmitting}
              className="verification-btn-submit"
            >
              {isSubmitting ? (
                <span className="verification-loading-content">
                  <Loader2 size={16} className="verification-spinner-icon" />
                  <span>Submitting...</span>
                </span>
              ) : (
                'Submit Verification'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default VerificationRequestModal;
