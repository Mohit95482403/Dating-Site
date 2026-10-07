import React, { useState, useEffect, useCallback } from 'react';
import type { ProfilePhoto } from '../../types/profile';
import { Camera, ChevronLeft, ChevronRight, X, Maximize2, Star, Image as ImageIcon } from 'lucide-react';
import Button from '../../components/common/Button';
import { BACKEND_URL } from '../../config/env';

interface ProfilePhotoGalleryProps {
  photos: ProfilePhoto[];
  firstName: string;
  onAddPhotoClick?: () => void;
  onPhotoClick?: (index: number) => void;
}

export const ProfilePhotoGallery: React.FC<ProfilePhotoGalleryProps> = ({
  photos,
  firstName,
  onAddPhotoClick,
  onPhotoClick,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<number, boolean>>({});

  // Ensure selectedIndex is within valid range if photos change
  useEffect(() => {
    if (selectedIndex >= photos.length && photos.length > 0) {
      setSelectedIndex(0);
    }
  }, [photos.length, selectedIndex]);

  const activePhoto = photos[selectedIndex] || null;

  const handleNext = useCallback(() => {
    if (photos.length > 1) {
      setSelectedIndex((prev) => (prev + 1) % photos.length);
    }
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length > 1) {
      setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  }, [photos.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handleNext, handlePrev]);

  const handleImageError = (id: number) => {
    setImgErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  // Helper to resolve image URL (relative upload path vs absolute web URL)
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const backendOrigin = BACKEND_URL;
    return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="profile-gallery-container">
      {photos.length === 0 ? (
        // Empty State
        <div className="profile-gallery-empty">
          <div className="empty-photo-icon-box">
            <Camera size={44} className="empty-photo-icon" />
          </div>
          <h3 className="empty-photo-title">No profile photos yet</h3>
          <p className="empty-photo-desc">
            Profiles with photos get 10x more connections. Add your first photo to complete your vibe.
          </p>
          {onAddPhotoClick && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddPhotoClick}
              className="add-first-photo-btn"
            >
              <Camera size={16} />
              <span>Add Profile Photo</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="profile-gallery-content">
          {/* Main Selected Photo View */}
          <div className="profile-main-photo-wrapper">
            {activePhoto && !imgErrorMap[activePhoto.id] ? (
              <img
                src={getImageUrl(activePhoto.url)}
                alt={`${firstName}'s profile photo`}
                className="profile-main-image"
                onError={() => handleImageError(activePhoto.id)}
                onClick={() => (onPhotoClick ? onPhotoClick(selectedIndex) : setIsLightboxOpen(true))}
              />
            ) : (
              <div
                className="profile-image-fallback"
                onClick={() => (onPhotoClick ? onPhotoClick(selectedIndex) : setIsLightboxOpen(true))}
              >
                <ImageIcon size={48} className="fallback-icon" />
                <span>Photo unavailable</span>
              </div>
            )}

            {/* Badges and Lightbox Trigger overlay */}
            <div className="profile-photo-overlay-top">
              {activePhoto?.isPrimary ? (
                <span className="primary-photo-badge" title="Primary Profile Photo">
                  <Star size={12} fill="#ff3366" stroke="#ff3366" />
                  <span>Primary</span>
                </span>
              ) : null}

              <button
                type="button"
                className="lightbox-expand-btn"
                onClick={() => (onPhotoClick ? onPhotoClick(selectedIndex) : setIsLightboxOpen(true))}
                aria-label="View Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* Left / Right Arrows on main photo if multiple */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav-arrow gallery-nav-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label="Previous Photo"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-arrow gallery-nav-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label="Next Photo"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Photo Counter */}
            {photos.length > 1 && (
              <div className="photo-counter-pill">
                {selectedIndex + 1} / {photos.length}
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {photos.length > 1 && (
            <div className="profile-thumbnails-scroller">
              {photos.map((photo, index) => {
                const isSelected = index === selectedIndex;
                const isError = imgErrorMap[photo.id];
                return (
                  <button
                    key={photo.id}
                    type="button"
                    className={`gallery-thumb-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                  >
                    {!isError ? (
                      <img
                        src={getImageUrl(photo.url)}
                        alt={`Thumbnail ${index + 1}`}
                        className="gallery-thumb-img"
                        onError={() => handleImageError(photo.id)}
                      />
                    ) : (
                      <div className="gallery-thumb-fallback">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    {photo.isPrimary && <span className="thumb-star-dot" title="Primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightweight Photo Lightbox Modal */}
      {isLightboxOpen && activePhoto && (
        <div
          className="photo-lightbox-backdrop"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="photo-lightbox-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close Lightbox"
            >
              <X size={24} />
            </button>

            <div className="lightbox-img-container">
              {!imgErrorMap[activePhoto.id] ? (
                <img
                  src={getImageUrl(activePhoto.url)}
                  alt={`${firstName}'s photo`}
                  className="lightbox-full-img"
                />
              ) : (
                <div className="lightbox-fallback">
                  <ImageIcon size={64} />
                  <p>Photo could not be loaded</p>
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav-btn lightbox-prev"
                  onClick={handlePrev}
                  aria-label="Previous"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  className="lightbox-nav-btn lightbox-next"
                  onClick={handleNext}
                  aria-label="Next"
                >
                  <ChevronRight size={28} />
                </button>
                <div className="lightbox-footer-info">
                  <span>
                    {selectedIndex + 1} of {photos.length}
                  </span>
                  {activePhoto.isPrimary && (
                    <span className="lightbox-primary-tag">Primary Photo</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoGallery;
