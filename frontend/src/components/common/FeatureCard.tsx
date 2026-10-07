import React from 'react';
import './FeatureCard.css';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  accentColor?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  badge,
  accentColor,
}) => {
  return (
    <div className="feature-card glass-panel">
      <div 
        className="feature-icon-wrapper" 
        style={accentColor ? { color: accentColor, background: `${accentColor}18`, borderColor: `${accentColor}33` } : undefined}
      >
        {icon}
      </div>
      {badge && <span className="feature-badge">{badge}</span>}
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-desc">{description}</p>
    </div>
  );
};

export default FeatureCard;
