import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import type { VerificationRequestItem, DocumentType } from '../../types/trust';
import { TrustService } from '../../services/trust.service';

interface IdentityVerificationWizardProps {
  currentVerification: VerificationRequestItem | null;
  onSubmitted: () => void;
}

export const IdentityVerificationWizard: React.FC<IdentityVerificationWizardProps> = ({
  currentVerification,
  onSubmitted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [documentType, setDocumentType] = useState<DocumentType>('national_id');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status view if already verified or pending
  if (currentVerification?.status === 'approved') {
    return (
      <div className="verification-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <CheckCircle size={32} color="#10b981" />
          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>Identity Verified</h4>
            <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Your government ID has been reviewed and authenticated. The Verified Badge is active across your profile and match cards.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentVerification?.status === 'pending') {
    return (
      <div className="verification-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Clock size={32} color="#f59e0b" />
          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>Verification Under Review</h4>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Your submitted document ({currentVerification.documentType.replace('_', ' ')}) is currently in the verification review queue. Submissions are typically processed within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      setError('Please select an ID document file to upload.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('document', documentFile);
      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }

      await TrustService.submitVerification(formData);
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="verification-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <ShieldCheck size={22} color="#f43f5e" />
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Official Identity Verification</h3>
      </div>

      {currentVerification?.status === 'rejected' && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#ef4444',
            fontSize: '0.9rem',
          }}
        >
          <strong>Previous Submission Declined:</strong> {currentVerification.rejectionReason || 'Document was unreadable or expired. Please upload a clear document.'}
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#ef4444',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Step Indicators */}
      <div className="verif-steps-nav">
        <div className={`verif-step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="verif-step-num">1</div>
          <div className="verif-step-label">Select ID</div>
        </div>
        <div className={`verif-step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <div className="verif-step-num">2</div>
          <div className="verif-step-label">Upload Document</div>
        </div>
        <div className={`verif-step-item ${step === 3 ? 'active' : ''}`}>
          <div className="verif-step-num">3</div>
          <div className="verif-step-label">Submit &amp; Review</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              Choose a government-issued photo ID. Connectly encrypts all documents and uses them strictly for one-time verification.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {[
                { type: 'national_id', title: 'National ID / Aadhaar', icon: FileText },
                { type: 'passport', title: 'Passport', icon: FileText },
                { type: 'drivers_license', title: "Driver's License", icon: FileText },
              ].map((item) => (
                <div
                  key={item.type}
                  onClick={() => setDocumentType(item.type as DocumentType)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: documentType === item.type ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: documentType === item.type ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#fff',
                  }}
                >
                  <item.icon size={18} color={documentType === item.type ? '#f43f5e' : '#94a3b8'} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.title}</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn-primary-gradient" onClick={() => setStep(2)}>
              Next: Upload Document →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              Upload a clear, readable photo or scan of your selected ID (JPEG, PNG, or WebP up to 10MB).
            </p>

            <div
              style={{
                border: '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                padding: '32px 20px',
                textAlign: 'center',
                marginBottom: '24px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <UploadCloud size={36} color="#64748b" style={{ margin: '0 auto 10px' }} />
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
                {documentFile ? documentFile.name : 'Click to select or drag document'}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) setDocumentFile(e.target.files[0]);
                }}
                style={{ display: 'none' }}
                id="doc-upload-input"
              />
              <label
                htmlFor="doc-upload-input"
                className="btn-outline-glass"
                style={{ cursor: 'pointer', display: 'inline-block' }}
              >
                Browse Document
              </label>
            </div>

            <div
              style={{
                border: '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                padding: '24px 20px',
                textAlign: 'center',
                marginBottom: '24px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
                {selfieFile ? selfieFile.name : 'Optional: Selfie holding ID card'}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelfieFile(e.target.files[0]);
                }}
                style={{ display: 'none' }}
                id="selfie-upload-input"
              />
              <label
                htmlFor="selfie-upload-input"
                className="btn-outline-glass"
                style={{ cursor: 'pointer', display: 'inline-block' }}
              >
                Browse Selfie (Optional)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-outline-glass" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary-gradient"
                disabled={!documentFile}
                onClick={() => setStep(3)}
              >
                Next: Review &amp; Submit →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              Confirm your submission details. Our human trust &amp; safety team will review your document within 24 hours.
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>Document Type</div>
              <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, textTransform: 'capitalize', marginBottom: '12px' }}>
                {documentType.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>File Attached</div>
              <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 600 }}>
                {documentFile?.name} ({(Number(documentFile?.size) / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-outline-glass" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="submit" className="btn-primary-gradient" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading & Encrypting...' : 'Submit Verification Request'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
