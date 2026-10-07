import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import VerificationRequestModal from './VerificationRequestModal';
import type { VerificationStatus, VerificationStatusResponse } from '../../types/profile';
import './VerificationSection.css';

interface VerificationSectionProps {
  status?: VerificationStatus;
  isVerified?: boolean;
  rejectionReason?: string | null;
  onStatusUpdated?: (status: VerificationStatusResponse) => void;
  isOwnProfile?: boolean;
}

export const VerificationSection: React.FC<VerificationSectionProps> = ({
  status = 'not_verified',
  isVerified = false,
  rejectionReason,
  onStatusUpdated,
  isOwnProfile = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>(
    isVerified ? 'verified' : status
  );
  const [reason, setReason] = useState<string | null>(rejectionReason || null);

  useEffect(() => {
    setCurrentStatus(isVerified ? 'verified' : status);
  }, [isVerified, status]);

  useEffect(() => {
    if (rejectionReason !== undefined) {
      setReason(rejectionReason);
    }
  }, [rejectionReason]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleSuccess = (res: VerificationStatusResponse) => {
    setCurrentStatus(res.status);
    setReason(res.rejectionReason);
    if (onStatusUpdated) onStatusUpdated(res);
  };

  if (!isOwnProfile && currentStatus !== 'verified') {
    return null;
  }

  return (
    <div className="profile-section-card verification-section-card">
      <div className="verification-section-header">
        <div className="section-icon-box">
          <Shield size={18} className="section-icon text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title">Identity Verification</h2>
          <p className="verification-section-subtitle">
            Authenticity and safety on Connectly
          </p>
        </div>
      </div>

      <div className="verification-content-body">
        {currentStatus === 'verified' && (
          <div className="verification-status-banner verified">
            <div className="status-icon-circle verified">
              <CheckCircle size={24} />
            </div>
            <div className="status-text-wrap">
              <h3 className="status-title">Profile Verified</h3>
              <p className="status-desc">
                Your profile has been authenticated. You have the verified badge across discovery, matches, and chat.
              </p>
            </div>
          </div>
        )}

        {currentStatus === 'pending' && (
          <div className="verification-status-banner pending">
            <div className="status-icon-circle pending">
              <Clock size={24} />
            </div>
            <div className="status-text-wrap">
              <h3 className="status-title">Verification Under Review</h3>
              <p className="status-desc">
                We have received your verification document and our safety moderation team is reviewing it. This typically takes a few hours.
              </p>
            </div>
          </div>
        )}

        {currentStatus === 'rejected' && (
          <div className="verification-status-banner rejected">
            <div className="status-icon-circle rejected">
              <AlertTriangle size={24} />
            </div>
            <div className="status-text-wrap">
              <h3 className="status-title">Verification Not Approved</h3>
              <p className="status-desc">
                {reason ? `Reason: ${reason}` : 'Your document did not meet our verification standards.'}
              </p>
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleOpenModal}
                  className="mt-3"
                >
                  Submit Again
                </Button>
              )}
            </div>
          </div>
        )}

        {currentStatus === 'not_verified' && isOwnProfile && (
          <div className="verification-status-banner not-verified">
            <div className="status-icon-circle not-verified">
              <ShieldCheck size={24} />
            </div>
            <div className="status-text-wrap">
              <h3 className="status-title">Get Verified</h3>
              <p className="status-desc">
                Stand out with a verified badge! Verified profiles receive significantly higher genuine match engagement.
              </p>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleOpenModal}
                className="mt-3"
              >
                Verify Profile
              </Button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <VerificationRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default VerificationSection;
