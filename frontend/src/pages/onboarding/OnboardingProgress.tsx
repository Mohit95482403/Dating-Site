import React from 'react';
import { Check } from 'lucide-react';

export interface StepMeta {
  number: number;
  key: string;
  label: string;
}

export const ONBOARDING_STEPS: StepMeta[] = [
  { number: 1, key: 'basic', label: 'Basic Info' },
  { number: 2, key: 'about', label: 'About You' },
  { number: 3, key: 'interests', label: 'Interests' },
  { number: 4, key: 'preferences', label: 'Preferences' },
  { number: 5, key: 'photos', label: 'Photos' },
];

export interface OnboardingProgressProps {
  currentStep: number;
  completedSteps: string[];
  completionPercentage: number;
  onStepClick?: (stepNumber: number) => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  completedSteps,
  completionPercentage,
  onStepClick,
}) => {
  return (
    <div className="onboarding-progress-wrapper" role="region" aria-label="Onboarding Progress">
      {/* Top progress metrics */}
      <div className="progress-metrics-row">
        <span className="step-counter-text">
          Step {currentStep} of {ONBOARDING_STEPS.length}
        </span>
        <span className="completion-badge">
          {completionPercentage}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" aria-hidden="true">
        <div
          className="progress-bar-fill"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Step items nav */}
      <nav className="steps-nav-row" aria-label="Steps navigation">
        <ol className="steps-nav-list">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.key);
            const isCurrent = step.number === currentStep;
            const isClickable = onStepClick && isCompleted && !isCurrent;

            return (
              <li
                key={step.number}
                className={`step-nav-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <button
                  type="button"
                  className={`step-nav-btn ${isClickable ? 'clickable' : ''}`}
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  aria-label={`Step ${step.number}: ${step.label}${
                    isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''
                  }`}
                >
                  <span className="step-nav-circle">
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : step.number}
                  </span>
                  <span className="step-nav-label">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default OnboardingProgress;
