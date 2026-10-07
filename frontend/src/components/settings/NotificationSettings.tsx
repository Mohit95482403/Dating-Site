import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import SettingsToggle from './SettingsToggle';
import SettingsService from '../../services/settings.service';
import type { UserSettings } from '../../types/settings';

interface NotificationSettingsProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onUpdate }) => {
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
      setSuccessMsg('Notification preference saved');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update preference');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="notification-settings-container">
      <div className="section-pane-header">
        <h2 className="section-pane-title">
          <Bell size={24} color="var(--accent-pink)" />
          Notification Preferences
        </h2>
        <p className="section-pane-desc">
          Choose which real-time activity and alerts trigger notifications in your Connectly feed.
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

      <div className="notification-toggles-section">
        <SettingsToggle
          id="notify-matches"
          checked={settings.notifyMatches}
          onChange={(val) => handleToggle('notifyMatches', val)}
          disabled={savingKey === 'notifyMatches'}
          label="New Matches"
          description="Alert me immediately when a mutual like turns into a match."
        />

        <SettingsToggle
          id="notify-messages"
          checked={settings.notifyMessages}
          onChange={(val) => handleToggle('notifyMessages', val)}
          disabled={savingKey === 'notifyMessages'}
          label="New Messages"
          description="Send notifications for new direct chat messages from your connections."
        />

        <SettingsToggle
          id="notify-likes"
          checked={settings.notifyLikes}
          onChange={(val) => handleToggle('notifyLikes', val)}
          disabled={savingKey === 'notifyLikes'}
          label="Profile Likes"
          description="Notify me whenever someone likes my profile in Discovery."
        />

        <SettingsToggle
          id="notify-superlikes"
          checked={settings.notifySuperLikes}
          onChange={(val) => handleToggle('notifySuperLikes', val)}
          disabled={savingKey === 'notifySuperLikes'}
          label="Super Likes"
          description="Receive high-priority alerts when someone gives you a Super Like."
        />

        <SettingsToggle
          id="notify-reactions"
          checked={settings.notifyReactions}
          onChange={(val) => handleToggle('notifyReactions', val)}
          disabled={savingKey === 'notifyReactions'}
          label="Message Reactions"
          description="Alert me when someone reacts with an emoji to one of my messages."
        />

        <SettingsToggle
          id="notify-system"
          checked={settings.notifySystem}
          onChange={(val) => handleToggle('notifySystem', val)}
          disabled={savingKey === 'notifySystem'}
          label="System & Security Announcements"
          description="Important platform updates, security alerts, and feature news."
        />
      </div>
    </div>
  );
};

export default NotificationSettings;
