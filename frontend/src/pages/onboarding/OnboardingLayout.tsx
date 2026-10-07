import React from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import OnboardingProgress from './OnboardingProgress';

export interface OnboardingLayoutProps {
  currentStep: number;
  completedSteps: string[];
  completionPercentage: number;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onStepClick?: (step: number) => void;
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  completedSteps,
  completionPercentage,
  autosaveStatus,
  onStepClick,
  children,
}) => {
  return (
    <div className="onboarding-page-root">
      {/* Main Container with generous navbar clearance */}
      <main className="onboarding-content-container">
        <div className="onboarding-card glass-panel">
          {/* Card Top Meta: Autosave & Badge */}
          <div className="onboarding-card-meta-bar">
            <span className="onboarding-flow-badge">MEMBER ONBOARDING</span>

            {/* Autosave Indicator */}
            <div className="autosave-status-chip" role="status" aria-live="polite">
              {autosaveStatus === 'saving' && (
                <>
                  <Loader2 size={13} className="spin-icon" />
                  <span>Saving...</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <>
                  <CheckCircle2 size={13} className="saved-icon" />
                  <span>Saved to cloud</span>
                </>
              )}
              {autosaveStatus === 'error' && (
                <>
                  <AlertCircle size={13} className="error-icon" />
                  <span>Autosave error</span>
                </>
              )}
              {autosaveStatus === 'idle' && (
                <span className="idle-indicator">Autosave ready</span>
              )}
            </div>
          </div>
          <OnboardingProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            completionPercentage={completionPercentage}
            onStepClick={onStepClick}
          />

          <div className="onboarding-step-body">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;
