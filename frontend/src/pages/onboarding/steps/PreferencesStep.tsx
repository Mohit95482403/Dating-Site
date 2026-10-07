import React from 'react';
import Button from '../../../components/common/Button';
import type { PreferencesData } from '../../../types/onboarding';
import { ArrowLeft, ArrowRight, Heart, Sliders, Compass, Target } from 'lucide-react';

export interface PreferencesStepProps {
  data: PreferencesData;
  onChange: (updated: Partial<PreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  errors: Record<string, string>;
}

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  isSaving,
  errors,
}) => {
  const genderOptions = [
    { value: 'all', label: 'Everyone / Any' },
    { value: 'female', label: 'Women' },
    { value: 'male', label: 'Men' },
    { value: 'non_binary', label: 'Non-binary People' },
  ];

  const goalOptions = [
    { value: 'long_term', title: 'Long-term Relationship', desc: 'Looking for a committed partner' },
    { value: 'dating', title: 'Dating & Romance', desc: 'Going on dates and seeing where it leads' },
    { value: 'friendship', title: 'New Friendships', desc: 'Platonic connections & activity partners' },
    { value: 'casual', title: 'Casual Fun', desc: 'Relaxed hangout with no pressure' },
    { value: 'marriage', title: 'Marriage Partner', desc: 'Intentional dating toward marriage' },
    { value: 'not_sure', title: 'Open Minded', desc: 'Exploring and open to whatever fits' },
  ];

  return (
    <div className="onboarding-step-pane">
      <div className="step-header-text">
        <h2>Dating & Connection Preferences</h2>
        <p>Tell us who you'd like to meet and your relationship intentions.</p>
      </div>

      {/* Preferred Gender */}
      <div className="preference-group-box">
        <div className="pref-header">
          <Heart size={16} className="pref-icon" />
          <label className="pref-title">I'm Interested In</label>
        </div>
        <div className="pref-chips-grid">
          {genderOptions.map((opt) => {
            const isSelected = data.preferredGender === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`pref-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onChange({ preferredGender: opt.value })}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {errors.preferredGender && (
          <span className="field-error-msg">{errors.preferredGender}</span>
        )}
      </div>

      {/* Age Range */}
      <div className="preference-group-box">
        <div className="pref-header">
          <Sliders size={16} className="pref-icon" />
          <label className="pref-title">
            Age Preference:{' '}
            <span className="pref-value-highlight">
              {data.minAge} — {data.maxAge} years old
            </span>
          </label>
        </div>

        <div className="age-range-controls">
          <div className="age-slider-row">
            <span className="slider-label">Min: {data.minAge}</span>
            <input
              type="range"
              min="18"
              max="99"
              value={data.minAge}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val <= data.maxAge) {
                  onChange({ minAge: val });
                }
              }}
              className="range-slider"
            />
          </div>

          <div className="age-slider-row">
            <span className="slider-label">Max: {data.maxAge}</span>
            <input
              type="range"
              min="19"
              max="100"
              value={data.maxAge}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= data.minAge) {
                  onChange({ maxAge: val });
                }
              }}
              className="range-slider"
            />
          </div>
        </div>
        {errors.age && <span className="field-error-msg">{errors.age}</span>}
      </div>

      {/* Max Distance */}
      <div className="preference-group-box">
        <div className="pref-header">
          <Compass size={16} className="pref-icon" />
          <label className="pref-title">
            Maximum Distance:{' '}
            <span className="pref-value-highlight">Up to {data.maxDistanceKm} km</span>
          </label>
        </div>

        <div className="distance-slider-wrap">
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={data.maxDistanceKm}
            onChange={(e) => onChange({ maxDistanceKm: parseInt(e.target.value, 10) })}
            className="range-slider"
          />
          <div className="range-scale-labels">
            <span>5 km</span>
            <span>150 km</span>
            <span>300 km</span>
          </div>
        </div>
        {errors.maxDistanceKm && (
          <span className="field-error-msg">{errors.maxDistanceKm}</span>
        )}
      </div>

      {/* Relationship Goal */}
      <div className="preference-group-box">
        <div className="pref-header">
          <Target size={16} className="pref-icon" />
          <label className="pref-title">Relationship Goal</label>
        </div>

        <div className="goals-grid">
          {goalOptions.map((opt) => {
            const isSelected = data.relationshipGoal === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`goal-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onChange({ relationshipGoal: opt.value })}
              >
                <span className="goal-title">{opt.title}</span>
                <span className="goal-desc">{opt.desc}</span>
              </button>
            );
          })}
        </div>
        {errors.relationshipGoal && (
          <span className="field-error-msg">{errors.relationshipGoal}</span>
        )}
      </div>

      {/* Actions */}
      <div className="onboarding-step-actions">
        <Button
          variant="ghost"
          size="lg"
          type="button"
          onClick={onBack}
          disabled={isSaving}
        >
          <ArrowLeft size={18} /> Back
        </Button>

        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={onNext}
          disabled={isSaving}
        >
          Continue to Photos <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default PreferencesStep;
