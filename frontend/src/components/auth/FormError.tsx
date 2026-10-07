import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorProps {
  message?: string;
  errors?: string[];
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, errors, className = '' }) => {
  if (!message && (!errors || errors.length === 0)) return null;

  return (
    <div className={`form-error-alert ${className}`} role="alert" aria-live="assertive">
      <div className="form-error-header">
        <AlertCircle size={18} className="form-error-icon" />
        <span className="form-error-title">{message || 'Please fix the errors below:'}</span>
      </div>
      {errors && errors.length > 0 && (
        <ul className="form-error-list">
          {errors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FormError;
