import React, { useState } from 'react';
import type { ProfilePhoto } from '../../types/profile';
import { profileService } from '../../services/profile.service';
import { useToast } from '../../context/ToastContext';
import { normalizeApiError } from '../../utils/apiError';
import PhotoUploader from './PhotoUploader';
import PhotoGrid from './PhotoGrid';
import { Camera, Sparkles } from 'lucide-react';
import './PhotoManager.css';

interface PhotoManagerProps {
  photos: ProfilePhoto[];
  onPhotosUpdated: (updatedPhotos: ProfilePhoto[], completion?: { completionPercentage: number; isComplete: boolean }) => void;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  photos,
  onPhotosUpdated,
}) => {
  const toast = useToast();

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Upload handler
  const handleUploadPhotos = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await profileService.uploadPhotos(files, (percent) => {
        setUploadProgress(percent);
      });

      toast.success(
        files.length === 1
          ? 'Photo uploaded successfully!'
          : `${files.length} photos uploaded successfully!`
      );

      onPhotosUpdated(result.photos, {
        completionPercentage: result.completionPercentage,
        isComplete: result.isComplete,
      });
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      toast.error(normalized.message || 'Failed to upload photos. Please try again.');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Set primary handler
  const handleSetPrimary = async (photoId: number) => {
    setIsProcessing(true);
    try {
      const result = await profileService.setPrimaryPhoto(photoId);
      toast.success('Primary photo updated!');
      onPhotosUpdated(result.photos);
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      toast.error(normalized.message || 'Failed to update primary photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete handler
  const handleDeletePhoto = async (photoId: number) => {
    setIsProcessing(true);
    try {
      const result = await profileService.deleteProfilePhoto(photoId);
      toast.success('Photo removed from your profile.');
      onPhotosUpdated(result.photos, {
        completionPercentage: result.completionPercentage || 0,
        isComplete: result.isComplete || false,
      });
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      toast.error(normalized.message || 'Failed to delete photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reorder handler
  const handleReorderPhotos = async (photoIds: number[]) => {
    setIsProcessing(true);
    try {
      const result = await profileService.reorderPhotos(photoIds);
      toast.success('Photo order updated!');
      onPhotosUpdated(result.photos);
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      toast.error(normalized.message || 'Failed to save photo order.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="profile-section-card photo-manager-card">
      <div className="photo-manager-header">
        <div className="photo-manager-title-wrap">
          <div className="section-icon-box">
            <Camera size={18} className="section-icon" />
          </div>
          <div>
            <h2 className="section-title">Manage Photos</h2>
            <p className="photo-manager-subtitle">
              Add up to 6 photos. The first photo is your main discovery image.
            </p>
          </div>
        </div>

        <div className="photo-count-pill">
          <Sparkles size={14} className="count-sparkle" />
          <span>{photos.length} / 6 Photos</span>
        </div>
      </div>

      <div className="photo-manager-content">
        {/* Upload Zone & Pending Queue */}
        <PhotoUploader
          currentPhotoCount={photos.length}
          maxPhotos={6}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUpload={handleUploadPhotos}
        />

        {/* Uploaded Photos Grid */}
        <PhotoGrid
          photos={photos}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeletePhoto}
          onReorder={handleReorderPhotos}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default PhotoManager;
