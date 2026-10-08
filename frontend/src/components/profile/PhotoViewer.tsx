import React, { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ProfilePhoto } from '../../types/profile';
import { getMediaUrl } from '../../utils/media';
import './PhotoViewer.css';

interface PhotoViewerProps {
  isOpen: boolean;
  photos: ProfilePhoto[];
  initialIndex?: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  isOpen,
  photos,
  currentIndex,
  onIndexChange,
  onClose,
}) => {
  const total = photos.length;

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((currentIndex - 1 + total) % total);
  }, [currentIndex, total, onIndexChange]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((currentIndex + 1) % total);
  }, [currentIndex, total, onIndexChange]);

  // Keyboard Navigation: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch Swipe Support for Mobile
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  if (!isOpen || total === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  return (
    <div
      className="photo-viewer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen photo viewer"
    >
      <div
        className="photo-viewer-container"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Bar with Counter and Close Button */}
        <div className="photo-viewer-topbar">
          <div className="photo-viewer-counter">
            <span>{currentIndex + 1}</span> / <span>{total}</span>
          </div>

          <button
            type="button"
            className="photo-viewer-close-btn"
            onClick={onClose}
            aria-label="Close photo viewer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Image Stage */}
        <div className="photo-viewer-stage">
          {total > 1 && (
            <button
              type="button"
              className="photo-viewer-nav-btn prev-btn"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          <div className="photo-viewer-image-wrap">
            <img
              src={getMediaUrl(currentPhoto.url)}
              alt={currentPhoto.fileName || `Profile photo ${currentIndex + 1}`}
              className="photo-viewer-image"
              loading="eager"
            />
            {currentPhoto.isPrimary && (
              <span className="photo-viewer-primary-badge">Primary Photo</span>
            )}
          </div>

          {total > 1 && (
            <button
              type="button"
              className="photo-viewer-nav-btn next-btn"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>

        {/* Thumbnail Bar */}
        {total > 1 && (
          <div className="photo-viewer-thumbnails">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                type="button"
                className={`photo-viewer-thumb-btn ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => onIndexChange(idx)}
              >
                <img src={getMediaUrl(p.url)} alt={`Thumbnail ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoViewer;
