import React, { useState } from 'react';
import { Shield, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import SettingsToggle from './SettingsToggle';
import SettingsService from '../../services/settings.service';
import type { UserSettings, ProfileVisibilityType } from '../../types/settings';

interface PrivacySettingsProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ settings, onUpdate }) => {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = async (key: keyof UserSettings, value: boolean) => {
    try {
      setSavingKey(key as string);
      setSuccessMsg(null);
      setErrorMsg(null);
      const updated = await SettingsService.updateSettings({ [key]: value });
      onUpdate(updated);
      setSuccessMsg('Privacy preference saved');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update privacy setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleVisibilityChange = async (visibility: ProfileVisibilityType) => {
    try {
      setSavingKey('profileVisibility');
      setSuccessMsg(null);
      setErrorMsg(null);
      const updated = await SettingsService.updateSettings({ profileVisibility: visibility });
      onUpdate(updated);
      setSuccessMsg('Profile visibility updated');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update visibility');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="privacy-settings-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <Shield size={24} color="var(--accent-pink)" />
          Privacy Controls
        </h2>
        <p className="section-pane-desc">
          Control your profile discoverability, real-time presence indicators, and chat privacy.
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

      {/* Profile Visibility Cards */}
      <div className="settings-field-group" style={{ marginBottom: 'var(--space-6)' }}>
        <label className="settings-label">
          <Eye size={16} /> Who can discover me?
        </label>
        <p className="settings-helper-text" style={{ marginBottom: 'var(--space-3)' }}>
          Determine who can view your profile cards across discovery and search.
        </p>

        <div className="visibility-options-grid">
          <div
            className={`visibility-card ${settings.profileVisibility === 'public' ? 'selected' : ''}`}
            onClick={() => handleVisibilityChange('public')}
          >
            <div className="visibility-card-title">🌐 Everyone</div>
            <div className="visibility-card-desc">
              Your profile is visible to all active users in your discovery pool.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.profileVisibility === 'matches_only' ? 'selected' : ''}`}
            onClick={() => handleVisibilityChange('matches_only')}
          >
            <div className="visibility-card-title">⭐ Recommended Users</div>
            <div className="visibility-card-desc">
              Only users with high mutual compatibility scores can see you.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.profileVisibility === 'hidden' ? 'selected' : ''}`}
            onClick={() => handleVisibilityChange('hidden')}
          >
            <div className="visibility-card-title">🔒 Nobody (Private)</div>
            <div className="visibility-card-desc">
              Hidden from discovery. Only existing matches can see your messages.
            </div>
          </div>
        </div>
      </div>

      {/* Presence & Real-time Toggles */}
      <div className="privacy-toggles-section">
        <SettingsToggle
          id="privacy-online-status"
          checked={settings.showOnlineStatus}
          onChange={(val) => handleToggle('showOnlineStatus', val)}
          disabled={savingKey === 'showOnlineStatus'}
          label="Show Online Status"
          description="Allow matches to see when you are actively online on Connectly."
        />

        <SettingsToggle
          id="privacy-last-seen"
          checked={settings.showLastSeen}
          onChange={(val) => handleToggle('showLastSeen', val)}
          disabled={savingKey === 'showLastSeen'}
          label="Show Last Seen"
          description="Display the time of your last activity to your matches in chat."
        />

        <SettingsToggle
          id="privacy-read-receipts"
          checked={settings.showReadReceipts}
          onChange={(val) => handleToggle('showReadReceipts', val)}
          disabled={savingKey === 'showReadReceipts'}
          label="Read Receipts"
          description="Show blue checkmarks when you have read incoming messages."
        />

        <SettingsToggle
          id="privacy-typing-indicator"
          checked={settings.showTypingIndicator}
          onChange={(val) => handleToggle('showTypingIndicator', val)}
          disabled={savingKey === 'showTypingIndicator'}
          label="Typing Indicators"
          description="Display when you are actively composing a reply in the chat window."
        />

        <SettingsToggle
          id="privacy-search-visibility"
          checked={settings.searchVisibility !== false}
          onChange={(val) => handleToggle('searchVisibility', val)}
          disabled={savingKey === 'searchVisibility'}
          label="Search Visibility"
          description="Allow your profile to appear in global and keyword searches across Connectly."
        />

        <SettingsToggle
          id="privacy-ai-data"
          checked={settings.aiDataProcessing !== false}
          onChange={(val) => handleToggle('aiDataProcessing', val)}
          disabled={savingKey === 'aiDataProcessing'}
          label="AI Privacy & Profile Analysis"
          description="Allow privacy-safe AI compatibility insights and smart recommendation assistance."
        />
      </div>

      {/* Location Privacy Rule */}
      <div className="settings-field-group" style={{ marginTop: 'var(--space-6)' }}>
        <label className="settings-label">
          📍 Location Privacy
        </label>
        <p className="settings-helper-text" style={{ marginBottom: 'var(--space-3)' }}>
          Connectly strictly protects your privacy: raw GPS coordinates and exact addresses are never shared with other users.
        </p>

        <div className="visibility-options-grid">
          <div
            className={`visibility-card ${settings.locationVisibility === 'approximate' || !settings.locationVisibility ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('locationVisibility');
              const res = await SettingsService.updateSettings({ locationVisibility: 'approximate' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🎯 Approximate Distance</div>
            <div className="visibility-card-desc">
              Shows distance rounded to the nearest kilometer (e.g., &quot;Within 5 km&quot;).
            </div>
          </div>

          <div
            className={`visibility-card ${settings.locationVisibility === 'city_only' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('locationVisibility');
              const res = await SettingsService.updateSettings({ locationVisibility: 'city_only' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🏙️ City / Region Only</div>
            <div className="visibility-card-desc">
              Only displays your general city (e.g., &quot;Nashik, Maharashtra&quot;) without distance.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.locationVisibility === 'hidden' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('locationVisibility');
              const res = await SettingsService.updateSettings({ locationVisibility: 'hidden' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🚫 Completely Hidden</div>
            <div className="visibility-card-desc">
              Hides all location and distance indicators from your public profile cards.
            </div>
          </div>
        </div>
      </div>

      {/* Message Permissions */}
      <div className="settings-field-group" style={{ marginTop: 'var(--space-6)' }}>
        <label className="settings-label">
          💬 Who can message me?
        </label>
        <p className="settings-helper-text" style={{ marginBottom: 'var(--space-3)' }}>
          Enforced server-side: requests from unauthorized senders are rejected automatically.
        </p>

        <div className="visibility-options-grid">
          <div
            className={`visibility-card ${settings.messagePermissions === 'matches_only' || !settings.messagePermissions ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('messagePermissions');
              const res = await SettingsService.updateSettings({ messagePermissions: 'matches_only' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">⭐ Mutual Matches Only</div>
            <div className="visibility-card-desc">
              Only people you have mutually matched with can start a direct conversation.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.messagePermissions === 'verified_only' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('messagePermissions');
              const res = await SettingsService.updateSettings({ messagePermissions: 'verified_only' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🛡️ Verified Users Only</div>
            <div className="visibility-card-desc">
              Require senders to have verified their identity badge before messaging you.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.messagePermissions === 'everyone' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('messagePermissions');
              const res = await SettingsService.updateSettings({ messagePermissions: 'everyone' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🌐 Open to All</div>
            <div className="visibility-card-desc">
              Any registered community member can send an introductory message.
            </div>
          </div>
        </div>
      </div>

      {/* Call Permissions */}
      <div className="settings-field-group" style={{ marginTop: 'var(--space-6)' }}>
        <label className="settings-label">
          📞 Who can call me?
        </label>
        <p className="settings-helper-text" style={{ marginBottom: 'var(--space-3)' }}>
          Controls WebRTC voice and video call initiation privileges.
        </p>

        <div className="visibility-options-grid">
          <div
            className={`visibility-card ${settings.callPermissions === 'matches_only' || !settings.callPermissions ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('callPermissions');
              const res = await SettingsService.updateSettings({ callPermissions: 'matches_only' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">⭐ Matches Only</div>
            <div className="visibility-card-desc">
              Only mutual connections are authorized to initiate audio/video calls.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.callPermissions === 'verified_only' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('callPermissions');
              const res = await SettingsService.updateSettings({ callPermissions: 'verified_only' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🛡️ Verified Matches Only</div>
            <div className="visibility-card-desc">
              Only matches with verified trust badges can place calls to you.
            </div>
          </div>

          <div
            className={`visibility-card ${settings.callPermissions === 'nobody' ? 'selected' : ''}`}
            onClick={async () => {
              setSavingKey('callPermissions');
              const res = await SettingsService.updateSettings({ callPermissions: 'nobody' });
              onUpdate(res);
              setSavingKey(null);
            }}
          >
            <div className="visibility-card-title">🔕 Do Not Disturb (Nobody)</div>
            <div className="visibility-card-desc">
              Block all incoming call attempts. Calls will be rejected at the signaling gateway.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
