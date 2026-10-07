import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import FormField from '../components/auth/FormField';
import PasswordInput from '../components/auth/PasswordInput';
import PasswordStrength from '../components/auth/PasswordStrength';
import FormError from '../components/auth/FormError';
import AuthStepIndicator from '../components/auth/AuthStepIndicator';
import type { StepItem } from '../components/auth/AuthStepIndicator';
import type { GenderType, ApiError } from '../types/auth';
import { 
  User, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Edit2
} from 'lucide-react';

import './AuthPages.css';

const STEPS: StepItem[] = [
  { number: 1, title: 'Account Credentials', shortTitle: 'Account' },
  { number: 2, title: 'Personal Details', shortTitle: 'Details' },
  { number: 3, title: 'Connection Vibe', shortTitle: 'Vibe' },
  { number: 4, title: 'Review & Confirm', shortTitle: 'Review' },
];

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form Fields
  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<GenderType>('female');

  // Step 3: Vibe & Preference Preview (UI preparation)
  const [relationshipGoal, setRelationshipGoal] = useState('long_term');
  const [primaryInterest, setPrimaryInterest] = useState('Music & Concerts');

  // Clear single field error on input change
  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else {
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(password)) {
        errors.password = 'Password must include at least one uppercase letter.';
      } else if (!/[a-z]/.test(password)) {
        errors.password = 'Password must include at least one lowercase letter.';
      } else if (!/[0-9]/.test(password)) {
        errors.password = 'Password must include at least one number.';
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        errors.password = 'Password must include at least one special character.';
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedFirst = firstName.trim();

    if (!trimmedFirst || trimmedFirst.length < 2) {
      errors.firstName = 'First name is required and must be at least 2 characters.';
    }

    if (lastName && lastName.trim().length > 50) {
      errors.lastName = 'Last name cannot exceed 50 characters.';
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        errors.dateOfBirth = 'Please provide a valid date.';
      } else {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        if (age < 18) {
          errors.dateOfBirth = 'You must be at least 18 years old to join Connectly.';
        } else if (age > 120) {
          errors.dateOfBirth = 'Please enter a realistic date of birth.';
        }
      }
    }

    const validGenders: GenderType[] = ['male', 'female', 'non_binary', 'other'];
    if (!validGenders.includes(gender)) {
      errors.gender = 'Please select a valid gender option.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    setFormError(null);
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setFormError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate all prerequisite steps before submitting
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // Send real Day 4 supported fields
      await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        dateOfBirth,
        gender,
      });

      // Redirect to onboarding
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFormError(apiErr.message || 'Registration failed. Please check your information.');
      if (apiErr.fieldErrors) {
        setFieldErrors(apiErr.fieldErrors);
        // If error belongs to step 1, jump back to step 1
        if (apiErr.fieldErrors.email || apiErr.fieldErrors.password) {
          setCurrentStep(1);
        } else if (apiErr.fieldErrors.firstName || apiErr.fieldErrors.dateOfBirth || apiErr.fieldErrors.gender) {
          setCurrentStep(2);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <Container>
        <div className="auth-card register-card glass-panel">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo-badge">
              <Sparkles size={24} className="sparkle-icon" />
            </div>
            <h2>Create Your Connectly Account</h2>
            <p>Join the next-generation social discovery & dating platform</p>
          </div>

          {/* Multi-step progress indicator */}
          <AuthStepIndicator
            currentStep={currentStep}
            steps={STEPS}
            onStepClick={(step) => {
              if (step < currentStep && !isSubmitting) {
                setCurrentStep(step);
              }
            }}
          />

          {/* Global error alert */}
          {formError && <FormError message={formError} />}

          <form onSubmit={handleSubmitRegistration} className="auth-form" noValidate>
            {/* STEP 1: Account Credentials */}
            {currentStep === 1 && (
              <div className="step-content-pane">
                <h3 className="step-pane-title">
                  <Mail size={18} /> Step 1: Your Account Credentials
                </h3>

                <FormField
                  id="reg-email"
                  label="Email Address"
                  required
                  error={fieldErrors.email}
                  helperText="We'll use this for your secure login and notifications."
                >
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    placeholder="you@example.com"
                    className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </FormField>

                <FormField
                  id="reg-password"
                  label="Password"
                  required
                  error={fieldErrors.password}
                  helperText="Min. 8 characters with uppercase, lowercase, number, and symbol."
                >
                  <PasswordInput
                    id="reg-password"
                    name="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    placeholder="Create a strong password"
                    error={fieldErrors.password}
                    disabled={isSubmitting}
                  />
                </FormField>

                <PasswordStrength password={password} />

                <FormField
                  id="reg-confirm-password"
                  label="Confirm Password"
                  required
                  error={fieldErrors.confirmPassword}
                >
                  <PasswordInput
                    id="reg-confirm-password"
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError('confirmPassword');
                    }}
                    placeholder="Re-enter your password"
                    error={fieldErrors.confirmPassword}
                    disabled={isSubmitting}
                  />
                </FormField>

                <div className="step-actions">
                  <div></div>
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleNext}
                  >
                    Continue to Details <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Personal Details */}
            {currentStep === 2 && (
              <div className="step-content-pane">
                <h3 className="step-pane-title">
                  <User size={18} /> Step 2: Personal Information
                </h3>

                <div className="form-row-2col">
                  <FormField
                    id="reg-first-name"
                    label="First Name"
                    required
                    error={fieldErrors.firstName}
                  >
                    <input
                      id="reg-first-name"
                      type="text"
                      name="given-name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearFieldError('firstName');
                      }}
                      placeholder="e.g. Maya"
                      className={`form-input ${fieldErrors.firstName ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField
                    id="reg-last-name"
                    label="Last Name (Optional)"
                    error={fieldErrors.lastName}
                  >
                    <input
                      id="reg-last-name"
                      type="text"
                      name="family-name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearFieldError('lastName');
                      }}
                      placeholder="e.g. Lin"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>

                <FormField
                  id="reg-dob"
                  label="Date of Birth"
                  required
                  error={fieldErrors.dateOfBirth}
                  helperText="You must be at least 18 years old to join Connectly."
                >
                  <input
                    id="reg-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      clearFieldError('dateOfBirth');
                    }}
                    className={`form-input ${fieldErrors.dateOfBirth ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </FormField>

                <FormField
                  id="reg-gender"
                  label="Gender Identity"
                  required
                  error={fieldErrors.gender}
                >
                  <select
                    id="reg-gender"
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value as GenderType);
                      clearFieldError('gender');
                    }}
                    className="form-select"
                    disabled={isSubmitting}
                  >
                    <option value="female">Woman</option>
                    <option value="male">Man</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="other">Other / Prefer to self-describe</option>
                  </select>
                </FormField>

                <div className="step-actions">
                  <Button
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleNext}
                  >
                    Continue to Vibe <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Vibe & Preference Preview (Onboarding Preview) */}
            {currentStep === 3 && (
              <div className="step-content-pane">
                <h3 className="step-pane-title">
                  <Sparkles size={18} /> Step 3: Discovery Vibe & Goals
                </h3>

                <p className="step-intro-note">
                  Set up your baseline discovery vibe. You can customize rich photos and bio tags during onboarding in upcoming milestones.
                </p>

                <FormField
                  id="reg-goal"
                  label="What kind of connection are you looking for?"
                  helperText="This helps our recommendation engine curate your initial feed."
                >
                  <select
                    id="reg-goal"
                    value={relationshipGoal}
                    onChange={(e) => setRelationshipGoal(e.target.value)}
                    className="form-select"
                    disabled={isSubmitting}
                  >
                    <option value="long_term">Long-term Relationship & Partnership</option>
                    <option value="short_term">Casual Dating & Fun Hangouts</option>
                    <option value="friendship">New Friends & Shared Activities</option>
                    <option value="not_sure">Open to Seeing What Happens</option>
                  </select>
                </FormField>

                <FormField
                  id="reg-interest"
                  label="Primary Passion / Interest"
                  helperText="Select a primary community vibe you resonate with."
                >
                  <select
                    id="reg-interest"
                    value={primaryInterest}
                    onChange={(e) => setPrimaryInterest(e.target.value)}
                    className="form-select"
                    disabled={isSubmitting}
                  >
                    <option value="Music & Concerts">🎵 Music & Concerts</option>
                    <option value="Travel & Backpacking">✈️ Travel & Adventure</option>
                    <option value="Tech & Gaming">🎮 Tech & Gaming</option>
                    <option value="Fitness & Outdoors">🏃 Fitness & Wellness</option>
                    <option value="Art & Design">🎨 Art, Film & Photography</option>
                    <option value="Coffee & Foodie">☕ Specialty Coffee & Dining</option>
                  </select>
                </FormField>

                <div className="vibe-preview-card">
                  <div className="vibe-badge">Onboarding Snapshot</div>
                  <p>
                    Your profile will be initialized with secure default discovery preferences (18–100 years, all matches, 50km radius) and will be editable at any time.
                  </p>
                </div>

                <div className="step-actions">
                  <Button
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleNext}
                  >
                    Review & Create <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Confirm */}
            {currentStep === 4 && (
              <div className="step-content-pane">
                <h3 className="step-pane-title">
                  <CheckCircle2 size={18} /> Step 4: Review Your Information
                </h3>

                <div className="review-summary-card">
                  <div className="review-row">
                    <span className="review-label">Email:</span>
                    <span className="review-value">{email}</span>
                    <button
                      type="button"
                      className="review-edit-btn"
                      onClick={() => setCurrentStep(1)}
                      title="Edit Account Credentials"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>

                  <div className="review-row">
                    <span className="review-label">Name:</span>
                    <span className="review-value">
                      {firstName} {lastName}
                    </span>
                    <button
                      type="button"
                      className="review-edit-btn"
                      onClick={() => setCurrentStep(2)}
                      title="Edit Personal Information"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>

                  <div className="review-row">
                    <span className="review-label">Date of Birth:</span>
                    <span className="review-value">{dateOfBirth}</span>
                    <button
                      type="button"
                      className="review-edit-btn"
                      onClick={() => setCurrentStep(2)}
                      title="Edit Date of Birth"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>

                  <div className="review-row">
                    <span className="review-label">Gender:</span>
                    <span className="review-value" style={{ textTransform: 'capitalize' }}>
                      {gender.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      className="review-edit-btn"
                      onClick={() => setCurrentStep(2)}
                      title="Edit Gender"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>

                  <div className="review-row">
                    <span className="review-label">Connection Goal:</span>
                    <span className="review-value" style={{ textTransform: 'capitalize' }}>
                      {relationshipGoal.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      className="review-edit-btn"
                      onClick={() => setCurrentStep(3)}
                      title="Edit Goal"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>
                </div>

                <p className="terms-notice">
                  By clicking <strong>Create Account</strong>, you confirm that you are at least 18 years old and agree to Connectly's Community Guidelines and Privacy Policy.
                </p>

                <div className="step-actions">
                  <Button
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft size={16} /> Back
                  </Button>

                  <Button
                    variant="glow"
                    size="lg"
                    type="submit"
                    disabled={isSubmitting}
                    className="submit-create-btn"
                  >
                    {isSubmitting ? (
                      <span className="btn-loading-content">
                        <span className="btn-spinner"></span>
                        Creating Your Account...
                      </span>
                    ) : (
                      <span className="btn-label-icon">
                        Create Account & Join <Sparkles size={18} />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-accent-link">
              Sign In
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default RegisterPage;
