// Connectly Day 25: Trust, Safety & Anti-Abuse Routes

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { TrustController } from '../controllers/trust.controller';
import { uploadVerificationDoc } from '../config/multer';

const router = Router();

// All trust routes require active authentication
router.use(authMiddleware);

// User Trust Center & Verification
router.get('/overview', TrustController.getTrustCenter);
const handleTrustVerificationUpload = (req: any, res: any, next: any) => {
  uploadVerificationDoc.fields([
    { name: 'document', maxCount: 1 },
    { name: 'verificationDoc', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err) return next(err);
    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (filesObj) {
      req.file = filesObj['document']?.[0] || filesObj['verificationDoc']?.[0] || filesObj['file']?.[0];
    }
    next();
  });
};

router.post(
  '/verification',
  handleTrustVerificationUpload,
  TrustController.submitVerification
);

// Email & Phone Verification
router.post('/email/send', TrustController.sendEmailVerification);
router.post('/email/verify', TrustController.verifyEmail);
router.post('/phone/send', TrustController.sendPhoneOtp);
router.post('/phone/verify', TrustController.verifyPhoneOtp);

// Two-Factor Authentication
router.post('/2fa/setup', TrustController.setupTwoFactor);
router.post('/2fa/enable', TrustController.enableTwoFactor);
router.post('/2fa/disable', TrustController.disableTwoFactor);

// Security & Reports History
router.get('/security-events', TrustController.getSecurityEvents);
router.get('/reports', TrustController.getUserReports);

// Admin Trust & Safety
router.get('/admin/overview', TrustController.getAdminOverview);
router.post('/admin/restrictions', TrustController.issueRestriction);
router.delete('/admin/restrictions/:id', TrustController.revokeRestriction);

export default router;
