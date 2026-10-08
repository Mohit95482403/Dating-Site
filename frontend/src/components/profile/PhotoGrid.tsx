import React, { useState, type DragEvent } from 'react';
import type { ProfilePhoto } from '../../types/profile';
import { Star, Trash2, ArrowLeft, ArrowRight, AlertTriangle, GripVertical, Image as ImageIcon } from 'lucide-react';
import Button from '../common/Button';
import { getMediaUrl } from '../../utils/media';

interface PhotoGridProps {
  photos: ProfilePhoto[];
  onSetPrimary: (photoId: number) => Promise<void>;
  onDelete: (photoId: number) => Promise<void>;
  onReorder: (photoIds: number[]) => Promise<void>;
  isProcessing?: boolean;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onSetPrimary,
  onDelete,
  onReorder,
  isProcessing = false,
}) => {
  const [photoToDelete, setPhotoToDelete] = useState<ProfilePhoto | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [imgErrorMap, setImgErrorMap] = useState<Record<number, boolean>>({});

  const handleImageError = (id: number) => {
    setImgErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (url: string) => {
    return getMediaUrl(url) || '';
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...photos];
    const [movedPhoto] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, movedPhoto);

    setDraggedIndex(null);
    setDragOverIndex(null);

    const newPhotoIds = reordered.map((p) => p.id);
    await onReorder(newPhotoIds);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Accessible Move Buttons
  const handleMove = async (currentIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const reordered = [...photos];
    const [movedPhoto] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedPhoto);

    const newPhotoIds = reordered.map((p) => p.id);
    await onReorder(newPhotoIds);
  };

  // Delete Confirmation
  const confirmDelete = async () => {
    if (!photoToDelete) return;
    try {
      await onDelete(photoToDelete.id);
    } finally {
      setPhotoToDelete(null);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="photo-grid-wrapper">
      <div className="photo-grid-header">
        <h4 className="photo-grid-title">Your Profile Photos</h4>
        <span className="photo-grid-hint">
          Drag to reorder • Primary photo is shown first in discovery
        </span>
      </div>

      <div className="photo-items-grid">
        {photos.map((photo, index) => {
          const isDraggingThis = draggedIndex === index;
          const isDragOverThis = dragOverIndex === index;
          const isError = imgErrorMap[photo.id];

          return (
            <div
              key={photo.id}
              className={`photo-grid-card ${photo.isPrimary ? 'is-primary-card' : ''} ${
                isDraggingThis ? 'dragging' : ''
              } ${isDragOverThis ? 'drag-over' : ''}`}
              draggable={!isProcessing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              {/* Photo Image */}
              <div className="photo-card-img-box">
                {!isError ? (
                  <img
                    src={getImageUrl(photo.url)}
                    alt={`Profile photo ${index + 1}`}
                    className="photo-card-img"
                    onError={() => handleImageError(photo.id)}
                  />
                ) : (
                  <div className="photo-card-fallback">
                    <ImageIcon size={32} />
                    <span>Image unavailable</span>
                  </div>
                )}

                {/* Primary Photo Badge */}
                {photo.isPrimary && (
                  <div className="grid-primary-badge" title="Primary Profile Photo">
                    <Star size={12} fill="#ff3366" stroke="#ff3366" />
                    <span>Primary</span>
                  </div>
                )}

                {/* Order Index Pill */}
                <div className="grid-order-pill">#{index + 1}</div>

                {/* Drag Handle Indicator */}
                <div className="grid-drag-handle" title="Drag to reorder">
                  <GripVertical size={16} />
                </div>
              </div>

              {/* Photo Actions Footer */}
              <div className="photo-card-actions">
                {/* Make Primary / Set Main button */}
                {!photo.isPrimary ? (
                  <button
                    type="button"
                    className="action-btn make-primary-btn"
                    onClick={() => onSetPrimary(photo.id)}
                    disabled={isProcessing}
                    title="Set as your primary photo"
                  >
                    <Star size={13} />
                    <span>Set Main</span>
                  </button>
                ) : (
                  <span className="main-active-label">Main Photo</span>
                )}

                {/* Move Left / Right accessible buttons */}
                <div className="move-buttons-group">
                  <button
                    type="button"
                    className="action-btn move-btn"
                    disabled={index === 0 || isProcessing}
                    onClick={() => handleMove(index, 'left')}
                    title="Move earlier"
                    aria-label="Move photo left"
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <button
                    type="button"
                    className="action-btn move-btn"
                    disabled={index === photos.length - 1 || isProcessing}
                    onClick={() => handleMove(index, 'right')}
                    title="Move later"
                    aria-label="Move photo right"
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  className="action-btn delete-photo-btn"
                  onClick={() => setPhotoToDelete(photo)}
                  disabled={isProcessing}
                  title="Delete this photo"
                  aria-label="Delete photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          className="delete-dialog-backdrop"
          onClick={() => setPhotoToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="delete-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="delete-dialog-icon-box">
              <AlertTriangle size={24} />
            </div>
            <h3 className="delete-dialog-title">Delete this photo?</h3>
            <p className="delete-dialog-desc">
              {photoToDelete.isPrimary && photos.length > 1
                ? 'This is your primary photo. Deleting it will automatically promote your next photo to primary.'
                : 'This photo will be permanently deleted from your profile.'}
            </p>
            <div className="delete-dialog-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoToDelete(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="discard-confirm-btn"
                onClick={confirmDelete}
                disabled={isProcessing}
              >
                Delete Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;
