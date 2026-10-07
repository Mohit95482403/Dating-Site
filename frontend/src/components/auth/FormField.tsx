import React from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required-mark" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} className="field-error-msg" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={`${id}-helper`} className="field-helper-msg">
          {helperText}
        </span>
      )}
    </div>
  );
};

export default FormField;
