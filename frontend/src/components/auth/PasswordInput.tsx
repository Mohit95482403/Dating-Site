import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  className = '',
  error,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        className={`form-input password-field ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
