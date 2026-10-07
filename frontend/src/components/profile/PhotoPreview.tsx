import React, { useEffect, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface PhotoPreviewProps {
  file: File;
  onRemove: () => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pending-photo-card">
      <div className="pending-photo-img-box">
        {previewUrl ? (
          <img src={previewUrl} alt={file.name} className="pending-photo-img" />
        ) : (
          <div className="pending-photo-placeholder">
            <ImageIcon size={24} />
          </div>
        )}
        <button
          type="button"
          className="pending-photo-remove-btn"
          onClick={onRemove}
          title={`Remove ${file.name}`}
          aria-label={`Remove ${file.name}`}
        >
          <X size={14} />
        </button>
      </div>
      <div className="pending-photo-meta">
        <span className="pending-photo-name" title={file.name}>
          {file.name}
        </span>
        <span className="pending-photo-size">{formatSize(file.size)}</span>
      </div>
    </div>
  );
};

export default PhotoPreview;
