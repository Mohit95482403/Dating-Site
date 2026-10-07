import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Mail,
  HardDrive,
  Users,
  Sparkles,
  Video,
  Clock,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { PlatformSettingItem } from '../../types/admin';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Critical Confirmation Modal (for Maintenance Mode)
  const [pendingConfirm, setPendingConfirm] = useState<{
    key: string;
    newValue: string;
    title: string;
    description: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await adminService.getPlatformSettings();
      setSettings(data);
      const valMap: Record<string, string> = {};
      data.forEach((s) => {
        valMap[s.key] = s.value;
      });
      setEditedValues(valMap);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load platform settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSetting = async (key: string, targetValue?: string) => {
    const valueToSave = targetValue !== undefined ? targetValue : editedValues[key];

    // Intercept critical settings for safety confirmation
    if (key === 'maintenance_mode' && targetValue === undefined) {
      const isEnabling = valueToSave === 'true';
      setPendingConfirm({
        key,
        newValue: valueToSave,
        title: isEnabling ? 'Activate Maintenance Mode?' : 'Deactivate Maintenance Mode?',
        description: isEnabling
          ? 'Enabling maintenance mode will restrict all normal users to the maintenance screen. Only authenticated administrators will have platform access.'
          : 'Deactivating maintenance mode will restore normal public access to all users across Connectly.',
      });
      return;
    }

    try {
      setIsSavingKey(key);
      setErrorMessage(null);
      setSuccessMessage(null);
      const updated = await adminService.updatePlatformSetting(key, valueToSave);
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
      setEditedValues((prev) => ({ ...prev, [key]: updated.value }));
      setSuccessMessage(`Platform setting "${key}" saved successfully.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || `Failed to update "${key}".`);
    } finally {
      setIsSavingKey(null);
      setPendingConfirm(null);
    }
  };

  const confirmCriticalAction = () => {
    if (!pendingConfirm) return;
    handleSaveSetting(pendingConfirm.key, pendingConfirm.newValue);
  };

  // Group settings by category
  const categories = [
    { id: 'operations', label: 'Operations & Maintenance', icon: <AlertTriangle size={18} color="#f59e0b" /> },
    { id: 'general', label: 'General Brand & Support', icon: <Mail size={18} color="#38bdf8" /> },
    { id: 'access', label: 'Access Control & Limits', icon: <Users size={18} color="#a855f7" /> },
    { id: 'ai', label: 'AI & Machine Learning', icon: <Sparkles size={18} color="#ec4899" /> },
    { id: 'communication', label: 'Real-Time Communication', icon: <Video size={18} color="#34d399" /> },
    { id: 'storage', label: 'Storage & Uploads', icon: <HardDrive size={18} color="#60a5fa" /> },
  ];

  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={24} color="#818cf8" />
            Platform Operations &amp; System Configuration
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
            Database-backed operational variables, maintenance gating, and system limits
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={fetchSettings}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Reload Settings</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#818cf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Querying platform configuration registry...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {categories.map((cat) => {
            const catSettings = settings.filter(
              (s) => s.category.toLowerCase() === cat.id || (cat.id === 'general' && s.category === 'support')
            );
            if (catSettings.length === 0) return null;

            return (
              <div
                key={cat.id}
                style={{
                  background: '#131722',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
              >
                {/* Category Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  {cat.icon}
                  <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                    {cat.label}
                  </h2>
                </div>

                {/* Settings Items */}
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {catSettings.map((setting) => {
                    const isChanged = editedValues[setting.key] !== setting.value;
                    const isSaving = isSavingKey === setting.key;

                    return (
                      <div
                        key={setting.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '1.5rem',
                          paddingBottom: '1rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc' }}>
                              {setting.key}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                              }}
                            >
                              {setting.type}
                            </span>
                            {setting.isPublic && (
                              <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                Public Client API
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {setting.description}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
                            <Clock size={12} />
                            <span>Last updated {new Date(setting.updatedAt).toLocaleString()}</span>
                            {setting.updatedByName && (
                              <span>by <strong>{setting.updatedByName}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Setting Input Control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px', justifyContent: 'flex-end' }}>
                          {setting.type === 'boolean' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={editedValues[setting.key] ?? setting.value}
                                onChange={(e) => handleInputChange(setting.key, e.target.value)}
                                style={{
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '8px',
                                  background: (editedValues[setting.key] ?? setting.value) === 'true'
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  color: (editedValues[setting.key] ?? setting.value) === 'true'
                                    ? '#4ade80'
                                    : '#f87171',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                              >
                                <option value="true">ENABLED (True)</option>
                                <option value="false">DISABLED (False)</option>
                              </select>
                            </div>
                          ) : (
                            <input
                              type={setting.type === 'number' ? 'number' : 'text'}
                              value={editedValues[setting.key] ?? setting.value}
                              onChange={(e) => handleInputChange(setting.key, e.target.value)}
                              style={{
                                width: '220px',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            />
                          )}

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            disabled={!isChanged || isSaving}
                            onClick={() => handleSaveSetting(setting.key)}
                            style={{
                              background: isChanged ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.05)',
                              color: isChanged ? '#fff' : '#64748b',
                              border: 'none',
                              padding: '0.45rem 0.75rem',
                            }}
                          >
                            <Save size={14} />
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Critical Operations */}
      {pendingConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
          onClick={() => setPendingConfirm(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#131722',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} color="#f59e0b" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                {pendingConfirm.title}
              </h3>
            </div>

            <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.55 }}>
              {pendingConfirm.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={confirmCriticalAction}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                Confirm &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
