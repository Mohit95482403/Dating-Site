import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { CallController } from '../controllers/call.controller';

const router = Router();

// Strict authentication on all calling routes
router.use(requireAuth);

router.post('/', asyncHandler(CallController.initiateCall as any));
router.get('/', asyncHandler(CallController.getUserCallHistory as any));
router.get('/conversation/:conversationId', asyncHandler(CallController.getConversationCallHistory as any));
router.get('/:callId', asyncHandler(CallController.getCallById as any));
router.post('/:callId/accept', asyncHandler(CallController.acceptCall as any));
router.post('/:callId/reject', asyncHandler(CallController.rejectCall as any));
router.post('/:callId/cancel', asyncHandler(CallController.cancelCall as any));
router.post('/:callId/end', asyncHandler(CallController.endCall as any));

export default router;
