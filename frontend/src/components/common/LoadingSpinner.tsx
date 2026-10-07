import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  return (
    <div className={`spinner-wrapper ${className}`}>
      <div className={`spinner-ring spinner-${size}`}></div>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
