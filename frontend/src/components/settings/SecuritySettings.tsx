import React, { useState, useMemo, useEffect } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, Check, X, Lock } from 'lucide-react';
import SettingsService from '../../services/settings.service';
import { TrustService } from '../../services/trust.service';
import { TwoFactorSetupModal } from '../trust/TwoFactorSetupModal';
import { SecurityAlertsCard } from '../trust/SecurityAlertsCard';
import type { SecurityEventItem } from '../../types/trust';

export const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA & Audit state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  useEffect(() => {
    loadSecurityOverview();
  }, []);

  const loadSecurityOverview = async () => {
    try {
      setLoadingSecurity(true);
      const [overview, events] = await Promise.all([
        TrustService.getTrustCenter().catch(() => null),
        TrustService.getSecurityEvents().catch(() => []),
      ]);
      if (overview?.security) {
        setTwoFactorEnabled(overview.security.twoFactorEnabled);
      }
      setSecurityEvents(events);
    } catch {
      // Ignore
    } finally {
      setLoadingSecurity(false);
    }
  };

  // Strength checks
  const strengthDetails = useMemo(() => {
    const checks = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;

    let score = 'weak';
    let percent = 20;
    let colorClass = 'strength-weak';

    if (newPassword.length === 0) {
      score = '';
      percent = 0;
    } else if (passedCount <= 2) {
      score = 'Weak';
      percent = 25;
      colorClass = 'strength-weak';
    } else if (passedCount === 3) {
      score = 'Fair';
      percent = 50;
      colorClass = 'strength-fair';
    } else if (passedCount === 4) {
      score = 'Good';
      percent = 75;
      colorClass = 'strength-good';
    } else if (passedCount === 5) {
      score = 'Strong';
      percent = 100;
      colorClass = 'strength-strong';
    }

    return { checks, passedCount, score, percent, colorClass };
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      const res = await SettingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMsg(res.message || 'Password changed successfully. All other sessions have been secured.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="security-settings-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <KeyRound size={24} color="var(--accent-pink)" />
          Password & Security
        </h2>
        <p className="section-pane-desc">
          Update your login password regularly to protect your account against unauthorized access.
        </p>
      </div>

      {successMsg && (
        <div className="feedback-alert success" role="alert">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="feedback-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form" style={{ maxWidth: '540px' }}>
        <div className="settings-field-group">
          <label htmlFor="security-current-pass" className="settings-label">
            Current Password *
          </label>
          <input
            id="security-current-pass"
            type="password"
            className="settings-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            required
            placeholder="Enter current password"
          />
        </div>

        <div className="settings-field-group">
          <label htmlFor="security-new-pass" className="settings-label">
            New Password *
          </label>
          <input
            id="security-new-pass"
            type="password"
            className="settings-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            required
            placeholder="Minimum 8 characters"
          />

          {/* Dynamic Strength Meter */}
          {newPassword && (
            <div className="password-meter-wrap">
              <div className="password-meter-bar">
                <div
                  className={`password-meter-progress ${strengthDetails.colorClass}`}
                  style={{ width: `${strengthDetails.percent}%` }}
                />
              </div>
              <div className="password-meter-label">
                <span>Password Strength</span>
                <span className={`meter-strength-text ${strengthDetails.colorClass}`}>
                  {strengthDetails.score}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Requirements checklist */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            Password Requirements:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: strengthDetails.checks.length ? '#10b981' : 'var(--text-muted)' }}>
              {strengthDetails.checks.length ? <Check size={14} /> : <X size={14} />} At least 8 characters
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: strengthDetails.checks.uppercase ? '#10b981' : 'var(--text-muted)' }}>
              {strengthDetails.checks.uppercase ? <Check size={14} /> : <X size={14} />} One uppercase letter
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: strengthDetails.checks.lowercase ? '#10b981' : 'var(--text-muted)' }}>
              {strengthDetails.checks.lowercase ? <Check size={14} /> : <X size={14} />} One lowercase letter
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: strengthDetails.checks.number ? '#10b981' : 'var(--text-muted)' }}>
              {strengthDetails.checks.number ? <Check size={14} /> : <X size={14} />} One number
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: strengthDetails.checks.special ? '#10b981' : 'var(--text-muted)' }}>
              {strengthDetails.checks.special ? <Check size={14} /> : <X size={14} />} One special symbol
            </span>
          </div>
        </div>

        <div className="settings-field-group">
          <label htmlFor="security-confirm-pass" className="settings-label">
            Confirm New Password *
          </label>
          <input
            id="security-confirm-pass"
            type="password"
            className="settings-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
            required
            placeholder="Re-enter new password"
          />
        </div>

        <div className="settings-actions-footer">
          <span className="settings-helper-text">
            Changing your password will secure and invalidate other sessions.
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || strengthDetails.passedCount < 3}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-primary)',
              color: '#fff',
              fontWeight: 600,
              cursor: saving || strengthDetails.passedCount < 3 ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </form>

      {/* Two-Factor Authentication Section */}
      <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="section-pane-header" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 className="section-pane-title" style={{ fontSize: 'var(--text-lg)' }}>
            <Lock size={20} color="var(--accent-pink)" />
            Two-Factor Authentication (2FA)
          </h3>
          <p className="section-pane-desc">
            Require a time-based verification code from your authenticator app each time you sign in.
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>TOTP Authenticator Protection</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: twoFactorEnabled ? '#10b981' : '#ef4444',
                }}
              >
                {twoFactorEnabled ? '✓ Enabled' : 'Disabled'}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Works with Google Authenticator, Microsoft Authenticator, Authy, and 1Password.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTwoFactorModalOpen(true)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              background: twoFactorEnabled ? 'transparent' : 'var(--accent-pink)',
              color: twoFactorEnabled ? 'var(--text-primary)' : '#fff',
              border: twoFactorEnabled ? '1px solid var(--border-medium)' : 'none',
            }}
          >
            {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* Security Audit Log */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <SecurityAlertsCard events={securityEvents} loading={loadingSecurity} />
      </div>

      <TwoFactorSetupModal
        isOpen={twoFactorModalOpen}
        isCurrentlyEnabled={twoFactorEnabled}
        onClose={() => setTwoFactorModalOpen(false)}
        onSuccess={() => {
          loadSecurityOverview();
          setSuccessMsg(twoFactorEnabled ? '2FA disabled.' : '2FA activated successfully!');
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
      />
    </div>
  );
};

export default SecuritySettings;
