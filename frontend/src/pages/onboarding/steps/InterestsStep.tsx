import React, { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { onboardingService } from '../../../services/onboarding.service';
import type { Interest } from '../../../types/onboarding';
import { ArrowLeft, ArrowRight, Sparkles, Check, RefreshCw } from 'lucide-react';

export interface InterestsStepProps {
  selectedInterestIds: number[];
  onChange: (ids: number[]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  errors: Record<string, string>;
}

// Map slugs to emoji icons for modern dating app vibe
const INTEREST_EMOJIS: Record<string, string> = {
  travel: '✈️',
  music: '🎵',
  photography: '📸',
  gaming: '🎮',
  fitness: '🏃',
  movies: '🎬',
  reading: '📚',
  cooking: '🍳',
  technology: '💻',
  art: '🎨',
  sports: '⚽',
  nature: '🌿',
  dancing: '💃',
  food: '🍕',
  business: '💼',
  entrepreneurship: '🚀',
  coding: '👨‍💻',
  fashion: '👗',
  volunteering: '🤝',
  adventure: '🧗',
};

export const InterestsStep: React.FC<InterestsStepProps> = ({
  selectedInterestIds,
  onChange,
  onNext,
  onBack,
  isSaving,
  errors,
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchInterests = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await onboardingService.getInterests();
      setInterests(list);
    } catch {
      setLoadError('Unable to load interests from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, []);

  const toggleInterest = (id: number) => {
    if (selectedInterestIds.includes(id)) {
      onChange(selectedInterestIds.filter((item) => item !== id));
    } else {
      if (selectedInterestIds.length >= 10) {
        return; // Max 10 limit
      }
      onChange([...selectedInterestIds, id]);
    }
  };

  const count = selectedInterestIds.length;
  const isMinSatisfied = count >= 3;

  return (
    <div className="onboarding-step-pane">
      <div className="step-header-text">
        <h2>Choose Your Interests</h2>
        <p>Select passions that represent you. We'll use these to connect you with people who share your vibe.</p>
      </div>

      {/* Counter Banner */}
      <div className="interests-status-bar">
        <div className="selection-count-pill">
          <Sparkles size={14} className="sparkle-accent" />
          <span>
            Selected: <strong>{count}</strong> / 10 (Min. 3 required)
          </span>
        </div>
        {!isMinSatisfied && (
          <span className="min-required-hint">
            Pick at least {3 - count} more {3 - count === 1 ? 'interest' : 'interests'}
          </span>
        )}
        {isMinSatisfied && (
          <span className="min-satisfied-hint">
            <Check size={14} /> Great selection!
          </span>
        )}
      </div>

      {errors.interests && (
        <div className="field-error-msg interests-error" role="alert">
          {errors.interests}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="interests-loading-grid">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="interest-chip-skeleton"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="interests-error-box">
          <p>{loadError}</p>
          <Button variant="outline" size="sm" onClick={fetchInterests}>
            <RefreshCw size={14} /> Try Again
          </Button>
        </div>
      )}

      {/* Interests Grid */}
      {!loading && !loadError && (
        <div className="interests-chips-grid" role="group" aria-label="Available interests">
          {interests.map((interest) => {
            const isSelected = selectedInterestIds.includes(interest.id);
            const emoji = INTEREST_EMOJIS[interest.slug.toLowerCase()] || '✨';

            return (
              <button
                key={interest.id}
                type="button"
                className={`interest-card-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleInterest(interest.id)}
                aria-pressed={isSelected}
              >
                <span className="interest-emoji" aria-hidden="true">{emoji}</span>
                <span className="interest-name">{interest.name}</span>
                {isSelected && (
                  <span className="interest-check-icon" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
          disabled={isSaving || !isMinSatisfied}
        >
          Continue to Preferences <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default InterestsStep;
