import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import './Premium.css';

export const PremiumModal: React.FC = () => {
  const { upgradeModalState, closeUpgradeModal } = useSubscription();
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && upgradeModalState.isOpen) {
        closeUpgradeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [upgradeModalState.isOpen, closeUpgradeModal]);

  if (!upgradeModalState.isOpen) return null;

  const title = upgradeModalState.title || 'Unlock Connectly Premium';
  const description =
    upgradeModalState.description ||
    'Take your dating experience to the next level with unlimited likes, profile boosts, see who liked you, and higher AI assistance.';

  const handleUpgradeClick = () => {
    closeUpgradeModal();
    navigate('/premium');
  };

  return (
    <div
      className="upgrade-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgradeModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="upgrade-modal-card">
        <button
          className="upgrade-modal-close"
          onClick={closeUpgradeModal}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="upgrade-modal-header">
          <div className="upgrade-modal-sparkle-icon">
            <Sparkles size={32} />
          </div>
          <h3 id="upgrade-modal-title">{title}</h3>
          <p>{description}</p>
        </div>

        <div className="upgrade-modal-perks">
          <div className="upgrade-modal-perk">
            <div className="feature-check-icon">
              <Check size={12} />
            </div>
            <span><strong>Unlimited Daily Likes</strong> — Never get paused</span>
          </div>
          <div className="upgrade-modal-perk">
            <div className="feature-check-icon">
              <Check size={12} />
            </div>
            <span><strong>See Who Liked You</strong> — Match instantly with secret admirers</span>
          </div>
          <div className="upgrade-modal-perk">
            <div className="feature-check-icon">
              <Check size={12} />
            </div>
            <span><strong>Profile Boosts</strong> — 30-min discovery priority</span>
          </div>
          <div className="upgrade-modal-perk">
            <div className="feature-check-icon">
              <Check size={12} />
            </div>
            <span><strong>Advanced Discovery Filters</strong> — Verified only & interests</span>
          </div>
          <div className="upgrade-modal-perk">
            <div className="feature-check-icon">
              <Check size={12} />
            </div>
            <span><strong>Higher AI Assistance</strong> — Smart icebreakers & bio tuning</span>
          </div>
        </div>

        <div className="upgrade-modal-actions">
          <button
            className="plan-cta-btn btn-primary"
            onClick={handleUpgradeClick}
          >
            <span>View Premium Plans</span>
            <ArrowRight size={18} />
          </button>
          <button
            className="plan-cta-btn btn-free"
            onClick={closeUpgradeModal}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
