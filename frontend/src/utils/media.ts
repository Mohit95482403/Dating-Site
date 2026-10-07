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
  const backendOrigin = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default getMediaUrl;
