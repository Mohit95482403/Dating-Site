import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import './VerificationBadge.css';

interface VerificationBadgeProps {
  isVerified?: boolean;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified = false,
  status = 'not_verified',
  size = 'md',
  showText = false,
  className = '',
}) => {
  const verified = isVerified || status === 'verified';

  if (!verified) return null;

  return (
    <span
      className={`connectly-verification-badge size-${size} ${className}`}
      title="Verified Profile"
    >
      <CheckCircle2
        size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
        className="badge-check-icon"
      />
      {showText && <span className="badge-label">Verified</span>}
    </span>
  );
};

export default VerificationBadge;
