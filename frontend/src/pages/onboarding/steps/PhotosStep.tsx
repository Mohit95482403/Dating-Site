import React, { useRef, useState } from 'react';
import Button from '../../../components/common/Button';
import { onboardingService } from '../../../services/onboarding.service';
import type { PhotoItem } from '../../../types/onboarding';
import { getMediaUrl } from '../../../utils/media';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2, 
  Star, 
  Loader2
} from 'lucide-react';

export interface PhotosStepProps {
  photos: PhotoItem[];
  onPhotosChange: (updatedPhotos: PhotoItem[]) => void;
  onComplete: () => void;
  onBack: () => void;
  isSaving: boolean;
  isCompleting: boolean;
  errors: Record<string, string>;
}

export const PhotosStep: React.FC<PhotosStepProps> = ({
  photos,
  onPhotosChange,
  onComplete,
  onBack,
  isSaving,
  isCompleting,
  errors,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit.');
      return;
    }

    // Validate format
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // 1. Upload file to server
      const uploadRes = await onboardingService.uploadPhoto(file);

      // 2. Add photo record to database
      const updatedStatus = await onboardingService.addPhoto({
        fileUrl: uploadRes.path,
        fileName: uploadRes.filename,
        mimeType: file.type,
        fileSize: file.size,
        isPrimary: photos.length === 0,
      });

      onPhotosChange(updatedStatus.photos);
    } catch {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  const handleRemovePhoto = async (photoId?: number) => {
    if (!photoId) return;
    try {
      const updatedStatus = await onboardingService.removePhoto(photoId);
      onPhotosChange(updatedStatus.photos);
    } catch {
      setUploadError('Failed to remove photo.');
    }
  };

  const hasPhotos = photos.length > 0;

  return (
    <div className="onboarding-step-pane">
      <div className="step-header-text">
        <h2>Add Your Profile Photos</h2>
        <p>Profiles with photos receive 8x more mutual connections. Add at least 1 photo to complete your profile.</p>
      </div>

      {uploadError && (
        <div className="field-error-msg photo-error-alert" role="alert">
          {uploadError}
        </div>
      )}
      {errors.photos && (
        <div className="field-error-msg photo-error-alert" role="alert">
          {errors.photos}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Photo Grid */}
      <div className="photos-grid-wrapper">
        {/* Upload Card */}
        <button
          type="button"
          className="photo-upload-card"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="upload-loading-state">
              <Loader2 size={32} className="spin-icon" />
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon-circle">
                <Plus size={24} />
              </div>
              <span className="upload-title">Upload Photo</span>
              <span className="upload-subtitle">JPG, PNG, or WebP (Max 5MB)</span>
            </div>
          )}
        </button>

        {/* Existing Photos */}
        {photos.map((photo, idx) => (
          <div key={photo.id || idx} className="photo-card-item">
            <img src={getMediaUrl(photo.fileUrl)} alt={`Profile photo ${idx + 1}`} className="photo-img" />

            {photo.isPrimary && (
              <span className="primary-photo-badge">
                <Star size={12} fill="currentColor" /> Primary
              </span>
            )}

            <button
              type="button"
              className="remove-photo-btn"
              onClick={() => handleRemovePhoto(photo.id)}
              aria-label="Remove photo"
              title="Remove photo"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>


      {/* Actions */}
      <div className="onboarding-step-actions">
        <Button
          variant="ghost"
          size="lg"
          type="button"
          onClick={onBack}
          disabled={isSaving || isCompleting}
        >
          <ArrowLeft size={18} /> Back
        </Button>

        <Button
          variant="glow"
          size="lg"
          type="button"
          onClick={onComplete}
          disabled={!hasPhotos || isCompleting || isSaving}
          className="complete-profile-btn"
        >
          {isCompleting ? (
            <span className="btn-loading-content">
              <span className="btn-spinner"></span>
              Completing Profile...
            </span>
          ) : (
            <span className="btn-label-icon">
              Complete Profile & Enter Connectly <Sparkles size={18} />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PhotosStep;
