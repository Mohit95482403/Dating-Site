import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Storage Configuration with Cryptographic Random Naming & Path Traversal Prevention
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.png';
    // Strictly sanitized filename with zero user-supplied path components
    cb(null, `upload-${Date.now()}-${randomHex}${safeExt}`);
  },
});

// File filter with MIME and extension double-verification
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
        `Unsupported or insecure file format: "${file.originalname}". Only JPEG, PNG, and WebP images are permitted.`
      )
    );
  }
};

// 5MB maximum file size limit
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
});

export default upload;
