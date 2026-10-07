import React from 'react';
import FormField from '../../../components/auth/FormField';
import Button from '../../../components/common/Button';
import type { AboutYouData } from '../../../types/onboarding';
import { ArrowLeft, ArrowRight, MapPin, Briefcase, GraduationCap } from 'lucide-react';

export interface AboutYouStepProps {
  data: AboutYouData;
  onChange: (updated: Partial<AboutYouData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  errors: Record<string, string>;
}

export const AboutYouStep: React.FC<AboutYouStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  isSaving,
  errors,
}) => {
  const bioCharCount = data.bio?.length || 0;

  const educationPresets = [
    { value: "Bachelor's Degree", label: "Bachelor's Degree" },
    { value: "Master's Degree", label: "Master's Degree" },
    { value: 'Doctorate / PhD', label: 'Doctorate / PhD' },
    { value: 'Associate Degree / Diploma', label: 'Associate Degree / Diploma' },
    { value: 'Trade / Vocational School', label: 'Trade / Vocational School' },
    { value: 'High School', label: 'High School' },
    { value: 'Other / In Progress', label: 'Other / In Progress' },
  ];

  return (
    <div className="onboarding-step-pane">
      <div className="step-header-text">
        <h2>About You</h2>
        <p>Introduce yourself to potential matches with your bio, career, and location.</p>
      </div>

      {/* Bio */}
      <FormField
        id="ob-bio"
        label="Your Bio"
        required
        error={errors.bio}
        helperText="Write at least 10 characters describing your passions, humor, or vibe."
      >
        <div className="textarea-wrapper">
          <textarea
            id="ob-bio"
            rows={4}
            maxLength={500}
            className={`form-textarea ${errors.bio ? 'input-error' : ''}`}
            placeholder="Tell people a little about yourself, your favorite weekend activities, or what brings you joy..."
            value={data.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
          />
          <div className="textarea-counter">
            <span className={bioCharCount < 10 ? 'counter-short' : 'counter-ok'}>
              {bioCharCount} / 500
            </span>
          </div>
        </div>
      </FormField>

      <div className="form-grid-2col">
        {/* Occupation */}
        <FormField
          id="ob-occupation"
          label="Occupation / Work"
          error={errors.occupation}
          helperText="e.g. UX Designer, Founder, Student"
        >
          <div className="input-with-icon">
            <Briefcase size={16} className="input-icon" />
            <input
              id="ob-occupation"
              type="text"
              className="form-input with-icon"
              placeholder="What do you do?"
              value={data.occupation}
              onChange={(e) => onChange({ occupation: e.target.value })}
            />
          </div>
        </FormField>

        {/* Education */}
        <FormField
          id="ob-education"
          label="Education Level"
          error={errors.education}
        >
          <div className="input-with-icon">
            <GraduationCap size={16} className="input-icon" />
            <select
              id="ob-education"
              className="form-select with-icon"
              value={data.education}
              onChange={(e) => onChange({ education: e.target.value })}
            >
              <option value="">Select your education...</option>
              {educationPresets.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </FormField>
      </div>

      {/* Location */}
      <div className="location-section-box">
        <div className="location-section-header">
          <MapPin size={16} className="loc-icon" />
          <span>Your Location</span>
        </div>
        <p className="loc-note">
          Used to calculate distance matches. Connectly respects your privacy and will never broadcast your exact address.
        </p>

        <div className="form-grid-3col">
          <FormField
            id="ob-city"
            label="City"
            required
            error={errors.city}
          >
            <input
              id="ob-city"
              type="text"
              className={`form-input ${errors.city ? 'input-error' : ''}`}
              placeholder="e.g. San Francisco"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </FormField>

          <FormField
            id="ob-state"
            label="State / Region"
            error={errors.state}
          >
            <input
              id="ob-state"
              type="text"
              className="form-input"
              placeholder="e.g. CA"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
            />
          </FormField>

          <FormField
            id="ob-country"
            label="Country"
            required
            error={errors.country}
          >
            <input
              id="ob-country"
              type="text"
              className={`form-input ${errors.country ? 'input-error' : ''}`}
              placeholder="e.g. USA"
              value={data.country}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      {/* Actions */}
      <div className="onboarding-step-actions">
        <Button
          variant="ghost"
          size="lg"
          type="button"
          onClick={onBack}
          disabled={isSaving}
        >
          <ArrowLeft size={18} /> Back
        </Button>

        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={onNext}
          disabled={isSaving}
        >
          Continue to Interests <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default AboutYouStep;
