import React, { useState } from 'react';
import { getMediaUrl, resolveAvatarUrl, getInitials } from '../../utils/media';
import { User } from 'lucide-react';

export interface UserAvatarProps {
  src?: string | null;
  user?: any;
  alt?: string;
  name?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  showBorder?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  user,
  alt = 'Avatar',
  name,
  size = 'md',
  className = '',
  style = {},
  onClick,
  showBorder = false,
}) => {
  const [hasError, setHasError] = useState(false);

  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;
  const rawUrl = src !== undefined ? src : user ? resolveAvatarUrl(user) : null;
  const resolvedUrl = getMediaUrl(rawUrl);

  React.useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const displayName = name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || alt;
  const initials = getInitials(displayName);

  const handleImageError = () => {
    setHasError(true);
  };

  const containerStyle: React.CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    minWidth: `${pixelSize}px`,
    minHeight: `${pixelSize}px`,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    userSelect: 'none',
    border: showBorder ? '2px solid rgba(255, 255, 255, 0.2)' : 'none',
    ...style,
  };

  if (resolvedUrl && !hasError) {
    return (
      <div
        className={`user-avatar-wrap ${className}`}
        style={containerStyle}
        onClick={onClick}
      >
        <img
          src={resolvedUrl}
          alt={displayName}
          onError={handleImageError}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // Fallback: Initials with gradient background
  const fontSize = Math.max(10, Math.floor(pixelSize * 0.38));

  return (
    <div
      className={`user-avatar-wrap user-avatar-fallback ${className}`}
      style={{
        ...containerStyle,
        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: `${fontSize}px`,
      }}
      onClick={onClick}
      title={displayName}
    >
      {initials && initials !== '?' ? (
        <span>{initials}</span>
      ) : (
        <User size={Math.floor(pixelSize * 0.5)} color="#ffffff" />
      )}
    </div>
  );
};

export default UserAvatar;
