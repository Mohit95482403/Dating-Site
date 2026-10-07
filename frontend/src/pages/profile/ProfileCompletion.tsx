import React, { useState } from 'react';
import { Award, CheckCircle2, ChevronRight, Zap, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../../components/common/Button';
import type { ProfileCompletionResult } from '../../types/profile';
import './ProfileCompletion.css';

interface ProfileCompletionProps {
  completionPercentage: number;
  isComplete: boolean;
  completion?: ProfileCompletionResult;
  onCompleteClick: () => void;
  onActionClick?: (actionKey: string) => void;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  completionPercentage,
  isComplete,
  completion,
  onCompleteClick,
  onActionClick,
}) => {
  // Clamped between 0 and 100
  const percentage = Math.min(100, Math.max(0, completionPercentage));
  const [showChecklist, setShowChecklist] = useState<boolean>(false);

  const completedItems = completion?.completed || [];
  const missingItems = completion?.missing || [];

  return (
    <div className={`profile-section-card profile-completion-card ${isComplete ? 'completed' : ''}`}>
      <div className="completion-card-header">
        <div className="completion-title-wrap">
          <div className={`completion-icon-box ${isComplete ? 'complete' : ''}`}>
            {isComplete ? (
              <CheckCircle2 size={18} className="completion-check-icon" />
            ) : (
              <Zap size={18} className="completion-zap-icon" />
            )}
          </div>
          <div>
            <h2 className="completion-title">Profile Strength</h2>
            <p className="completion-subtitle">
              {isComplete
                ? "You're all set! Your profile is 100% complete."
                : "You're almost there! Complete these to improve your profile."}
            </p>
          </div>
        </div>

        <div className="completion-percent-badge">
          <span className="percent-number">{percentage}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="completion-progress-track">
        <div
          className={`completion-progress-fill ${isComplete ? 'full' : ''}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Expandable Checklist */}
      {(completedItems.length > 0 || missingItems.length > 0) && (
        <div className="completion-checklist-section">
          <button
            type="button"
            className="completion-toggle-btn"
            onClick={() => setShowChecklist(!showChecklist)}
          >
            <span>
              {missingItems.length > 0
                ? `${missingItems.length} item${missingItems.length > 1 ? 's' : ''} to complete`
                : 'All requirements completed'}
            </span>
            {showChecklist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showChecklist && (
            <div className="completion-checklist-items">
              {completedItems.map((item) => (
                <div key={item} className="checklist-item done">
                  <CheckCircle2 size={16} className="checklist-icon done" />
                  <span className="checklist-text">{item}</span>
                </div>
              ))}
              {missingItems.map((item) => (
                <div
                  key={item}
                  className="checklist-item missing"
                  onClick={() => onActionClick && onActionClick(item)}
                >
                  <Circle size={16} className="checklist-icon missing" />
                  <span className="checklist-text">{item}</span>
                  <span className="checklist-action-hint">Add +</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer / CTA */}
      {!isComplete ? (
        <div className="completion-footer">
          <span className="completion-tip-text">
            Complete your profile to maximize your match engagement
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={onCompleteClick}
            className="complete-profile-btn"
          >
            <span>Complete Profile</span>
            <ChevronRight size={14} />
          </Button>
        </div>
      ) : (
        <div className="completion-all-done">
          <Award size={16} className="all-done-icon" />
          <span>Profile fully completed</span>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletion;
