import { BACKEND_URL } from '../config/env';

/**
 * Resolves a media URL (relative upload path vs absolute web URL)
 * Ensures uploaded photos and videos point to the correct backend origin if relative.
 */
export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const backendOrigin = BACKEND_URL;
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default getMediaUrl;
