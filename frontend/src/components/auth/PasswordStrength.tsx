import React from 'react';

export interface PasswordStrengthProps {
  password?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Weak';
  let color = '#f43f5e';
  let percentage = 25;

  if (score <= 1) {
    label = 'Weak';
    color = '#f43f5e';
    percentage = 20;
  } else if (score === 2) {
    label = 'Fair';
    color = '#f97316';
    percentage = 45;
  } else if (score === 3 || score === 4) {
    label = 'Good';
    color = '#eab308';
    percentage = 75;
  } else if (score >= 5) {
    label = 'Strong';
    color = '#10b981';
    percentage = 100;
  }

  return (
    <div className="password-strength-container" aria-live="polite">
      <div className="strength-header">
        <span className="strength-label">Password Strength:</span>
        <span className="strength-text" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="strength-bar-track">
        <div
          className="strength-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

export default PasswordStrength;
