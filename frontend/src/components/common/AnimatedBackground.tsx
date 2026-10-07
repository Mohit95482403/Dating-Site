import React from 'react';
import './AnimatedBackground.css';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="animated-bg-container" aria-hidden="true">
      <div className="bg-glow orb-1"></div>
      <div className="bg-glow orb-2"></div>
      <div className="bg-glow orb-3"></div>
      <div className="bg-grid-pattern"></div>
      <div className="bg-noise-overlay"></div>
    </div>
  );
};

export default AnimatedBackground;
