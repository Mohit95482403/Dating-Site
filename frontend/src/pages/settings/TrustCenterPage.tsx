import React, { useState, useEffect } from 'react';
import { TrustIndicators } from '../../components/trust/TrustIndicators';
import { IdentityVerificationWizard } from '../../components/trust/IdentityVerificationWizard';
import { TwoFactorSetupModal } from '../../components/trust/TwoFactorSetupModal';
import { SecurityAlertsCard } from '../../components/trust/SecurityAlertsCard';
import { TrustService } from '../../services/trust.service';
import type {
  TrustSignals,
  VerificationRequestItem,
  SecurityEventItem,
  AccountRestrictionItem,
} from '../../types/trust';
import '../../components/trust/trust.css';

export const TrustCenterPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [trustSignals, setTrustSignals] = useState<TrustSignals | null>(null);
  const [verification, setVerification] = useState<VerificationRequestItem | null>(null);
  const [security, setSecurity] = useState<{
    twoFactorEnabled: boolean;
    isPhoneVerified: boolean;
    phoneNumber: string | null;
  }>({
    twoFactorEnabled: false,
    isPhoneVerified: false,
    phoneNumber: null,
  });
  const [activeRestrictions, setActiveRestrictions] = useState<AccountRestrictionItem[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);

  // 2FA modal state
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  // Phone OTP state
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [phoneOtpStep, setPhoneOtpStep] = useState<'idle' | 'sent'>('idle');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Email verification state
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    loadTrustData();
  }, []);

  const loadTrustData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [overviewData, eventsData] = await Promise.all([
        TrustService.getTrustCenter(),
        TrustService.getSecurityEvents().catch(() => []),
      ]);

      setTrustSignals(overviewData.trustSignals);
      setVerification(overviewData.verification);
      setSecurity(overviewData.security);
      setActiveRestrictions(overviewData.activeRestrictions || []);
      setSecurityEvents(eventsData);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load Trust & Safety overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      setEmailLoading(true);
      setActionMsg(null);
      const res = await TrustService.sendEmailVerification();
      setActionMsg({
        type: 'success',
        text: res.message || 'Verification email dispatched. Please check your inbox.',
      });
      // Refresh trust data
      loadTrustData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to dispatch verification email.',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;
    try {
      setPhoneLoading(true);
      setActionMsg(null);
      const res = await TrustService.sendPhoneOtp(phoneInput);
      setPhoneOtpStep('sent');
      setActionMsg({
        type: 'success',
        text: res.message || 'OTP sent successfully. Check your SMS messages.',
      });
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to send OTP code.',
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput) return;
    try {
      setPhoneLoading(true);
      setActionMsg(null);
      await TrustService.verifyPhoneOtp(otpInput);
      setActionMsg({
        type: 'success',
        text: 'Phone number verified successfully! Trust score updated.',
      });
      setPhoneOtpStep('idle');
      setOtpInput('');
      setPhoneInput('');
      loadTrustData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Invalid or expired OTP code.',
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  if (loading && !trustSignals) {
    return (
      <div className="trust-loading-box" style={{ minHeight: '300px' }}>
        <div className="trust-spinner" />
        <p>Loading Trust &amp; Safety Center...</p>
      </div>
    );
  }

  return (
    <div className="trust-center-container">
      {/* Page Header */}
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          Trust, Safety &amp; Verification
        </h2>
        <p className="section-pane-desc">
          Build community trust, verify your identity credentials, protect your account with 2FA, and manage security events.
        </p>
      </div>

      {errorMsg && (
        <div className="trust-status-banner error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {actionMsg && (
        <div className={`trust-status-banner ${actionMsg.type}`} style={{ marginBottom: '1.5rem' }}>
          <span>{actionMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Active Restrictions Banner if account restricted */}
      {activeRestrictions.length > 0 && (
        <div className="trust-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '1.5rem' }}>
          <div className="trust-card-header">
            <div className="trust-card-title-group">
              <span className="trust-card-icon">⚠️</span>
              <div>
                <h3 className="trust-card-title" style={{ color: '#ef4444' }}>
                  Active Account Notice
                </h3>
                <p className="trust-card-subtitle">
                  Your account currently has active safety restrictions applied by our anti-abuse system:
                </p>
              </div>
            </div>
          </div>
          <div className="trust-card-body">
            {activeRestrictions.map((rst) => (
              <div key={rst.id} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#f87171' }}>{rst.restrictionType.replace(/_/g, ' ')}</strong>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>Reason: {rst.reason}</p>
                {rst.expiresAt && (
                  <span className="trust-text-muted" style={{ fontSize: '0.8rem' }}>
                    Expires: {new Date(rst.expiresAt).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real Trust Signals Indicator */}
      {trustSignals && <TrustIndicators signals={trustSignals} />}

      {/* Identity Document Verification Wizard */}
      <IdentityVerificationWizard
        currentVerification={verification}
        onSubmitted={() => loadTrustData()}
      />

      {/* Contact Methods Verification (Email & Phone) */}
      <div className="trust-card" style={{ marginTop: '1.5rem' }}>
        <div className="trust-card-header">
          <div className="trust-card-title-group">
            <span className="trust-card-icon">📱</span>
            <div>
              <h3 className="trust-card-title">Contact &amp; Identity Signals</h3>
              <p className="trust-card-subtitle">
                Verified communication channels significantly elevate your standing in discovery.
              </p>
            </div>
          </div>
        </div>

        <div className="trust-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Email Verification Box */}
            <div className="trust-channel-card">
              <div>
                <div className="trust-channel-header">
                  <strong>Email Address</strong>
                  {trustSignals?.isEmailVerified ? (
                    <span className="trust-status-badge verified">✓ Verified</span>
                  ) : (
                    <span className="trust-status-badge rejected">Unverified</span>
                  )}
                </div>
                <p className="trust-text-muted" style={{ marginBottom: '1.25rem' }}>
                  {trustSignals?.isEmailVerified
                    ? 'Your registered email is verified. This protects account recovery.'
                    : 'Confirm your email address to unlock discovery badges and notifications.'}
                </p>
              </div>

              {!trustSignals?.isEmailVerified && (
                <button
                  type="button"
                  className="btn-trust-secondary"
                  onClick={handleSendEmailVerification}
                  disabled={emailLoading}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {emailLoading ? 'Sending...' : 'Send Verification Email'}
                </button>
              )}
            </div>

            {/* Phone Verification Box */}
            <div className="trust-channel-card">
              <div>
                <div className="trust-channel-header">
                  <strong>Phone Number (SMS)</strong>
                  {security.isPhoneVerified ? (
                    <span className="trust-status-badge verified">✓ Verified</span>
                  ) : (
                    <span className="trust-status-badge pending">Not Verified</span>
                  )}
                </div>

                {security.isPhoneVerified ? (
                  <p className="trust-text-muted" style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ Protected: {security.phoneNumber || '+91 ••••• •••••'}
                  </p>
                ) : (
                  <p className="trust-text-muted" style={{ marginBottom: '0.75rem' }}>
                    Receive a 6-digit SMS verification code to verify your mobile identity.
                  </p>
                )}
              </div>

              {!security.isPhoneVerified && (
                phoneOtpStep === 'idle' ? (
                  <form onSubmit={handleSendPhoneOtp} style={{ marginTop: 'auto' }}>
                    <input
                      type="tel"
                      className="trust-input"
                      placeholder="+91 98765 43210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      style={{ marginBottom: '0.75rem' }}
                      required
                    />
                    <button
                      type="submit"
                      className="btn-trust-secondary"
                      disabled={phoneLoading || !phoneInput}
                      style={{ width: '100%' }}
                    >
                      {phoneLoading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} style={{ marginTop: 'auto' }}>
                    <input
                      type="text"
                      maxLength={6}
                      className="trust-input"
                      placeholder="000000"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      style={{ marginBottom: '0.75rem', textAlign: 'center', letterSpacing: '0.25em', fontSize: '1.1rem' }}
                      required
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-trust-secondary"
                        onClick={() => setPhoneOtpStep('idle')}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-trust-primary"
                        disabled={phoneLoading || otpInput.length !== 6}
                        style={{ flex: 1 }}
                      >
                        {phoneLoading ? 'Verifying...' : 'Confirm OTP'}
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="trust-card" style={{ marginTop: '1.5rem' }}>
        <div className="trust-card-header">
          <div className="trust-card-title-group">
            <span className="trust-card-icon">🔐</span>
            <div>
              <h3 className="trust-card-title">Two-Factor Authentication (2FA)</h3>
              <p className="trust-card-subtitle">
                Add an extra cryptographic defense layer using standard RFC-6238 TOTP authenticator apps.
              </p>
            </div>
          </div>
          <div>
            {security.twoFactorEnabled ? (
              <span className="trust-status-badge verified">✓ Active</span>
            ) : (
              <span className="trust-status-badge rejected">Inactive</span>
            )}
          </div>
        </div>

        <div className="trust-card-body">
          <p className="trust-text-muted" style={{ marginBottom: '1.25rem' }}>
            {security.twoFactorEnabled
              ? 'Your account is secured with two-factor authentication. Logins require a one-time 6-digit TOTP code.'
              : 'Protect your profile from takeover attacks by requiring a time-based code from your mobile authenticator.'}
          </p>

          <button
            type="button"
            className={security.twoFactorEnabled ? 'btn-trust-secondary' : 'btn-trust-primary'}
            onClick={() => setTwoFactorModalOpen(true)}
          >
            {security.twoFactorEnabled ? 'Manage / Disable 2FA' : 'Enable Two-Factor Authentication'}
          </button>
        </div>
      </div>

      {/* Security Audit Activity Timeline */}
      <div style={{ marginTop: '1.5rem' }}>
        <SecurityAlertsCard events={securityEvents} loading={false} />
      </div>

      {/* Two Factor Setup Modal */}
      <TwoFactorSetupModal
        isOpen={twoFactorModalOpen}
        isCurrentlyEnabled={security.twoFactorEnabled}
        onClose={() => setTwoFactorModalOpen(false)}
        onSuccess={() => {
          loadTrustData();
          setActionMsg({
            type: 'success',
            text: security.twoFactorEnabled
              ? 'Two-Factor Authentication has been successfully disabled.'
              : 'Two-Factor Authentication has been successfully enabled! 🛡️',
          });
        }}
      />
    </div>
  );
};

export default TrustCenterPage;
