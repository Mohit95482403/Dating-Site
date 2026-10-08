import React, { useState, useRef } from 'react';
import { Image, Send, X, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FeedService } from '../../services/feed.service';
import { CommunityService } from '../../services/community.service';
import { getMediaUrl } from '../../utils/media';
import type { PostItem, PostVisibility } from '../../types/feed';

interface PostComposerProps {
  onPostCreated: (post: PostItem) => void;
  communityId?: number;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onPostCreated, communityId }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25MB.');
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Only image and video uploads are allowed.');
      return;
    }

    setError(null);
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
    if (!content.trim() && !selectedFile) {
      setError('Please add some text or attach an image.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      formData.append('visibility', visibility);
      if (selectedFile) formData.append('media', selectedFile);

      let created: PostItem;
      if (communityId) {
        created = (await CommunityService.createPost(communityId, formData)) as unknown as PostItem;
      } else {
        created = await FeedService.createPost(formData);
      }
      onPostCreated(created);

      // Reset
      setContent('');
      handleRemoveMedia();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="post-composer-card">
      <div className="composer-header">
        <div className="composer-avatar">
          {user?.avatarUrl ? (
            <img src={getMediaUrl(user.avatarUrl)} alt="User profile" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
              <User size={22} color="#94a3b8" />
            </div>
          )}
        </div>

        <textarea
          className="composer-textarea"
          placeholder={`What's on your mind, ${user?.firstName || 'there'}? Share updates, vibes, or thoughts...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
        />
      </div>

      {/* Media Preview */}
      {previewUrl && (
        <div className="composer-preview-container">
          {selectedFile?.type.startsWith('video/') ? (
            <video src={previewUrl} className="composer-preview-img" controls />
          ) : (
            <img src={previewUrl} alt="Upload preview" className="composer-preview-img" />
          )}
          <button
            type="button"
            className="composer-preview-remove"
            onClick={handleRemoveMedia}
            title="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '4px 8px' }}>
          {error}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />

      {/* Toolbar */}
      <div className="composer-toolbar">
        <div className="composer-tools-left">
          <button
            type="button"
            className="composer-media-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Photo or Video"
          >
            <Image size={17} />
            <span>Photo / Video</span>
          </button>

          {/* Visibility Selector */}
          <select
            className="composer-visibility-select"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            title="Post audience"
          >
            <option value="public">🌐 Public</option>
            <option value="matches_only">💞 Matches Only</option>
            <option value="private">🔒 Only Me</option>
          </select>
        </div>

        <button
          type="button"
          className="composer-submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || (!content.trim() && !selectedFile)}
        >
          {isSubmitting ? (
            <span>Publishing...</span>
          ) : (
            <>
              <Send size={15} />
              <span>Post</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PostComposer;
