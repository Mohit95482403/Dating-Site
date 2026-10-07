// Connectly Helper Utilities

export const formatDistance = (distanceKm?: number): string => {
  if (!distanceKm) return 'Nearby';
  if (distanceKm < 1) return '< 1 km away';
  return `${Math.round(distanceKm)} km away`;
};

export const formatTimeAgo = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Safely format a date to localized date string, handling null, undefined, and invalid values gracefully.
 */
export const formatDateSafe = (
  dateInput?: string | number | Date | null,
  fallback = '—',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return fallback;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, options);
};

/**
 * Safely format a date & time to localized string, handling null, undefined, and invalid values gracefully.
 */
export const formatDateTimeSafe = (
  dateInput?: string | number | Date | null,
  fallback = '—',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return fallback;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, options);
};

/**
 * Safely format a time string, handling null, undefined, and invalid values gracefully.
 */
export const formatTimeSafe = (
  dateInput?: string | number | Date | null,
  fallback = '—',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return fallback;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString([], options || { hour: '2-digit', minute: '2-digit' });
};

/**
 * Safely format a number to locale string with fallback for null/undefined/NaN.
 */
export const formatNumberSafe = (
  numInput?: number | null,
  fallback = '0'
): string => {
  if (numInput === null || numInput === undefined || isNaN(Number(numInput))) return fallback;
  return Number(numInput).toLocaleString();
};

