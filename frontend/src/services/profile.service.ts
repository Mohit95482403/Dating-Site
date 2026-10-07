import api from './api';
import type { ApiResponse } from '../types';
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  ProfileResponse,
  UpdateProfilePayload,
  PhotoOperationResult,
  PhotoUploadResponse,
  ProfilePrompt,
  UserProfilePrompt,
  ProfileCompletionResult,
  PublicUserProfile,
  VerificationStatusResponse,
} from '../types/profile';

/**
 * Connectly Profile API Client Service
 */
export const profileService = {
  /**
   * GET /api/profile
   * Fetch complete profile of currently authenticated user
   */
  getProfile: async (): Promise<Profile> => {
    const response = await api.get<ApiResponse<ProfileResponse>>('/profile');
    if (!response.data.data?.profile) {
      throw new Error('Failed to retrieve profile data');
    }
    return response.data.data.profile;
  },

  /**
   * GET /api/profile/:userId
   * Fetch public sanitized profile of another user
   */
  getPublicProfile: async (userId: number): Promise<PublicUserProfile> => {
    const response = await api.get<ApiResponse<{ profile: PublicUserProfile }>>(`/profile/${userId}`);
    if (!response.data.data?.profile) {
      throw new Error('Failed to retrieve user profile');
    }
    return response.data.data.profile;
  },

  /**
   * GET /api/profile/completion
   * Fetch profile completion breakdown
   */
  getCompletion: async (): Promise<ProfileCompletionResult> => {
    const response = await api.get<ApiResponse<ProfileCompletionResult>>('/profile/completion');
    if (!response.data.data) {
      throw new Error('Failed to retrieve profile completion');
    }
    return response.data.data;
  },

  /**
   * GET /api/interests
   * Fetch all available interests from database
   */
  getInterests: async (): Promise<ProfileInterest[]> => {
    const response = await api.get<ApiResponse<{ interests: ProfileInterest[] }>>('/interests');
    return response.data.data?.interests || [];
  },

  /**
   * PUT /api/profile
   * Update profile fields, dating preferences, or selected interests
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<Profile> => {
    const response = await api.put<ApiResponse<ProfileResponse>>('/profile', payload);
    if (!response.data.data?.profile) {
      throw new Error('Failed to update profile');
    }
    return response.data.data.profile;
  },

  /**
   * POST /api/profile/photos
   * Upload multiple photos using FormData with real-time upload progress tracking
   */
  uploadPhotos: async (
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<PhotoUploadResponse> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('photos', file);
    }

    const response = await api.post<ApiResponse<PhotoUploadResponse>>(
      '/profile/photos',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to upload photos.');
    }
    return response.data.data;
  },

  /**
   * POST /api/profile/photos
   * Upload or add a single photo using File or remote URL
   */
  uploadProfilePhoto: async (
    fileOrData: File | { fileUrl: string; fileName?: string; isPrimary?: boolean }
  ): Promise<PhotoOperationResult> => {
    if (fileOrData instanceof File) {
      const formData = new FormData();
      formData.append('photo', fileOrData);
      const response = await api.post<ApiResponse<PhotoOperationResult>>(
        '/profile/photos',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data!;
    } else {
      const response = await api.post<ApiResponse<PhotoOperationResult>>(
        '/profile/photos',
        fileOrData
      );
      return response.data.data!;
    }
  },

  /**
   * DELETE /api/profile/photos/:id
   * Delete a photo with ownership check
   */
  deleteProfilePhoto: async (photoId: number): Promise<PhotoOperationResult> => {
    const response = await api.delete<ApiResponse<PhotoOperationResult>>(
      `/profile/photos/${photoId}`
    );
    return response.data.data!;
  },

  /**
   * PUT /api/profile/photos/:id/primary
   * Set selected photo as primary
   */
  setPrimaryPhoto: async (
    photoId: number
  ): Promise<{ primaryPhotoId: number; photos: ProfilePhoto[] }> => {
    const response = await api.put<ApiResponse<{ primaryPhotoId: number; photos: ProfilePhoto[] }>>(
      `/profile/photos/${photoId}/primary`
    );
    return response.data.data!;
  },

  /**
   * PUT /api/profile/photos/reorder
   * Reorder user's photos display order
   */
  reorderPhotos: async (photoIds: number[]): Promise<{ photos: ProfilePhoto[] }> => {
    const response = await api.put<ApiResponse<{ photos: ProfilePhoto[] }>>(
      '/profile/photos/reorder',
      { photoIds }
    );
    return response.data.data!;
  },

  /**
   * GET /api/profile/prompts
   * List available predefined prompts
   */
  getPrompts: async (): Promise<ProfilePrompt[]> => {
    const response = await api.get<ApiResponse<{ prompts: ProfilePrompt[] }>>('/profile/prompts');
    return response.data.data?.prompts || [];
  },

  /**
   * GET /api/profile/user-prompts
   * List answered prompts
   */
  getUserPrompts: async (): Promise<UserProfilePrompt[]> => {
    const response = await api.get<ApiResponse<{ prompts: UserProfilePrompt[] }>>('/profile/user-prompts');
    return response.data.data?.prompts || [];
  },

  /**
   * POST /api/profile/user-prompts
   * Save an answered prompt
   */
  saveUserPrompt: async (promptId: number, answer: string): Promise<UserProfilePrompt[]> => {
    const response = await api.post<ApiResponse<{ prompts: UserProfilePrompt[] }>>(
      '/profile/user-prompts',
      { promptId, answer }
    );
    return response.data.data?.prompts || [];
  },

  /**
   * DELETE /api/profile/user-prompts/:promptId
   * Delete an answered prompt
   */
  deleteUserPrompt: async (promptId: number): Promise<UserProfilePrompt[]> => {
    const response = await api.delete<ApiResponse<{ prompts: UserProfilePrompt[] }>>(
      `/profile/user-prompts/${promptId}`
    );
    return response.data.data?.prompts || [];
  },

  /**
   * GET /api/profile/verification
   * Get current verification status
   */
  getVerification: async (): Promise<VerificationStatusResponse> => {
    const response = await api.get<ApiResponse<VerificationStatusResponse>>('/profile/verification');
    if (!response.data.data) {
      throw new Error('Failed to retrieve verification status');
    }
    return response.data.data;
  },

  /**
   * POST /api/profile/verification
   * Upload verification document
   */
  submitVerification: async (file: File): Promise<VerificationStatusResponse> => {
    const formData = new FormData();
    formData.append('verificationDoc', file);
    formData.append('document', file);

    const response = await api.post<ApiResponse<VerificationStatusResponse>>(
      '/profile/verification',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to submit verification');
    }
    return response.data.data;
  },

  /**
   * POST /api/reports/profile
   * Report a user profile
   */
  reportProfile: async (
    targetUserId: number,
    reason: string,
    description?: string
  ): Promise<{ reportId: number }> => {
    const response = await api.post<ApiResponse<{ reportId: number }>>('/reports/profile', {
      reportedUserId: targetUserId,
      reason,
      description,
    });
    return response.data.data || { reportId: 0 };
  },
};

export default profileService;
