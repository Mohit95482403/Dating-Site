import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Robust Centralized Uploads Storage Directory Configuration
 * 
 * Production (Render):
 * - Mount path: `/opt/render/project/src/backend/uploads`
 * - Also supports `UPLOADS_DIR` environment variable override.
 * Development:
 * - Local relative path: `<project_root>/backend/uploads`
 */
export const RENDER_PERSISTENT_UPLOADS_PATH = '/opt/render/project/src/backend/uploads';

export const getUploadsDir = (): string => {
  // 1. Explicit environment variable override
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) {
    return path.resolve(process.env.UPLOADS_DIR.trim());
  }

  // 2. Render Persistent Disk mount point check
  // In Linux production on Render, if the mount path exists or when running on Render in production
  if (
    fs.existsSync(RENDER_PERSISTENT_UPLOADS_PATH) ||
    (process.env.RENDER && process.env.NODE_ENV === 'production')
  ) {
    return RENDER_PERSISTENT_UPLOADS_PATH;
  }

  // 3. Fallback to standard local relative path for development & testing
  // When running from src (dev): __dirname is backend/src/config -> ../../uploads is backend/uploads
  // When running from dist (prod): __dirname is backend/dist/config -> ../../uploads is backend/uploads
  return path.resolve(__dirname, '../../uploads');
};

export const UPLOADS_DIR = getUploadsDir();

// Structured Subdirectories
export const PROFILES_UPLOADS_DIR = path.join(UPLOADS_DIR, 'profiles');
export const VERIFICATIONS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'verifications');
export const FEED_UPLOADS_DIR = path.join(UPLOADS_DIR, 'feed');
export const STORIES_UPLOADS_DIR = path.join(UPLOADS_DIR, 'stories');

/**
 * Ensures all required persistent uploads subdirectories exist.
 */
export const ensureUploadDirsExist = (): void => {
  const dirs = [
    UPLOADS_DIR,
    PROFILES_UPLOADS_DIR,
    VERIFICATIONS_UPLOADS_DIR,
    FEED_UPLOADS_DIR,
    STORIES_UPLOADS_DIR,
  ];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err: any) {
      logger.warn(`[Storage] Directory creation check warning for ${dir}: ${err.message}`);
    }
  }
};
