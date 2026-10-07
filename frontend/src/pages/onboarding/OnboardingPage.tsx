import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { onboardingService } from '../../services/onboarding.service';
import OnboardingLayout from './OnboardingLayout';
import BasicInfoStep from './steps/BasicInfoStep';
import AboutYouStep from './steps/AboutYouStep';
import InterestsStep from './steps/InterestsStep';
import PreferencesStep from './steps/PreferencesStep';
import PhotosStep from './steps/PhotosStep';
import AuthLoadingScreen from '../../components/common/AuthLoadingScreen';
import type {
  BasicInfoData,
  AboutYouData,
  PreferencesData,
  PhotoItem,
} from '../../types/onboarding';
import './Onboarding.css';

export const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Step metrics
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Form Data States
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'female',
  });

  const [aboutYou, setAboutYou] = useState<AboutYouData>({
    bio: '',
    occupation: '',
    education: '',
    city: '',
    state: '',
    country: '',
  });

  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);

  const [preferences, setPreferences] = useState<PreferencesData>({
    minAge: 18,
    maxAge: 100,
    preferredGender: 'all',
    maxDistanceKm: 50,
    relationshipGoal: 'long_term',
  });

  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounce timers for autosave
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial onboarding status
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const status = await onboardingService.getStatus();

        if (status.isComplete) {
          // If user has already finished onboarding, direct to dashboard
          navigate('/dashboard', { replace: true });
          return;
        }

        if (isMounted) {
          setCurrentStep(status.currentStep || 1);
          setCompletedSteps(status.completedSteps || []);
          setCompletionPercentage(status.completionPercentage || 0);

          if (status.profile) {
            setBasicInfo({
              firstName: status.profile.firstName || user?.firstName || '',
              lastName: status.profile.lastName || user?.lastName || '',
              dateOfBirth: status.profile.dateOfBirth || user?.dateOfBirth || '',
              gender: status.profile.gender || user?.gender || 'female',
            });

            setAboutYou({
              bio: status.profile.bio || '',
              occupation: status.profile.occupation || '',
              education: status.profile.education || '',
              city: status.profile.city || '',
              state: status.profile.state || '',
              country: status.profile.country || '',
            });
          }

          if (status.preferences) {
            setPreferences({
              minAge: status.preferences.minAge ?? 18,
              maxAge: status.preferences.maxAge ?? 100,
              preferredGender: status.preferences.preferredGender || 'all',
              maxDistanceKm: status.preferences.maxDistanceKm ?? 50,
              relationshipGoal: status.preferences.relationshipGoal || 'long_term',
            });
          }

          if (Array.isArray(status.interests)) {
            setSelectedInterests(status.interests);
          }

          if (Array.isArray(status.photos)) {
            setPhotos(status.photos);
          }
        }
      } catch {
        toast.error('Unable to fetch onboarding status.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [navigate, toast, user]);

  /**
   * Controlled Autosave with Debounce (750ms)
   */
  const triggerAutosave = useCallback(
    (step: number, data: any) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

      setAutosaveStatus('idle');

      autosaveTimerRef.current = setTimeout(async () => {
        setAutosaveStatus('saving');
        try {
          let updatedStatus;
          if (step === 1 && data.firstName && data.dateOfBirth) {
            updatedStatus = await onboardingService.saveBasicInfo(data);
          } else if (step === 2 && data.bio && data.city && data.country) {
            updatedStatus = await onboardingService.saveAbout(data);
          } else if (step === 3 && Array.isArray(data) && data.length >= 3) {
            updatedStatus = await onboardingService.saveInterests(data);
          } else if (step === 4 && data.preferredGender) {
            updatedStatus = await onboardingService.savePreferences(data);
          }

          if (updatedStatus) {
            setCompletedSteps(updatedStatus.completedSteps);
            setCompletionPercentage(updatedStatus.completionPercentage);
            setAutosaveStatus('saved');
          } else {
            setAutosaveStatus('idle');
          }
        } catch {
          setAutosaveStatus('error');
        }
      }, 750);
    },
    []
  );

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!basicInfo.firstName || basicInfo.firstName.trim().length < 2) {
      errs.firstName = 'First name must be at least 2 characters.';
    }
    if (!basicInfo.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required.';
    } else {
      const dob = new Date(basicInfo.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        errs.dateOfBirth = 'You must be at least 18 years old to join Connectly.';
      }
    }
    if (!basicInfo.gender) {
      errs.gender = 'Please select your gender identity.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!aboutYou.bio || aboutYou.bio.trim().length < 10) {
      errs.bio = 'Bio must be at least 10 characters long.';
    }
    if (!aboutYou.city || aboutYou.city.trim().length < 2) {
      errs.city = 'City is required.';
    }
    if (!aboutYou.country || aboutYou.country.trim().length < 2) {
      errs.country = 'Country is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (selectedInterests.length < 3) {
      errs.interests = 'Please select at least 3 interests.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation
  const validateStep4 = (): boolean => {
    const errs: Record<string, string> = {};
    if (preferences.minAge > preferences.maxAge) {
      errs.age = 'Minimum age cannot exceed maximum age.';
    }
    if (!preferences.preferredGender) {
      errs.preferredGender = 'Please select preferred gender.';
    }
    if (!preferences.relationshipGoal) {
      errs.relationshipGoal = 'Please select a relationship goal.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 5 Validation
  const validateStep5 = (): boolean => {
    const errs: Record<string, string> = {};
    if (photos.length === 0) {
      errs.photos = 'Please add at least 1 profile photo to finish onboarding.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Next Step Handler
  const handleNext = async () => {
    setErrors({});
    setIsSaving(true);

    try {
      if (currentStep === 1) {
        if (!validateStep1()) return;
        const res = await onboardingService.saveBasicInfo(basicInfo);
        setCompletedSteps(res.completedSteps);
        setCompletionPercentage(res.completionPercentage);
        setCurrentStep(2);
      } else if (currentStep === 2) {
        if (!validateStep2()) return;
        const res = await onboardingService.saveAbout(aboutYou);
        setCompletedSteps(res.completedSteps);
        setCompletionPercentage(res.completionPercentage);
        setCurrentStep(3);
      } else if (currentStep === 3) {
        if (!validateStep3()) return;
        const res = await onboardingService.saveInterests(selectedInterests);
        setCompletedSteps(res.completedSteps);
        setCompletionPercentage(res.completionPercentage);
        setCurrentStep(4);
      } else if (currentStep === 4) {
        if (!validateStep4()) return;
        const res = await onboardingService.savePreferences(preferences);
        setCompletedSteps(res.completedSteps);
        setCompletionPercentage(res.completionPercentage);
        setCurrentStep(5);
      }
    } catch {
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Back Step Handler
  const handleBack = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Complete Onboarding
  const handleComplete = async () => {
    if (!validateStep5()) return;

    setIsCompleting(true);
    try {
      await onboardingService.completeOnboarding();
      await refreshUser();
      toast.success('Your Connectly profile is complete! Welcome aboard.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Unable to complete profile. Check missing sections.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return <AuthLoadingScreen message="Preparing your onboarding experience..." />;
  }

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      completionPercentage={completionPercentage}
      autosaveStatus={autosaveStatus}
      onStepClick={(step) => {
        setErrors({});
        setCurrentStep(step);
      }}
    >
      {currentStep === 1 && (
        <BasicInfoStep
          data={basicInfo}
          onChange={(upd) => {
            const next = { ...basicInfo, ...upd };
            setBasicInfo(next);
            triggerAutosave(1, next);
          }}
          onNext={handleNext}
          isSaving={isSaving}
          errors={errors}
        />
      )}

      {currentStep === 2 && (
        <AboutYouStep
          data={aboutYou}
          onChange={(upd) => {
            const next = { ...aboutYou, ...upd };
            setAboutYou(next);
            triggerAutosave(2, next);
          }}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
          errors={errors}
        />
      )}

      {currentStep === 3 && (
        <InterestsStep
          selectedInterestIds={selectedInterests}
          onChange={(ids) => {
            setSelectedInterests(ids);
            triggerAutosave(3, ids);
          }}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
          errors={errors}
        />
      )}

      {currentStep === 4 && (
        <PreferencesStep
          data={preferences}
          onChange={(upd) => {
            const next = { ...preferences, ...upd };
            setPreferences(next);
            triggerAutosave(4, next);
          }}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
          errors={errors}
        />
      )}

      {currentStep === 5 && (
        <PhotosStep
          photos={photos}
          onPhotosChange={(updated) => {
            setPhotos(updated);
            if (updated.length > 0) {
              setCompletedSteps((prev) => Array.from(new Set([...prev, 'photos'])));
              setCompletionPercentage(100);
            }
          }}
          onComplete={handleComplete}
          onBack={handleBack}
          isSaving={isSaving}
          isCompleting={isCompleting}
          errors={errors}
        />
      )}
    </OnboardingLayout>
  );
};

export default OnboardingPage;
