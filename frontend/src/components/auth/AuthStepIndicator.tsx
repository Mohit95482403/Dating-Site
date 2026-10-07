import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  number: number;
  title: string;
  shortTitle: string;
}

export interface AuthStepIndicatorProps {
  currentStep: number;
  steps: StepItem[];
  onStepClick?: (step: number) => void;
}

export const AuthStepIndicator: React.FC<AuthStepIndicatorProps> = ({
  currentStep,
  steps,
  onStepClick,
}) => {
  return (
    <nav className="step-indicator-nav" aria-label="Registration progress">
      <ol className="step-indicator-list">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = onStepClick && step.number < currentStep;

          return (
            <li
              key={step.number}
              className={`step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                className={`step-badge-btn ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                aria-label={`Step ${step.number}: ${step.title}${
                  isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''
                }`}
              >
                <span className="step-circle">
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.number}
                </span>
                <span className="step-label-text">{step.shortTitle}</span>
              </button>

              {step.number < steps.length && (
                <div
                  className={`step-connector ${step.number < currentStep ? 'filled' : ''}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default AuthStepIndicator;
