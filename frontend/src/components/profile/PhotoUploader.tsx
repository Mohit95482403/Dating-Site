import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../common/Button';
import PhotoPreview from './PhotoPreview';

interface PhotoUploaderProps {
  currentPhotoCount: number;
  maxPhotos?: number;
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (files: File[]) => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  currentPhotoCount,
  maxPhotos = 6,
  isUploading,
  uploadProgress,
  onUpload,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableSlots = Math.max(0, maxPhotos - currentPhotoCount);

  // Validate and stage files
  const processFiles = (rawFiles: FileList | File[]) => {
    setValidationError(null);
    const filesArray = Array.from(rawFiles);

    if (filesArray.length === 0) return;

    // Check slot limit
    const totalSelected = pendingFiles.length + filesArray.length;
    if (totalSelected > availableSlots) {
      setValidationError(
        `You can only add ${availableSlots} more photo(s). (Max ${maxPhotos} photos total)`
      );
      return;
    }

    const validFiles: File[] = [];

    for (const file of filesArray) {
      // 1. File size check
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`"${file.name}" exceeds the 5 MB file size limit.`);
        return;
      }

      // 2. Format & extension check
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeOk = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
      const extOk = ALLOWED_EXTENSIONS.includes(ext);

      if (!mimeOk && !extOk) {
        setValidationError(
          `"${file.name}" is not a supported image. Only JPG, PNG, and WebP are allowed.`
        );
        return;
      }

      // 3. Avoid duplicate files
      const isDuplicate = pendingFiles.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!isDuplicate) {
        validFiles.push(file);
      }
    }

    setPendingFiles((prev) => [...prev, ...validFiles]);
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (availableSlots <= 0) {
      setValidationError(`Maximum limit of ${maxPhotos} photos reached.`);
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so same file can be picked again if removed
      e.target.value = '';
    }
  };

  const handleRemovePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleClearAll = () => {
    setPendingFiles([]);
    setValidationError(null);
  };

  const handleStartUpload = async () => {
    if (pendingFiles.length === 0 || isUploading) return;
    try {
      await onUpload(pendingFiles);
      setPendingFiles([]);
    } catch {
      // Error handled by parent or toast
    }
  };

  return (
    <div className="photo-uploader-container">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="photo-native-input"
        onChange={handleFileInputChange}
        disabled={isUploading || availableSlots <= 0}
      />

      {/* Drag & Drop Zone */}
      <div
        className={`photo-dropzone ${isDragging ? 'drag-active' : ''} ${
          availableSlots <= 0 ? 'disabled' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (availableSlots > 0 && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="dropzone-icon-box">
          <UploadCloud size={32} className="dropzone-icon" />
        </div>
        <div className="dropzone-text-box">
          <h4 className="dropzone-title">
            {availableSlots > 0
              ? 'Drag & drop photos here, or click to browse'
              : 'Maximum photo limit reached (6 photos)'}
          </h4>
          <p className="dropzone-subtitle">
            JPG, PNG, or WebP • Max 5 MB per photo • Up to {availableSlots} more photo(s)
          </p>
        </div>
        {availableSlots > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="dropzone-choose-btn"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <ImageIcon size={15} />
            <span>Choose Photos</span>
          </Button>
        )}
      </div>

      {/* Client Validation Error Banner */}
      {validationError && (
        <div className="uploader-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Pending Files Queue */}
      {pendingFiles.length > 0 && (
        <div className="pending-queue-section">
          <div className="pending-queue-header">
            <span className="pending-count-label">
              Selected to upload: <strong>{pendingFiles.length} photo(s)</strong>
            </span>
            <button
              type="button"
              className="pending-clear-btn"
              onClick={handleClearAll}
              disabled={isUploading}
            >
              Clear all
            </button>
          </div>

          <div className="pending-previews-grid">
            {pendingFiles.map((file, idx) => (
              <PhotoPreview
                key={`${file.name}-${idx}`}
                file={file}
                onRemove={() => handleRemovePending(idx)}
              />
            ))}
          </div>

          {/* Real Upload Progress Bar */}
          {isUploading && (
            <div className="upload-progress-wrapper">
              <div className="progress-info-row">
                <span className="progress-text">Uploading photos...</span>
                <span className="progress-percent">{uploadProgress}%</span>
              </div>
              <div className="upload-progress-track">
                <div
                  className="upload-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="upload-actions-bar">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="confirm-upload-btn"
              disabled={isUploading}
              onClick={handleStartUpload}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Uploading {pendingFiles.length} photo(s)...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload {pendingFiles.length} Photo(s)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
