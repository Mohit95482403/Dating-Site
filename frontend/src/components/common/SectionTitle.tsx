import React from 'react';
import './SectionTitle.css';

interface SectionTitleProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  badge,
  title,
  subtitle,
  align = 'center',
  className = '',
}) => {
  return (
    <div className={`section-title-wrap text-${align} ${className}`}>
      {badge && (
        <div className="section-badge">
          <span className="badge-dot"></span>
          <span>{badge}</span>
        </div>
      )}
      <h2 className="section-title-heading">{title}</h2>
      {subtitle && <p className="section-title-sub">{subtitle}</p>}
    </div>
  );
};

export default SectionTitle;
