import React from 'react';

interface SettingsToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
}) => {
  return (
    <div className={`settings-toggle-row ${disabled ? 'is-disabled' : ''}`}>
      {(label || description) && (
        <div className="settings-toggle-text">
          {label && <label htmlFor={id} className="settings-toggle-label">{label}</label>}
          {description && <p className="settings-toggle-desc">{description}</p>}
        </div>
      )}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`settings-toggle-switch ${checked ? 'active' : ''}`}
        aria-label={label || 'Toggle switch'}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  );
};

export default SettingsToggle;
