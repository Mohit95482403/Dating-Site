import React from 'react';
import FormField from '../../../components/auth/FormField';
import Button from '../../../components/common/Button';
import type { BasicInfoData } from '../../../types/onboarding';
import { Calendar, ArrowRight } from 'lucide-react';

export interface BasicInfoStepProps {
  data: BasicInfoData;
  onChange: (updated: Partial<BasicInfoData>) => void;
  onNext: () => void;
  isSaving: boolean;
  errors: Record<string, string>;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  onNext,
  isSaving,
  errors,
}) => {
  // Calculate age from dateOfBirth
  const calculatedAge = React.useMemo(() => {
    if (!data.dateOfBirth) return null;
    const dob = new Date(data.dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [data.dateOfBirth]);

  const genderOptions = [
    { value: 'female', label: 'Woman' },
    { value: 'male', label: 'Man' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'other', label: 'Other / Self-describe' },
  ];

  return (
    <div className="onboarding-step-pane">
      <div className="step-header-text">
        <h2>Tell us about yourself</h2>
        <p>Let's start with your basic information to begin building your profile.</p>
      </div>

      <div className="form-grid-2col">
        {/* First Name */}
        <FormField
          id="ob-first-name"
          label="First Name"
          required
          error={errors.firstName}
        >
          <input
            id="ob-first-name"
            type="text"
            className={`form-input ${errors.firstName ? 'input-error' : ''}`}
            placeholder="e.g. Maya"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            autoComplete="given-name"
          />
        </FormField>

        {/* Last Name */}
        <FormField
          id="ob-last-name"
          label="Last Name (Optional)"
          error={errors.lastName}
        >
          <input
            id="ob-last-name"
            type="text"
            className="form-input"
            placeholder="e.g. Lin"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            autoComplete="family-name"
          />
        </FormField>
      </div>

      {/* Date of Birth */}
      <FormField
        id="ob-dob"
        label="Date of Birth"
        required
        error={errors.dateOfBirth}
        helperText="Must be 18 years or older. Your exact birthday will not be shared publicly."
      >
        <div className="dob-input-row">
          <input
            id="ob-dob"
            type="date"
            className={`form-input ${errors.dateOfBirth ? 'input-error' : ''}`}
            value={data.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          />
          {calculatedAge !== null && calculatedAge > 0 && (
            <span className={`age-preview-badge ${calculatedAge < 18 ? 'underage' : 'valid'}`}>
              <Calendar size={13} /> Age: {calculatedAge}
            </span>
          )}
        </div>
      </FormField>

      {/* Gender Selection */}
      <div className="form-group">
        <label className="form-label" id="gender-selection-label">
          Gender Identity <span className="required-mark">*</span>
        </label>
        <div
          className="gender-chips-grid"
          role="radiogroup"
          aria-labelledby="gender-selection-label"
        >
          {genderOptions.map((opt) => {
            const isSelected = data.gender.toLowerCase() === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`gender-chip-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onChange({ gender: opt.value })}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {errors.gender && (
          <span className="field-error-msg" role="alert">
            {errors.gender}
          </span>
        )}
      </div>

      {/* Step Actions */}
      <div className="onboarding-step-actions single-next">
        <div></div>
        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={onNext}
          disabled={isSaving}
        >
          Continue to About You <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default BasicInfoStep;
