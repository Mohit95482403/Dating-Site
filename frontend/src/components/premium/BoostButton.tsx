import React, { useState, useEffect } from 'react';
import { Rocket, Lock, Flame } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import './Premium.css';

interface BoostButtonProps {
  className?: string;
  compact?: boolean;
}

export const BoostButton: React.FC<BoostButtonProps> = ({ className = '', compact = false }) => {
  const { hasFeature, boostStatus, activateBoost, openUpgradeModal, entitlements } =
    useSubscription();
  const [secondsLeft, setSecondsLeft] = useState<number>(boostStatus?.remainingSeconds || 0);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    setSecondsLeft(boostStatus?.remainingSeconds || 0);
  }, [boostStatus?.remainingSeconds]);

  // Real-time local countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isBoostAllowed = hasFeature('PROFILE_BOOST');
  const isActive = secondsLeft > 0;

  const handleClick = async () => {
    if (isActive) return;

    if (!isBoostAllowed) {
      openUpgradeModal(
        'PROFILE_BOOST',
        'Profile Boost is a Premium Feature',
        'Rocket your profile to the top of discovery feeds in your area for 30 minutes! Upgrade to Connectly Premium or VIP to unlock monthly boosts.'
      );
      return;
    }

    setIsActivating(true);
    await activateBoost();
    setIsActivating(false);
  };

  const monthlyBoostsAllowed = entitlements?.limits?.monthlyBoosts || 0;
  const monthlyBoostsUsed = entitlements?.usage?.monthlyBoostsUsed || 0;
  const boostsRemaining = Math.max(0, monthlyBoostsAllowed - monthlyBoostsUsed);

  if (isActive) {
    return (
      <div className={`boost-widget ${className}`.trim()}>
        <button
          className="boost-btn is-active"
          disabled
          title="Your profile is currently boosted in discovery ranking!"
        >
          <Flame size={compact ? 16 : 18} />
          <span>Boost Active ({formatCountdown(secondsLeft)})</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`boost-widget ${className}`.trim()}>
      <button
        onClick={handleClick}
        disabled={isActivating}
        className={`boost-btn ${className}`.trim()}
        title={
          isBoostAllowed
            ? `Boost profile visibility for 30 mins (${boostsRemaining} left this month)`
            : 'Upgrade to Premium to boost your profile'
        }
      >
        {isBoostAllowed ? (
          <Rocket size={compact ? 16 : 18} />
        ) : (
          <Lock size={compact ? 14 : 16} />
        )}
        <span>
          {isActivating
            ? 'Boosting...'
            : compact
            ? 'Boost'
            : isBoostAllowed
            ? `Boost Profile (${boostsRemaining} left)`
            : 'Boost Profile'}
        </span>
      </button>
    </div>
  );
};

export default BoostButton;
