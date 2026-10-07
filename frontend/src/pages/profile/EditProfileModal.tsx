import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Profile,
  ProfileInterest,
  UpdateProfilePayload,
  GenderType,
  PreferredGenderType,
  RelationshipGoalType,
} from '../../types/profile';
import { profileService } from '../../services/profile.service';
import { useToast } from '../../context/ToastContext';
import { normalizeApiError } from '../../utils/apiError';
import { INTEREST_EMOJIS } from './ProfileInterests';
import {
  X,
  User,
  FileText,
  Heart,
  Sliders,
  AlertTriangle,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Button from '../../components/common/Button';
import { BioImprovementModal } from '../../components/ai/BioImprovementModal';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: Profile;
  initialTab?: 'basic' | 'about' | 'interests' | 'preferences';
  onClose: () => void;
  onSuccess: (updatedProfile: Profile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  initialTab = 'basic',
  onClose,
  onSuccess,
}) => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'basic' | 'about' | 'interests' | 'preferences'>(
    initialTab
  );

  // Form State
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: (profile.gender as GenderType) || 'male',
    bio: profile.bio || '',
    occupation: profile.occupation || '',
    education: profile.education || '',
    city: profile.location?.city || '',
    state: profile.location?.state || '',
    country: profile.location?.country || '',
    selectedInterestIds: profile.interests.map((i) => i.id),
    preferredGender: (profile.preferences?.preferredGender as PreferredGenderType) || 'all',
    minAge: profile.preferences?.minAge ?? 18,
    maxAge: profile.preferences?.maxAge ?? 35,
    maxDistanceKm: profile.preferences?.maxDistanceKm ?? 50,
    relationshipGoal: (profile.preferences?.relationshipGoal as RelationshipGoalType) || 'dating',
  });

  // Available Interests from backend
  const [availableInterests, setAvailableInterests] = useState<ProfileInterest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState<boolean>(false);

  // Status & Errors
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Discard Confirmation Dialog State
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Day 20 AI Bio Enhancer State
  const [isBioImproverOpen, setIsBioImproverOpen] = useState(false);

  // Populate form on open
  useEffect(() => {
    if (isOpen) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: (profile.gender as GenderType) || 'male',
        bio: profile.bio || '',
        occupation: profile.occupation || '',
        education: profile.education || '',
        city: profile.location?.city || '',
        state: profile.location?.state || '',
        country: profile.location?.country || '',
        selectedInterestIds: profile.interests.map((i) => i.id),
        preferredGender: (profile.preferences?.preferredGender as PreferredGenderType) || 'all',
        minAge: profile.preferences?.minAge ?? 18,
        maxAge: profile.preferences?.maxAge ?? 35,
        maxDistanceKm: profile.preferences?.maxDistanceKm ?? 50,
        relationshipGoal: (profile.preferences?.relationshipGoal as RelationshipGoalType) || 'dating',
      });
      setActiveTab(initialTab);
      setErrors({});
      setServerError(null);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, profile, initialTab]);

  // Load interests list once if not yet loaded
  useEffect(() => {
    if (isOpen && availableInterests.length === 0) {
      let isMounted = true;
      setLoadingInterests(true);
      profileService
        .getInterests()
        .then((list) => {
          if (isMounted) setAvailableInterests(list);
        })
        .catch(() => {
          // Fallback to currently selected if API fails
          if (isMounted && profile.interests.length > 0) {
            setAvailableInterests(profile.interests);
          }
        })
        .finally(() => {
          if (isMounted) setLoadingInterests(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, availableInterests.length, profile.interests]);

  // Track if form is dirty
  const isDirty = useMemo(() => {
    const origInterests = [...profile.interests.map((i) => i.id)].sort().join(',');
    const currInterests = [...formData.selectedInterestIds].sort().join(',');

    return (
      formData.firstName !== (profile.firstName || '') ||
      formData.lastName !== (profile.lastName || '') ||
      formData.dateOfBirth !== (profile.dateOfBirth || '') ||
      formData.gender !== (profile.gender || 'male') ||
      formData.bio !== (profile.bio || '') ||
      formData.occupation !== (profile.occupation || '') ||
      formData.education !== (profile.education || '') ||
      formData.city !== (profile.location?.city || '') ||
      formData.state !== (profile.location?.state || '') ||
      formData.country !== (profile.location?.country || '') ||
      currInterests !== origInterests ||
      formData.preferredGender !== (profile.preferences?.preferredGender || 'all') ||
      formData.minAge !== (profile.preferences?.minAge ?? 18) ||
      formData.maxAge !== (profile.preferences?.maxAge ?? 35) ||
      formData.maxDistanceKm !== (profile.preferences?.maxDistanceKm ?? 50) ||
      formData.relationshipGoal !== (profile.preferences?.relationshipGoal || 'dating')
    );
  }, [formData, profile]);

  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Handle Escape Key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDiscardConfirm, handleAttemptClose]);

  // Field change helper
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
  };

  // Toggle interest helper
  const toggleInterest = (id: number) => {
    setFormData((prev) => {
      const exists = prev.selectedInterestIds.includes(id);
      let updated: number[];
      if (exists) {
        updated = prev.selectedInterestIds.filter((item) => item !== id);
      } else {
        if (prev.selectedInterestIds.length >= 10) {
          toast.warning('You can select a maximum of 10 interests.');
          return prev;
        }
        updated = [...prev.selectedInterestIds, id];
      }
      return { ...prev, selectedInterestIds: updated };
    });

    if (errors.interests) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.interests;
        return next;
      });
    }
  };

  // Client Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Basic Info
    if (!formData.firstName.trim()) {
      errs.firstName = 'First name is required.';
    } else if (formData.firstName.trim().length < 2) {
      errs.firstName = 'First name must be at least 2 characters.';
    }

    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        errs.dateOfBirth = 'Invalid date of birth.';
      } else {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          errs.dateOfBirth = 'You must be at least 18 years old.';
        } else if (age > 120) {
          errs.dateOfBirth = 'Please enter a realistic date of birth.';
        }
      }
    }

    // 2. About
    if (formData.bio && formData.bio.trim().length > 0 && formData.bio.trim().length < 10) {
      errs.bio = 'Bio must be at least 10 characters long if provided.';
    } else if (formData.bio && formData.bio.length > 1000) {
      errs.bio = 'Bio cannot exceed 1000 characters.';
    }

    // 3. Interests
    if (formData.selectedInterestIds.length > 0 && formData.selectedInterestIds.length < 3) {
      errs.interests = 'Please select at least 3 interests to help match your vibe.';
    }

    // 4. Preferences
    if (formData.minAge > formData.maxAge) {
      errs.ageRange = 'Minimum age cannot be greater than maximum age.';
    }
    if (formData.minAge < 18 || formData.minAge > 100) {
      errs.minAge = 'Minimum age must be between 18 and 100.';
    }
    if (formData.maxAge < 18 || formData.maxAge > 100) {
      errs.maxAge = 'Maximum age must be between 18 and 100.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Auto-switch to first tab containing errors
      if (errors.firstName || errors.dateOfBirth || errors.gender) {
        setActiveTab('basic');
      } else if (errors.bio || errors.city || errors.country) {
        setActiveTab('about');
      } else if (errors.interests) {
        setActiveTab('interests');
      } else if (errors.ageRange || errors.minAge || errors.maxAge) {
        setActiveTab('preferences');
      }
      return;
    }

    setIsSaving(true);
    setServerError(null);

    const payload: UpdateProfilePayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || null,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender,
      bio: formData.bio.trim() || null,
      occupation: formData.occupation.trim() || null,
      education: formData.education.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      country: formData.country.trim() || null,
      interests: formData.selectedInterestIds,
      preferences: {
        minAge: Number(formData.minAge),
        maxAge: Number(formData.maxAge),
        preferredGender: formData.preferredGender,
        maxDistanceKm: Number(formData.maxDistanceKm),
        relationshipGoal: formData.relationshipGoal,
      },
    };

    try {
      const updatedProfile = await profileService.updateProfile(payload);
      toast.success('Profile updated successfully!');
      onSuccess(updatedProfile);
      onClose();
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      setServerError(normalized.message || 'Failed to update profile. Please try again.');

      if (normalized.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...normalized.fieldErrors }));
      } else if (normalized.errors && Array.isArray(normalized.errors)) {
        const fieldMap: Record<string, string> = {};
        normalized.errors.forEach((item: string) => {
          if (item.toLowerCase().includes('name')) fieldMap.firstName = item;
          if (item.toLowerCase().includes('bio')) fieldMap.bio = item;
          if (item.toLowerCase().includes('birth') || item.toLowerCase().includes('age'))
            fieldMap.dateOfBirth = item;
          if (item.toLowerCase().includes('interest')) fieldMap.interests = item;
          if (item.toLowerCase().includes('preference')) fieldMap.ageRange = item;
        });
        setErrors((prev) => ({ ...prev, ...fieldMap }));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="edit-modal-backdrop"
      onClick={handleAttemptClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        className="edit-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="edit-modal-header">
          <div className="header-title-box">
            <h2 id="edit-profile-title" className="edit-modal-title">
              Edit Profile
            </h2>
            <span className="edit-modal-subtitle">
              Update your personal details, passions, and matching preferences
            </span>
          </div>

          <button
            type="button"
            className="edit-modal-close-btn"
            onClick={handleAttemptClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Server Error Banner */}
        {serverError && (
          <div className="edit-server-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="edit-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'basic'}
            className={`edit-tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <User size={16} />
            <span>Basic Info</span>
            {(errors.firstName || errors.dateOfBirth) && <span className="tab-error-dot" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            className={`edit-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <FileText size={16} />
            <span>About You</span>
            {(errors.bio || errors.city || errors.country) && <span className="tab-error-dot" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'interests'}
            className={`edit-tab-btn ${activeTab === 'interests' ? 'active' : ''}`}
            onClick={() => setActiveTab('interests')}
          >
            <Heart size={16} />
            <span>Interests</span>
            {errors.interests && <span className="tab-error-dot" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preferences'}
            className={`edit-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Sliders size={16} />
            <span>Preferences</span>
            {(errors.ageRange || errors.minAge || errors.maxAge) && (
              <span className="tab-error-dot" />
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="edit-modal-form">
          <div className="edit-form-content">
            {/* 1. BASIC INFORMATION TAB */}
            {activeTab === 'basic' && (
              <div className="edit-tab-panel" role="tabpanel">
                <div className="edit-form-grid-2">
                  <div className="edit-field-group">
                    <label htmlFor="edit-first-name" className="edit-field-label">
                      First Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="edit-first-name"
                      type="text"
                      className={`edit-input ${errors.firstName ? 'error' : ''}`}
                      placeholder="e.g. Alex"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      maxLength={50}
                    />
                    {errors.firstName && (
                      <span className="edit-field-error">{errors.firstName}</span>
                    )}
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="edit-last-name" className="edit-field-label">
                      Last Name
                    </label>
                    <input
                      id="edit-last-name"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. Morgan"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="edit-form-grid-2">
                  <div className="edit-field-group">
                    <label htmlFor="edit-dob" className="edit-field-label">
                      Date of Birth <span className="required-star">*</span>
                    </label>
                    <input
                      id="edit-dob"
                      type="date"
                      className={`edit-input ${errors.dateOfBirth ? 'error' : ''}`}
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    />
                    {errors.dateOfBirth && (
                      <span className="edit-field-error">{errors.dateOfBirth}</span>
                    )}
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="edit-gender" className="edit-field-label">
                      Gender Identity <span className="required-star">*</span>
                    </label>
                    <select
                      id="edit-gender"
                      className="edit-select"
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value as GenderType)}
                    >
                      <option value="male">Man</option>
                      <option value="female">Woman</option>
                      <option value="non_binary">Non-Binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ABOUT YOU TAB */}
            {activeTab === 'about' && (
              <div className="edit-tab-panel" role="tabpanel">
                <div className="edit-field-group">
                  <div className="label-with-counter">
                    <label htmlFor="edit-bio" className="edit-field-label">
                      Bio / About Me
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsBioImproverOpen(true)}
                        className="chat-ai-trigger-btn"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem' }}
                        title="Enhance your bio using AI"
                      >
                        <Sparkles size={12} />
                        <span>AI Enhance Bio</span>
                      </button>
                      <span className="character-counter">
                        {formData.bio.length} / 1000
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="edit-bio"
                    className={`edit-textarea ${errors.bio ? 'error' : ''}`}
                    rows={4}
                    placeholder="Tell your story, your quirky passions, and what brings you joy..."
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    maxLength={1000}
                  />
                  {errors.bio && <span className="edit-field-error">{errors.bio}</span>}
                </div>

                <div className="edit-form-grid-2">
                  <div className="edit-field-group">
                    <label htmlFor="edit-occupation" className="edit-field-label">
                      Occupation / Career
                    </label>
                    <input
                      id="edit-occupation"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. Product Designer"
                      value={formData.occupation}
                      onChange={(e) => handleChange('occupation', e.target.value)}
                      maxLength={150}
                    />
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="edit-education" className="edit-field-label">
                      Education
                    </label>
                    <input
                      id="edit-education"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. Master's in Arts"
                      value={formData.education}
                      onChange={(e) => handleChange('education', e.target.value)}
                      maxLength={150}
                    />
                  </div>
                </div>

                <div className="edit-form-grid-3">
                  <div className="edit-field-group">
                    <label htmlFor="edit-city" className="edit-field-label">
                      City
                    </label>
                    <input
                      id="edit-city"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="edit-state" className="edit-field-label">
                      State / Region
                    </label>
                    <input
                      id="edit-state"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="edit-country" className="edit-field-label">
                      Country
                    </label>
                    <input
                      id="edit-country"
                      type="text"
                      className="edit-input"
                      placeholder="e.g. India"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. INTERESTS TAB */}
            {activeTab === 'interests' && (
              <div className="edit-tab-panel" role="tabpanel">
                <div className="interests-selection-header">
                  <div>
                    <h3 className="interests-tab-heading">Select Your Interests</h3>
                    <p className="interests-tab-desc">
                      Pick at least 3 interests that represent what you love doing most.
                    </p>
                  </div>
                  <span
                    className={`interests-counter-pill ${
                      formData.selectedInterestIds.length >= 3 ? 'valid' : 'warning'
                    }`}
                  >
                    {formData.selectedInterestIds.length} / 10 selected
                  </span>
                </div>

                {errors.interests && (
                  <div className="edit-field-error interests-error-banner">
                    {errors.interests}
                  </div>
                )}

                {loadingInterests ? (
                  <div className="interests-loading-box">
                    <Loader2 size={24} className="spin-icon" />
                    <span>Loading interests...</span>
                  </div>
                ) : (
                  <div className="interests-chips-picker">
                    {availableInterests.map((interest) => {
                      const isSelected = formData.selectedInterestIds.includes(interest.id);
                      const emoji = INTEREST_EMOJIS[interest.slug.toLowerCase()] || '✨';
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          className={`interest-picker-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleInterest(interest.id)}
                          aria-pressed={isSelected}
                        >
                          <span className="interest-picker-emoji">{emoji}</span>
                          <span className="interest-picker-name">{interest.name}</span>
                          {isSelected && <Check size={14} className="interest-check-icon" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="edit-tab-panel" role="tabpanel">
                <div className="edit-form-grid-2">
                  <div className="edit-field-group">
                    <label htmlFor="pref-gender" className="edit-field-label">
                      I Am Interested In
                    </label>
                    <select
                      id="pref-gender"
                      className="edit-select"
                      value={formData.preferredGender}
                      onChange={(e) =>
                        handleChange('preferredGender', e.target.value as PreferredGenderType)
                      }
                    >
                      <option value="all">Everyone</option>
                      <option value="female">Women</option>
                      <option value="male">Men</option>
                      <option value="non_binary">Non-Binary</option>
                    </select>
                  </div>

                  <div className="edit-field-group">
                    <label htmlFor="pref-goal" className="edit-field-label">
                      Relationship Goal
                    </label>
                    <select
                      id="pref-goal"
                      className="edit-select"
                      value={formData.relationshipGoal}
                      onChange={(e) =>
                        handleChange('relationshipGoal', e.target.value as RelationshipGoalType)
                      }
                    >
                      <option value="dating">Dating & Romance</option>
                      <option value="long_term">Long-term Relationship</option>
                      <option value="friendship">New Friends</option>
                      <option value="casual">Casual Dating</option>
                      <option value="marriage">Marriage / Life Partner</option>
                      <option value="not_sure">Still Figuring It Out</option>
                    </select>
                  </div>
                </div>

                <div className="edit-field-group">
                  <div className="label-with-counter">
                    <label className="edit-field-label">Age Preference Range</label>
                    <span className="range-preview-text">
                      {formData.minAge} – {formData.maxAge} years
                    </span>
                  </div>

                  <div className="age-inputs-row">
                    <div className="age-input-box">
                      <span className="age-sublabel">Min Age:</span>
                      <input
                        type="number"
                        className="edit-input age-num-input"
                        min={18}
                        max={100}
                        value={formData.minAge}
                        onChange={(e) => handleChange('minAge', parseInt(e.target.value, 10) || 18)}
                      />
                    </div>
                    <span className="age-separator">to</span>
                    <div className="age-input-box">
                      <span className="age-sublabel">Max Age:</span>
                      <input
                        type="number"
                        className="edit-input age-num-input"
                        min={18}
                        max={100}
                        value={formData.maxAge}
                        onChange={(e) => handleChange('maxAge', parseInt(e.target.value, 10) || 100)}
                      />
                    </div>
                  </div>
                  {errors.ageRange && (
                    <span className="edit-field-error">{errors.ageRange}</span>
                  )}
                </div>

                <div className="edit-field-group">
                  <div className="label-with-counter">
                    <label htmlFor="pref-dist" className="edit-field-label">
                      Maximum Distance Radius
                    </label>
                    <span className="range-preview-text">
                      Within {formData.maxDistanceKm} km
                    </span>
                  </div>
                  <input
                    id="pref-dist"
                    type="range"
                    className="edit-range-slider"
                    min={5}
                    max={200}
                    step={5}
                    value={formData.maxDistanceKm}
                    onChange={(e) =>
                      handleChange('maxDistanceKm', parseInt(e.target.value, 10) || 50)
                    }
                  />
                  <div className="slider-ticks">
                    <span>5 km</span>
                    <span>100 km</span>
                    <span>200 km</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="edit-modal-footer">
            <Button
              type="button"
              variant="outline"
              onClick={handleAttemptClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="save-changes-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>

        {/* Unsaved Changes Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="discard-dialog-backdrop">
            <div className="discard-dialog-box" role="alertdialog">
              <div className="discard-icon-box">
                <AlertTriangle size={24} className="discard-icon" />
              </div>
              <h3 className="discard-title">Discard unsaved changes?</h3>
              <p className="discard-desc">
                You have modified your profile details. If you exit now, your changes will be lost.
              </p>
              <div className="discard-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="discard-confirm-btn"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Day 20 AI Bio Improvement Modal */}
        <BioImprovementModal
          isOpen={isBioImproverOpen}
          currentBio={formData.bio}
          onClose={() => setIsBioImproverOpen(false)}
          onApply={(suggestedBio) => handleChange('bio', suggestedBio)}
        />
      </div>
    </div>
  );
};

export default EditProfileModal;
