import React, { useState, useRef } from 'react';
import { X, UploadCloud, Clock, Sparkles } from 'lucide-react';
import { FeedService } from '../../services/feed.service';
import type { StoryItem } from '../../types/feed';

interface StoryComposerModalProps {
  onClose: () => void;
  onStoryCreated: (story: StoryItem) => void;
}

export const StoryComposerModal: React.FC<StoryComposerModalProps> = ({
  onClose,
  onStoryCreated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Media file size cannot exceed 50MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setErrorMessage('Only images and videos are supported.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a photo or video for your story.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('media', selectedFile);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      const created = await FeedService.createStory(formData);
      onStoryCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to publish story. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feed-modal-backdrop" onClick={onClose}>
      <div className="feed-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="feed-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-pink)" />
            <h3 className="feed-modal-title">Create Story</h3>
          </div>
          <button
            type="button"
            className="feed-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker / Preview */}
          {!previewUrl ? (
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={40} color="var(--text-muted)" />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Click to upload photo or video
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  PNG, JPG, MP4 or WEBM (Max 50MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="composer-preview-container">
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="composer-preview-img"
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="composer-preview-img"
                />
              )}
              <button
                type="button"
                className="composer-preview-remove"
                onClick={handleRemoveMedia}
                title="Remove media"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            style={{ display: 'none' }}
          />

          {/* Caption Input */}
          <div>
            <input
              type="text"
              placeholder="Add a caption (optional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={250}
              className="comment-input-field"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* 24 Hour Expiry Note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '8px 12px',
              borderRadius: '10px',
            }}
          >
            <Clock size={15} />
            <span>Stories vanish automatically after 24 hours.</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="composer-media-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="composer-submit-btn"
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? 'Publishing...' : 'Share Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryComposerModal;
