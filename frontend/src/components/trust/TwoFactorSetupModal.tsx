import React, { useState, useEffect } from 'react';
import { TrustService } from '../../services/trust.service';
import type { TwoFactorSetupResponse } from '../../types/trust';
import './trust.css';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  isCurrentlyEnabled: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  isCurrentlyEnabled,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disableMode, setDisableMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCode('');
      setCopiedKey(false);
      setDisableMode(isCurrentlyEnabled);

      if (!isCurrentlyEnabled) {
        initSetup();
      }
    }
  }, [isOpen, isCurrentlyEnabled]);

  const initSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await TrustService.setupTwoFactor();
      setSetupData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to initialize two-factor authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code from your authenticator app.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await TrustService.enableTwoFactor(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Please enter your 6-digit authenticator code or an 8-character recovery code.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await TrustService.disableTwoFactor(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid code. Could not disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="trust-modal-overlay" onClick={onClose}>
      <div className="trust-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="trust-modal-header">
          <div className="trust-modal-title">
            <span className="trust-modal-icon">🔐</span>
            <h3>{disableMode ? 'Disable Two-Factor Authentication' : 'Set Up Two-Factor Authentication'}</h3>
          </div>
          <button className="trust-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="trust-status-banner error" style={{ margin: '1rem 1.5rem 0' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="trust-modal-body">
          {disableMode ? (
            <form onSubmit={handleDisable}>
              <p className="trust-text-muted" style={{ marginBottom: '1.25rem' }}>
                Disabling 2FA will lower your account security rating. Enter a code from your authenticator app or one of your emergency recovery codes to confirm.
              </p>
              <div className="trust-field-group">
                <label className="trust-label">Authenticator or Recovery Code</label>
                <input
                  type="text"
                  className="trust-input"
                  placeholder="Enter 6-digit code or recovery code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  autoFocus
                />
              </div>
              <div className="trust-modal-actions">
                <button type="button" className="btn-trust-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-trust-primary"
                  style={{ background: 'var(--color-danger, #ef4444)' }}
                  disabled={loading || !code}
                >
                  {loading ? 'Disabling...' : 'Confirm & Disable 2FA'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {loading && !setupData ? (
                <div className="trust-loading-box">
                  <div className="trust-spinner" />
                  <p>Generating cryptographically secure TOTP secret...</p>
                </div>
              ) : setupData ? (
                <>
                  <div className="trust-2fa-step">
                    <span className="step-num">1</span>
                    <div>
                      <strong>Add Connectly to your Authenticator App</strong>
                      <p className="trust-text-muted">
                        Use Google Authenticator, Authy, 1Password, or Microsoft Authenticator to add this secret key:
                      </p>
                    </div>
                  </div>

                  <div className="trust-secret-box">
                    <code className="trust-secret-code">{setupData.secret}</code>
                    <button type="button" className="btn-copy-secret" onClick={handleCopySecret}>
                      {copiedKey ? '✓ Copied!' : 'Copy Key'}
                    </button>
                  </div>

                  {setupData.recoveryCodes && setupData.recoveryCodes.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <div className="trust-2fa-step">
                        <span className="step-num">2</span>
                        <div>
                          <strong>Emergency Recovery Codes</strong>
                          <p className="trust-text-muted">
                            Save these one-time recovery codes in a secure place. If you lose your phone, you will need these to access your account:
                          </p>
                        </div>
                      </div>
                      <div className="trust-recovery-codes-grid">
                        {setupData.recoveryCodes.map((rc, idx) => (
                          <div key={idx} className="trust-recovery-code-item">
                            {rc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleEnable} style={{ marginTop: '1.5rem' }}>
                    <div className="trust-2fa-step">
                      <span className="step-num">3</span>
                      <div>
                        <strong>Confirm 6-Digit Code</strong>
                        <p className="trust-text-muted">
                          Enter the 6-digit TOTP code currently showing in your app to activate:
                        </p>
                      </div>
                    </div>

                    <div className="trust-field-group" style={{ marginTop: '0.75rem' }}>
                      <input
                        type="text"
                        maxLength={6}
                        className="trust-input"
                        placeholder="000000"
                        style={{ letterSpacing: '0.25em', fontSize: '1.25rem', textAlign: 'center' }}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>

                    <div className="trust-modal-actions">
                      <button type="button" className="btn-trust-secondary" onClick={onClose}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-trust-primary"
                        disabled={loading || code.length !== 6}
                      >
                        {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
