import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SettingsService from '../../services/settings.service';
import type { AccountInfo, UpdateAccountInput } from '../../types/settings';
import { useAuth } from '../../context/AuthContext';

export const AccountSettings: React.FC = () => {
  const { refreshUser } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Email change security fields
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SettingsService.getAccountInfo();
      setAccount(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setUsername(data.username || '');
      setEmail(data.email || '');
      setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load account details.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailDirty = account && email !== account.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return;
    }

    if (username.trim()) {
      const usernameClean = username.trim();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(usernameClean)) {
        setErrorMsg('Username must be 3-30 characters with letters, numbers, or underscores.');
        return;
      }
    }

    if (isEmailDirty) {
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setErrorMsg('Confirm email does not match new email.');
        return;
      }
      if (!currentPassword) {
        setErrorMsg('Current password is required to change your email address.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload: UpdateAccountInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        username: username.trim() || null,
        dateOfBirth: dateOfBirth || null,
      };

      if (isEmailDirty) {
        payload.email = email.trim().toLowerCase();
        payload.currentPassword = currentPassword;
      }

      const updated = await SettingsService.updateAccount(payload);
      setAccount(updated);
      setSuccessMsg('Account information updated successfully.');

      // Update global Auth state
      if (refreshUser) {
        await refreshUser();
      }

      // Reset email change fields
      setIsChangingEmail(false);
      setCurrentPassword('');
      setConfirmEmail('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update account information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-empty-state">
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto var(--space-4)' }} />
        <p className="settings-empty-desc">Loading your account details...</p>
      </div>
    );
  }

  return (
    <div className="account-settings-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <User size={24} color="var(--accent-pink)" />
          Account Information
        </h2>
        <p className="section-pane-desc">
          Manage your personal details, unique username, and primary contact email.
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

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-form-grid">
          <div className="settings-field-group">
            <label htmlFor="settings-first-name" className="settings-label">
              First Name *
            </label>
            <input
              id="settings-first-name"
              type="text"
              className="settings-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
              required
              maxLength={50}
              placeholder="e.g. Narendra"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="settings-last-name" className="settings-label">
              Last Name
            </label>
            <input
              id="settings-last-name"
              type="text"
              className="settings-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
              maxLength={50}
              placeholder="e.g. Sharma"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="settings-username" className="settings-label">
              Username
            </label>
            <input
              id="settings-username"
              type="text"
              className="settings-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={saving}
              maxLength={30}
              placeholder="e.g. narendra_connectly"
            />
            <span className="settings-helper-text">
              Letters, numbers, and underscores only (3-30 chars).
            </span>
          </div>

          <div className="settings-field-group">
            <label htmlFor="settings-dob" className="settings-label">
              Date of Birth
            </label>
            <input
              id="settings-dob"
              type="date"
              className="settings-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="settings-field-group full-width">
            <label htmlFor="settings-email" className="settings-label">
              Email Address
            </label>
            <input
              id="settings-email"
              type="email"
              className="settings-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (account && e.target.value !== account.email) {
                  setIsChangingEmail(true);
                } else {
                  setIsChangingEmail(false);
                }
              }}
              disabled={saving}
              required
              placeholder="name@example.com"
            />
          </div>

          {/* Email change verification inputs */}
          {isChangingEmail && (
            <>
              <div className="settings-field-group full-width">
                <label htmlFor="settings-confirm-email" className="settings-label">
                  Confirm New Email *
                </label>
                <input
                  id="settings-confirm-email"
                  type="email"
                  className="settings-input"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  disabled={saving}
                  placeholder="Re-enter your new email address"
                  required
                />
              </div>

              <div className="settings-field-group full-width">
                <label htmlFor="settings-email-password" className="settings-label">
                  Current Password (Required for Email Change) *
                </label>
                <input
                  id="settings-email-password"
                  type="password"
                  className="settings-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={saving}
                  placeholder="Enter current password"
                  required
                />
              </div>
            </>
          )}
        </div>

        <div className="settings-actions-footer">
          <span className="settings-helper-text">
            Member since {account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-primary)',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountSettings;
