import React, { useState, useEffect } from 'react';
import { resolveAvatarUrl, getInitials } from '../../utils/media';
import { User } from 'lucide-react';
import './Avatar.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: AvatarSize | number;
  shape?: 'circle' | 'rounded' | 'square';
  className?: string;
  style?: React.CSSProperties;
  isOnline?: boolean | null;
  badge?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  loading?: 'lazy' | 'eager';
}

const GRADIENT_PALETTES = [
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
  'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
];

const getGradientForName = (name?: string | null): string => {
  if (!name) return GRADIENT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  shape = 'circle',
  className = '',
  style,
  isOnline = null,
  badge,
  onClick,
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(src);

  // Reset error state if source URL changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const sizeClass = typeof size === 'string' ? `avatar-size-${size}` : '';
  const customDimensions =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
      : {};

  const initials = getInitials(name || alt);
  const backgroundGradient = getGradientForName(name || alt);

  return (
    <div
      className={`connectly-avatar-wrapper avatar-shape-${shape} ${sizeClass} ${onClick ? 'avatar-clickable' : ''} ${className}`}
      style={{ ...customDimensions, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {resolvedUrl && !hasError ? (
        <img
          src={resolvedUrl}
          alt={alt || name || 'User avatar'}
          className="connectly-avatar-img"
          loading={loading}
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="connectly-avatar-fallback"
          style={{ background: backgroundGradient }}
          aria-label={alt || name || 'Avatar placeholder'}
        >
          {initials !== '?' ? (
            <span className="avatar-initials-text">{initials}</span>
          ) : (
            <User size={typeof size === 'number' ? Math.floor(size * 0.5) : 18} className="avatar-fallback-icon" />
          )}
        </div>
      )}

      {/* Online presence indicator dot */}
      {isOnline !== null && (
        <span
          className={`avatar-presence-dot ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Online now' : 'Offline'}
        />
      )}

      {/* Custom badge slot */}
      {badge && <div className="avatar-badge-slot">{badge}</div>}
    </div>
  );
};

export default Avatar;
