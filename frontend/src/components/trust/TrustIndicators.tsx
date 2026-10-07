import React from 'react';
import { ShieldCheck, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import type { TrustSignals } from '../../types/trust';
import './trust.css';

interface TrustIndicatorsProps {
  signals: TrustSignals;
  onVerifyEmail?: () => void;
  onVerifyPhone?: () => void;
  onStartIdentityVerification?: () => void;
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  signals,
  onVerifyEmail,
  onVerifyPhone,
  onStartIdentityVerification,
}) => {
  const getTierClass = () => {
    switch (signals.trustTier) {
      case 'trusted':
        return 'trust-tier-trusted';
      case 'verified':
        return 'trust-tier-verified';
      case 'restricted':
        return 'trust-tier-restricted';
      default:
        return 'trust-tier-standard';
    }
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#10b981" /> Trust Standing & Indicators
        </h3>
        <span className={`trust-tier-badge ${getTierClass()}`}>
          {signals.trustTier} Member
        </span>
      </div>

      <div className="trust-indicators-grid">
        {/* Identity Verification */}
        <div className="trust-stat-box">
          <div className={`trust-stat-icon ${signals.isIdentityVerified ? 'green' : 'amber'}`}>
            <UserCheck size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="trust-stat-title">Identity Verification</div>
            <div className="trust-stat-value">
              {signals.isIdentityVerified ? 'Verified ✓' : 'Not Verified'}
            </div>
            {!signals.isIdentityVerified && onStartIdentityVerification && (
              <button
                type="button"
                onClick={onStartIdentityVerification}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f43f5e',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '6px',
                }}
              >
                Verify Now →
              </button>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <div className="trust-stat-box">
          <div className={`trust-stat-icon ${signals.isEmailVerified ? 'green' : 'blue'}`}>
            <Mail size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="trust-stat-title">Email Status</div>
            <div className="trust-stat-value">
              {signals.isEmailVerified ? 'Confirmed ✓' : 'Unconfirmed'}
            </div>
            {!signals.isEmailVerified && onVerifyEmail && (
              <button
                type="button"
                onClick={onVerifyEmail}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '6px',
                }}
              >
                Confirm Email →
              </button>
            )}
          </div>
        </div>

        {/* Phone Verification */}
        <div className="trust-stat-box">
          <div className={`trust-stat-icon ${signals.isPhoneVerified ? 'green' : 'amber'}`}>
            <Phone size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="trust-stat-title">Phone Security</div>
            <div className="trust-stat-value">
              {signals.isPhoneVerified ? 'Verified ✓' : 'Unverified'}
            </div>
            {!signals.isPhoneVerified && onVerifyPhone && (
              <button
                type="button"
                onClick={onVerifyPhone}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f59e0b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '6px',
                }}
              >
                Verify Phone →
              </button>
            )}
          </div>
        </div>

        {/* Account Tenure */}
        <div className="trust-stat-box">
          <div className="trust-stat-icon green">
            <Calendar size={20} />
          </div>
          <div>
            <div className="trust-stat-title">Member Tenure</div>
            <div className="trust-stat-value">{signals.accountAgeDays} days active</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Good community standing
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completeness Bar */}
      <div className="trust-stat-box" style={{ flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>
            Profile Completeness
          </span>
          <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800 }}>
            {signals.completionPercentage}%
          </span>
        </div>
        <div className="trust-progress-wrapper" style={{ width: '100%', marginTop: '4px' }}>
          <div className="trust-progress-bar">
            <div className="trust-progress-fill" style={{ width: `${signals.completionPercentage}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
