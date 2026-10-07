import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types/request.types';

// Root profile uploads directory: backend/uploads/profiles/
export const PROFILE_UPLOADS_ROOT = path.resolve(__dirname, '../../uploads/profiles');

// Ensure base upload directory exists
if (!fs.existsSync(PROFILE_UPLOADS_ROOT)) {
  fs.mkdirSync(PROFILE_UPLOADS_ROOT, { recursive: true });
}

// Storage Configuration with User-Specific Directory
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return cb(AppError.unauthorized('Authentication required for photo upload'), '');
    }

    const userDir = path.join(PROFILE_UPLOADS_ROOT, `user-${userId}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req: Request, file: Express.Multer.File, cb) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || 'anon';
    const randomHex = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();

    // Prevent collisions, path traversal, and unsafe characters
    const secureName = `user-${userId}-${Date.now()}-${randomHex}${ext}`;
    cb(null, secureName);
  },
});

// Allowed Image MIME Types and Extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// File filter with MIME & Extension verification
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
        `Unsupported file format for "${file.originalname}". Only JPEG, PNG, and WebP images are allowed.`
      )
    );
  }
};

// 5MB maximum file size limit
export const uploadProfilePhotos = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 6, // Maximum 6 files per request
  },
});

// Secure Verification Uploads Directory: backend/uploads/verifications/
export const VERIFICATION_UPLOADS_ROOT = path.resolve(__dirname, '../../uploads/verifications');
if (!fs.existsSync(VERIFICATION_UPLOADS_ROOT)) {
  fs.mkdirSync(VERIFICATION_UPLOADS_ROOT, { recursive: true });
}

const verificationStorage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return cb(AppError.unauthorized('Authentication required for verification upload'), '');
    }
    const userDir = path.join(VERIFICATION_UPLOADS_ROOT, `user-${userId}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || 'anon';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const secureName = `verify-${userId}-${Date.now()}-${randomHex}${ext}`;
    cb(null, secureName);
  },
});

// Allowed Verification Document MIME types & extensions (Images + PDF)
const VERIFICATION_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
];
const VERIFICATION_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const verificationFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const mimeOk = VERIFICATION_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = VERIFICATION_EXTENSIONS.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(
      AppError.badRequest(
        `Unsupported verification file format for "${file.originalname}". Only JPEG, PNG, WebP images and PDF documents are allowed.`
      )
    );
  }
};

export const uploadVerificationDoc = multer({
  storage: verificationStorage,
  fileFilter: verificationFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for identity document
    files: 1,
  },
});

export default uploadProfilePhotos;

