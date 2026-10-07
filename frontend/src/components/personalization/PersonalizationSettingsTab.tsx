import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Sliders, 
  BrainCircuit, 
  Tag, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import personalizationService from '../../services/personalization.service';
import type { PersonalizationSettings } from '../../types/personalization';
import Button from '../common/Button';
import { useToast } from '../../hooks/useToast';

export const PersonalizationSettingsTab: React.FC = () => {
  const toast = useToast();
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [interests, setInterests] = useState<{
    explicit: Array<{ interest_id: number; name: string }>;
    inferred: Array<{ interest_id: number; name: string; score: number; source: string }>;
  }>({ explicit: [], inferred: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedSettings, fetchedInterests] = await Promise.all([
        personalizationService.getSettings(),
        personalizationService.getUserInterests(),
      ]);
      setSettings(fetchedSettings);
      setInterests(fetchedInterests);
    } catch {
      toast.error('Failed to load personalization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof PersonalizationSettings) => {
    if (!settings) return;
    const updatedValue = !settings[key];
    const newSettings = { ...settings, [key]: updatedValue };
    setSettings(newSettings);

    try {
      await personalizationService.updateSettings({ [key]: updatedValue });
      toast.success('Preference updated successfully');
    } catch {
      toast.error('Failed to update setting');
      setSettings(settings); // revert
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await personalizationService.resetPersonalization();
      toast.success('Personalized recommendations and inferred preferences reset.');
      setShowResetModal(false);
      await loadData();
    } catch {
      toast.error('Failed to reset recommendations');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="personalization-loading-state">
        <div className="personalization-spinner" />
        <p>Loading your personalization preferences...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="personalization-error-state">
        <p>Unable to load personalization settings.</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="personalization-settings-container">
      {/* Header Banner */}
      <div className="personalization-header-card glass-panel">
        <div className="header-icon-badge">
          <BrainCircuit size={24} className="brain-icon" />
        </div>
        <div className="header-info">
          <h3>AI Personalization & Recommendation Intelligence</h3>
          <p>
            Control how Connectly tailors discovery to your genuine lifestyle and passions while preserving rigorous privacy.
          </p>
        </div>
        <div className="experiment-pill-badge" title="A/B Experiment Assignment">
          <span className="exp-label">Experiment Group</span>
          <span className="exp-value">{settings.experiment_version === 'v2' ? 'V2 (Behavior-Weighted)' : 'V1 (Standard Hybrid)'}</span>
        </div>
      </div>

      {/* Main Toggles Section */}
      <div className="settings-section glass-panel">
        <h4 className="settings-section-title">
          <Sliders size={18} /> Discovery & Recommendation Controls
        </h4>

        <div className="toggle-list">
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Personalized Recommendations</span>
              <span className="toggle-desc">
                Enable tailored profile and member recommendations based on your selected interests and mutual connections.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.personalized_recommendations}
                onChange={() => handleToggle('personalized_recommendations')}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Personalized Social Feed</span>
              <span className="toggle-desc">
                Prioritize posts from active communities and topics you frequently interact with.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.personalized_feed}
                onChange={() => handleToggle('personalized_feed')}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Personalized Communities</span>
              <span className="toggle-desc">
                Highlight trending communities matching your passions and categories.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.personalized_communities}
                onChange={() => handleToggle('personalized_communities')}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Personalized Community Events</span>
              <span className="toggle-desc">
                Suggest upcoming meetups and online events matching your joined clubs and lifestyle interests.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.personalized_events}
                onChange={() => handleToggle('personalized_events')}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Search Personalization</span>
              <span className="toggle-desc">
                Sort search and explore results with relevant lifestyle affinity without hiding exact query matches.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.search_personalization}
                onChange={() => handleToggle('search_personalization')}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">AI-Assisted Match Explanations</span>
              <span className="toggle-desc">
                Generate intuitive explanations and compatibility summaries highlighting mutual passions.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.ai_recommendations}
                onChange={() => handleToggle('ai_recommendations')}
              />
              <span className="slider round" />
            </label>
          </div>
        </div>
      </div>

      {/* Explicit vs Inferred Interests Model */}
      <div className="settings-section glass-panel">
        <h4 className="settings-section-title">
          <Tag size={18} /> Your Interest Intelligence Profile
        </h4>

        <div className="interests-comparison-grid">
          {/* Explicit Interests */}
          <div className="interest-sub-card">
            <div className="sub-card-header">
              <CheckCircle2 size={16} className="text-emerald" />
              <h5>Your Selected Profile Interests</h5>
            </div>
            <p className="sub-card-desc">Explicit selections carrying the strongest baseline weighting.</p>
            {interests.explicit.length > 0 ? (
              <div className="tags-flex-wrap">
                {interests.explicit.map((item) => (
                  <span key={item.interest_id} className="explicit-tag-pill">
                    {item.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty-sub-msg">No profile interests selected yet. Update your profile to add interests!</p>
            )}
          </div>

          {/* Inferred Behavioral Interests */}
          <div className="interest-sub-card">
            <div className="sub-card-header">
              <Sparkles size={16} className="text-amber" />
              <h5>Interests Inferred from Permitted Activity</h5>
            </div>
            <p className="sub-card-desc">Non-sensitive lifestyle topics learned from community joins and post interactions.</p>
            {interests.inferred.length > 0 ? (
              <div className="tags-flex-wrap">
                {interests.inferred.map((item) => (
                  <span key={item.interest_id} className="inferred-tag-pill" title={`Source: ${item.source} • Score: ${item.score}`}>
                    {item.name} <span className="source-label">({item.source})</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty-sub-msg">No inferred behavioral interests yet. Connectly learns as you explore.</p>
            )}
          </div>
        </div>
      </div>

      {/* Reset Personalization Section */}
      <div className="danger-zone-card glass-panel">
        <div className="danger-info">
          <div className="danger-title-wrap">
            <RotateCcw size={18} className="danger-icon" />
            <h4>Reset Recommendation Intelligence</h4>
          </div>
          <p>
            Clear all inferred behavioral preferences, dismiss history, and negative feedback penalties. Your explicit profile interests and account data will be retained.
          </p>
        </div>
        <Button variant="danger" size="md" onClick={() => setShowResetModal(true)}>
          Reset Recommendations
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="why-modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="why-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="why-modal-header">
              <AlertTriangle size={24} className="text-amber" />
              <h3>Reset Personalized Discovery?</h3>
            </div>
            <div className="why-modal-body">
              <p>
                This will clear all recommendation history, repetition tracking, and behavioral affinity scores. Recommendations will be refreshed according to your explicit profile selections.
              </p>
            </div>
            <div className="why-modal-footer">
              <Button variant="outline" size="sm" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizationSettingsTab;
