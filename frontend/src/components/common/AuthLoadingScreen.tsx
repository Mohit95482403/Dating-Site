import React from 'react';
import './AuthLoadingScreen.css';

export interface AuthLoadingScreenProps {
  message?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  message = 'Preparing your experience...',
}) => {
  return (
    <div className="auth-loader-screen" role="status" aria-live="polite">
      <div className="auth-loader-card">
        <div className="auth-loader-logo-wrap">
          <div className="auth-loader-pulse"></div>
          <div className="auth-loader-brand-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <h2 className="auth-loader-title">Connectly</h2>

        <div className="auth-loader-indicator">
          <div className="auth-loader-bar"></div>
        </div>

        <p className="auth-loader-message">{message}</p>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
