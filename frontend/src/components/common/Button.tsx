import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glow' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="btn-icon left">{icon}</span>}
      <span className="btn-text">{children}</span>
      {icon && iconPosition === 'right' && <span className="btn-icon right">{icon}</span>}
    </button>
  );
};

export default Button;
