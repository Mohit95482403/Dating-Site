import api from './api';
import type { AuthResponse } from '../types/auth';
import type {
  Interest,
  BasicInfoData,
  AboutYouData,
  PreferencesData,
  OnboardingStatusResponse,
  OnboardingCompletionResult,
} from '../types/onboarding';

export const onboardingService = {
  /**
   * Fetch all predefined interests from database
   * GET /api/interests
   */
  async getInterests(): Promise<Interest[]> {
    const response = await api.get<AuthResponse<{ interests: Interest[] }>>('/interests');
    return response.data.data?.interests || [];
  },

  /**
   * Fetch current user's onboarding status and prefilled step data
   * GET /api/onboarding/status
   */
  async getStatus(): Promise<OnboardingStatusResponse> {
    const response = await api.get<AuthResponse<OnboardingStatusResponse>>('/onboarding/status');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to load onboarding status');
    }
    return response.data.data;
  },

  /**
   * Save Step 1: Basic Information
   * PUT /api/onboarding/basic-info
   */
  async saveBasicInfo(data: BasicInfoData): Promise<OnboardingStatusResponse> {
    const response = await api.put<AuthResponse<OnboardingStatusResponse>>(
      '/onboarding/basic-info',
      data
    );
    return response.data.data!;
  },

  /**
   * Save Step 2: About You
   * PUT /api/onboarding/about
   */
  async saveAbout(data: AboutYouData): Promise<OnboardingStatusResponse> {
    const response = await api.put<AuthResponse<OnboardingStatusResponse>>(
      '/onboarding/about',
      data
    );
    return response.data.data!;
  },

  /**
   * Save Step 3: Selected Interests
   * PUT /api/onboarding/interests
   */
  async saveInterests(interestIds: number[]): Promise<OnboardingStatusResponse> {
    const response = await api.put<AuthResponse<OnboardingStatusResponse>>(
      '/onboarding/interests',
      { interestIds }
    );
    return response.data.data!;
  },

  /**
   * Save Step 4: Dating Preferences
   * PUT /api/onboarding/preferences
   */
  async savePreferences(data: PreferencesData): Promise<OnboardingStatusResponse> {
    const response = await api.put<AuthResponse<OnboardingStatusResponse>>(
      '/onboarding/preferences',
      data
    );
    return response.data.data!;
  },

  /**
   * Upload an image file via Multer
   * POST /api/upload
   */
  async uploadPhoto(file: File): Promise<{ filename: string; path: string }> {
    const formData = new FormData();
    formData.append('media', file);

    const response = await api.post<AuthResponse<{ filename: string; path: string }>>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.data) {
      throw new Error(response.data.message || 'Image upload failed');
    }

    return response.data.data;
  },

  /**
   * Save Step 5: Add a Photo
   * POST /api/onboarding/photos
   */
  async addPhoto(photo: {
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    isPrimary?: boolean;
  }): Promise<OnboardingStatusResponse> {
    const response = await api.post<AuthResponse<OnboardingStatusResponse>>(
      '/onboarding/photos',
      photo
    );
    return response.data.data!;
  },

  /**
   * Remove a photo
   * DELETE /api/onboarding/photos/:photoId
   */
  async removePhoto(photoId: number): Promise<OnboardingStatusResponse> {
    const response = await api.delete<AuthResponse<OnboardingStatusResponse>>(
      `/onboarding/photos/${photoId}`
    );
    return response.data.data!;
  },

  /**
   * Finalize Onboarding & Mark Profile as Complete
   * POST /api/onboarding/complete
   */
  async completeOnboarding(): Promise<OnboardingCompletionResult> {
    const response = await api.post<AuthResponse<OnboardingCompletionResult>>(
      '/onboarding/complete'
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to complete profile onboarding');
    }
    return response.data.data;
  },
};

export default onboardingService;
