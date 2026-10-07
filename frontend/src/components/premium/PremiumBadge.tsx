import React from 'react';
import { Sparkles, Crown } from 'lucide-react';
import './Premium.css';

interface PremiumBadgeProps {
  badge?: 'PRO' | 'VIP' | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  badge = 'PRO',
  size = 'md',
  className = '',
}) => {
  if (!badge) return null;

  const isVip = badge === 'VIP';
  const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '';

  return (
    <span
      className={`premium-badge ${isVip ? 'badge-vip' : 'badge-pro'} ${sizeClass} ${className}`.trim()}
      title={`${badge} Member`}
    >
      {isVip ? <Crown size={size === 'sm' ? 10 : 13} /> : <Sparkles size={size === 'sm' ? 10 : 13} />}
      <span>{badge}</span>
    </span>
  );
};

export default PremiumBadge;
