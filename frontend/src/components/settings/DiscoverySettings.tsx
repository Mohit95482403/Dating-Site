import React, { useState } from 'react';
import { Compass, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import SettingsToggle from './SettingsToggle';
import SettingsService from '../../services/settings.service';
import type { UserSettings } from '../../types/settings';

interface DiscoverySettingsProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
}

export const DiscoverySettings: React.FC<DiscoverySettingsProps> = ({ settings, onUpdate }) => {
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
      setSuccessMsg('Discovery preference updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update discovery setting');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="discovery-settings-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <Compass size={24} color="var(--accent-pink)" />
          Discovery Visibility
        </h2>
        <p className="section-pane-desc">
          Manage how and where your card appears when other people are browsing profiles on Connectly.
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

      {/* Explainer Banner */}
      <div
        style={{
          background: 'rgba(255, 51, 102, 0.06)',
          border: '1px solid rgba(255, 51, 102, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}
      >
        <Info size={20} color="var(--accent-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
            How Discovery Visibility Works
          </strong>
          Turning Discovery off hides your profile from candidate decks and new searches. Your existing matches,
          ongoing chats, and active messages remain 100% functional and intact.
        </div>
      </div>

      <div className="discovery-toggles-section">
        <SettingsToggle
          id="discovery-show-me"
          checked={settings.showInDiscovery}
          onChange={(val) => handleToggle('showInDiscovery', val)}
          disabled={savingKey === 'showInDiscovery'}
          label="Show me in Discovery"
          description="While enabled, your profile card is recommended to compatible members matching your criteria."
        />

        <SettingsToggle
          id="discovery-use-location"
          checked={settings.useLocationForDiscovery}
          onChange={(val) => handleToggle('useLocationForDiscovery', val)}
          disabled={savingKey === 'useLocationForDiscovery'}
          label="Use Location for Discovery"
          description="Use your GPS/city coordinates to compute approximate distance and prioritize nearby matches. When disabled, your exact location is obscured."
        />
      </div>
    </div>
  );
};

export default DiscoverySettings;
