import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Video,
  CreditCard,
  Rss,
  Clock,
  Compass,
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { FeatureFlagItem } from '../../types/admin';

export const AdminFeatureFlagsPage: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rollout editing
  const [rolloutValues, setRolloutValues] = useState<Record<string, number>>({});
  const [savingRolloutKey, setSavingRolloutKey] = useState<string | null>(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    key: string;
    targetState: boolean;
    name: string;
  } | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await adminService.getFeatureFlags();
      setFlags(data);
      const rMap: Record<string, number> = {};
      data.forEach((f) => {
        rMap[f.key] = f.rolloutPercentage;
      });
      setRolloutValues(rMap);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load feature flags.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggleClick = (flag: FeatureFlagItem) => {
    setConfirmModal({
      key: flag.key,
      targetState: !flag.isEnabled,
      name: flag.name,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal) return;
    const { key, targetState } = confirmModal;

    try {
      setTogglingKey(key);
      setErrorMsg(null);
      await adminService.toggleFeatureFlag(key, targetState);
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, isEnabled: targetState } : f))
      );
      setSuccessMsg(`Feature flag "${key}" is now ${targetState ? 'ENABLED' : 'DISABLED'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || `Failed to toggle feature flag ${key}.`);
    } finally {
      setTogglingKey(null);
      setConfirmModal(null);
    }
  };

  const handleSaveRollout = async (key: string) => {
    const percentage = rolloutValues[key];
    try {
      setSavingRolloutKey(key);
      setErrorMsg(null);
      await adminService.updateFeatureFlag(key, { rolloutPercentage: percentage });
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, rolloutPercentage: percentage } : f))
      );
      setSuccessMsg(`Rollout percentage for "${key}" updated to ${percentage}%.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || `Failed to update rollout for ${key}.`);
    } finally {
      setSavingRolloutKey(null);
    }
  };

  const getFlagIcon = (key: string) => {
    switch (key) {
      case 'AI_FEATURES':
        return <Sparkles size={20} color="#ec4899" />;
      case 'VIDEO_CALLING':
        return <Video size={20} color="#34d399" />;
      case 'PREMIUM_MONETIZATION':
        return <CreditCard size={20} color="#fbbf24" />;
      case 'SOCIAL_FEED':
        return <Rss size={20} color="#38bdf8" />;
      case 'STORIES':
        return <Clock size={20} color="#c084fc" />;
      case 'SMART_RECOMMENDATIONS':
        return <Compass size={20} color="#f43f5e" />;
      case 'TRUST_VERIFICATION':
        return <ShieldCheck size={20} color="#60a5fa" />;
      default:
        return <Flag size={20} color="#818cf8" />;
    }
  };

  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Flag size={24} color="#ec4899" />
            Dynamic Feature Flags &amp; Progressive Rollouts
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
            Safely enable, throttle or disable application modules with instant cluster-wide propagation
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={fetchFlags}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Sync Flags</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#ec4899',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading feature flag registry...</p>
        </div>
      ) : (
        <div className="admin-flags-grid">
          {flags.map((flag) => {
            const isToggling = togglingKey === flag.key;
            const currentRollout = rolloutValues[flag.key] ?? flag.rolloutPercentage;
            const isRolloutChanged = currentRollout !== flag.rolloutPercentage;
            const isSavingRollout = savingRolloutKey === flag.key;

            return (
              <div
                key={flag.key}
                style={{
                  background: '#131722',
                  border: flag.isEnabled
                    ? '1px solid rgba(99, 102, 241, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: flag.isEnabled ? '0 4px 20px rgba(99, 102, 241, 0.08)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Flag Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getFlagIcon(flag.key)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                          {flag.name}
                        </h3>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                        {flag.key}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleClick(flag)}
                    disabled={isToggling}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: 0,
                    }}
                  >
                    {flag.isEnabled ? (
                      <ToggleRight size={38} color="#4ade80" />
                    ) : (
                      <ToggleLeft size={38} color="#64748b" />
                    )}
                  </button>
                </div>

                {/* Description */}
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55 }}>
                  {flag.description}
                </p>

                {/* Rollout Percentage Slider */}
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Progressive Rollout:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: flag.isEnabled ? '#38bdf8' : '#64748b' }}>
                        {flag.isEnabled ? `${currentRollout}%` : 'Disabled (0%)'}
                      </span>
                      {isRolloutChanged && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          disabled={isSavingRollout}
                          onClick={() => handleSaveRollout(flag.key)}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        >
                          <Save size={12} />
                          <span>{isSavingRollout ? 'Saving...' : 'Apply'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    disabled={!flag.isEnabled}
                    value={currentRollout}
                    onChange={(e) =>
                      setRolloutValues((prev) => ({ ...prev, [flag.key]: Number(e.target.value) }))
                    }
                    style={{ width: '100%', cursor: flag.isEnabled ? 'pointer' : 'not-allowed', accentColor: '#ec4899' }}
                  />
                </div>

                {/* Audit attribution */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.75rem' }}>
                  <span>Last adjusted {new Date(flag.updatedAt).toLocaleDateString()}</span>
                  {flag.updatedByName && (
                    <span>By: <strong style={{ color: '#94a3b8' }}>{flag.updatedByName}</strong></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
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
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              background: '#131722',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flag size={22} color="#818cf8" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                {confirmModal.targetState ? 'Enable Feature Flag?' : 'Disable Feature Flag?'}
              </h3>
            </div>

            <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Are you sure you want to {confirmModal.targetState ? 'enable' : 'disable'}{' '}
              <strong style={{ color: '#f1f5f9' }}>{confirmModal.name}</strong> ({confirmModal.key})? This action takes immediate effect across all active users.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleConfirmToggle}
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeatureFlagsPage;
