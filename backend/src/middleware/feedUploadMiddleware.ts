import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];

// Feed posts upload directory
const feedDir = path.resolve(__dirname, '../../uploads/feed');
if (!fs.existsSync(feedDir)) {
  fs.mkdirSync(feedDir, { recursive: true });
}

// Stories upload directory
const storiesDir = path.resolve(__dirname, '../../uploads/stories');
if (!fs.existsSync(storiesDir)) {
  fs.mkdirSync(storiesDir, { recursive: true });
}

const feedStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, feedDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    cb(null, `post-${Date.now()}-${randomHex}${safeExt}`);
  },
});

const storyStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, storiesDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    cb(null, `story-${Date.now()}-${randomHex}${safeExt}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(
      AppError.badRequest(
        `Unsupported media format for "${file.originalname}". Permitted: JPEG, PNG, WebP, GIF, MP4, WebM.`
      )
    );
  }
};

export const feedUpload = multer({
  storage: feedStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for feed posts
});

export const storyUpload = multer({
  storage: storyStorage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB for stories
});
