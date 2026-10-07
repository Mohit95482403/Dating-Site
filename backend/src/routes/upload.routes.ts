import { Router, Request, Response } from 'express';
import { upload } from '../middleware/uploadMiddleware';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

const router = Router();

// POST /api/upload - Prepared upload endpoint demonstrating Multer architecture
router.post('/', upload.single('media'), (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest('No media file uploaded or invalid file format.');
  }

  ApiResponse.success(
    res,
    'File uploaded successfully',
    {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`,
    },
    HttpStatus.CREATED
  );
});

export default router;
