import React from 'react';
import { X, Star, Heart, Info } from 'lucide-react';
import './Discovery.css';

interface DiscoveryActionsProps {
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  onOpenDetails: () => void;
  disabled?: boolean;
}

export const DiscoveryActions: React.FC<DiscoveryActionsProps> = ({
  onPass,
  onSuperLike,
  onLike,
  onOpenDetails,
  disabled = false,
}) => {
  return (
    <div className="discovery-actions-bar" role="toolbar" aria-label="Profile discovery actions">
      {/* PASS BUTTON */}
      <button
        type="button"
        className="action-btn pass-btn"
        onClick={onPass}
        disabled={disabled}
        aria-label="Pass on this profile"
        title="Pass (Left Arrow)"
      >
        <X size={26} strokeWidth={2.5} />
        <span className="action-tooltip">Pass (←)</span>
      </button>

      {/* SUPER LIKE BUTTON */}
      <button
        type="button"
        className="action-btn super-btn"
        onClick={onSuperLike}
        disabled={disabled}
        aria-label="Super like this profile"
        title="Super Like (Up Arrow)"
      >
        <Star size={24} strokeWidth={2.5} fill="currentColor" />
        <span className="action-tooltip">Super Like (↑)</span>
      </button>

      {/* LIKE BUTTON */}
      <button
        type="button"
        className="action-btn like-btn"
        onClick={onLike}
        disabled={disabled}
        aria-label="Like this profile"
        title="Like (Right Arrow)"
      >
        <Heart size={28} strokeWidth={2.5} fill="currentColor" />
        <span className="action-tooltip">Like (→)</span>
      </button>

      {/* VIEW DETAILS / INFO */}
      <button
        type="button"
        className="action-btn info-btn"
        onClick={onOpenDetails}
        disabled={disabled}
        aria-label="View full profile details"
        title="View Profile Details (Space)"
      >
        <Info size={22} strokeWidth={2.2} />
        <span className="action-tooltip">Details</span>
      </button>
    </div>
  );
};

export default DiscoveryActions;
