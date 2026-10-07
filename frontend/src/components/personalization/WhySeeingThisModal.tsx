import React from 'react';
import { X, Sparkles, Shield, Heart, CheckCircle, Info } from 'lucide-react';
import type { RecommendationExplanation, RecommendationType } from '../../types/personalization';
import Button from '../common/Button';

interface WhySeeingThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recommendationType: RecommendationType;
  explanation: RecommendationExplanation;
  score?: number;
}

export const WhySeeingThisModal: React.FC<WhySeeingThisModalProps> = ({
  isOpen,
  onClose,
  title,
  recommendationType,
  explanation,
  score,
}) => {
  if (!isOpen) return null;

  const getTypeLabel = () => {
    switch (recommendationType) {
      case 'PEOPLE':
        return 'Profile Recommendation';
      case 'COMMUNITY':
        return 'Community Discovery';
      case 'EVENT':
        return 'Event Suggestion';
      case 'POST':
        return 'Feed Content';
      case 'TRENDING':
        return 'Trending Topic';
      default:
        return 'Recommendation';
    }
  };

  return (
    <div className="why-modal-backdrop" onClick={onClose}>
      <div className="why-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="why-modal-header">
          <div className="why-modal-header-icon">
            <Sparkles size={20} className="sparkle-gold" />
          </div>
          <div className="why-modal-title-wrap">
            <span className="why-pill">{getTypeLabel()}</span>
            <h3>Why am I seeing this?</h3>
          </div>
          <button className="why-modal-close-btn" onClick={onClose} aria-label="Close explanation">
            <X size={18} />
          </button>
        </div>

        <div className="why-modal-body">
          <div className="target-item-summary">
            <p className="target-item-name">{title}</p>
            {score !== undefined && (
              <span className="relevance-score-badge">
                <Heart size={12} className="score-icon" />
                Score: {Math.round(score * 10)}
              </span>
            )}
          </div>

          <div className="primary-reason-card">
            <Info size={18} className="reason-info-icon" />
            <div className="reason-text-content">
              <h4>Primary Discovery Signal</h4>
              <p className="primary-reason-text">{explanation.primary}</p>
            </div>
          </div>

          {explanation.details && explanation.details.length > 0 && (
            <div className="explanation-factors-section">
              <h5>Contributing Factors</h5>
              <ul className="factors-list">
                {explanation.details.map((detail, idx) => (
                  <li key={idx} className="factor-item">
                    <CheckCircle size={14} className="factor-check-icon" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.factors.shared_interests && explanation.factors.shared_interests.length > 0 && (
            <div className="shared-interests-chips">
              <span className="chips-label">Matched Interests:</span>
              <div className="chips-group">
                {explanation.factors.shared_interests.map((interest, i) => (
                  <span key={i} className="interest-chip">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="privacy-reassurance-box">
            <div className="privacy-reassurance-header">
              <Shield size={16} className="privacy-shield-icon" />
              <span>Connectly Privacy & Fairness Promise</span>
            </div>
            <p>
              Recommendations are powered by your explicitly selected interests, community memberships, and public engagement. We never infer sensitive attributes or disclose private conversations.
            </p>
          </div>
        </div>

        <div className="why-modal-footer">
          <Button variant="outline" size="sm" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhySeeingThisModal;
