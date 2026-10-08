import { BACKEND_URL } from '../config/env';

/**
 * Resolves a media URL (relative upload path vs absolute web URL)
 * Ensures uploaded photos and videos point to the correct backend origin if relative.
 * Handles production URL routing, localhost sanitization, and path normalization.
 */
export const getMediaUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Data URLs and local blob preview URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Protocol-relative URLs (e.g. //images.unsplash.com)
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // 3. Absolute HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's a development localhost/127.0.0.1 URL stored in DB, rewrite to BACKEND_URL in production
    const isProductionBackend = BACKEND_URL && !BACKEND_URL.includes('localhost') && !BACKEND_URL.includes('127.0.0.1');
    if (isProductionBackend && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
      const pathPart = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
      const cleanOrigin = BACKEND_URL.replace(/\/+$/, '');
      const cleanPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
      return `${cleanOrigin}${cleanPath}`;
    }
    return trimmed;
  }

  // 4. Relative paths (e.g., '/uploads/...' or 'uploads/...')
  // Normalize Windows backslashes
  const normalizedPath = trimmed.replace(/\\/g, '/');
  const cleanOrigin = BACKEND_URL.replace(/\/+$/, '');
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${cleanOrigin}${cleanPath}`;
};

/**
 * Resolves avatar URL from any user, profile, or candidate object
 */
export const resolveAvatarUrl = (userOrPhoto?: any): string => {
  if (!userOrPhoto) return '';
  if (typeof userOrPhoto === 'string') {
    return getMediaUrl(userOrPhoto);
  }

  const candidate =
    userOrPhoto.avatarUrl ||
    userOrPhoto.photoUrl ||
    userOrPhoto.fileUrl ||
    userOrPhoto.url ||
    userOrPhoto.primaryPhoto?.fileUrl ||
    userOrPhoto.primaryPhoto?.url ||
    (Array.isArray(userOrPhoto.photos) && userOrPhoto.photos[0]?.fileUrl) ||
    (Array.isArray(userOrPhoto.photos) && userOrPhoto.photos[0]?.url) ||
    userOrPhoto.actor_avatar_url ||
    userOrPhoto.senderAvatar ||
    userOrPhoto.communityAvatar ||
    null;

  return getMediaUrl(candidate);
};

/**
 * Extracts initials for avatar fallback (e.g. "John Doe" -> "JD", "Alex" -> "A")
 */
export const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default getMediaUrl;
