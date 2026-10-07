import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { SupportController } from '../controllers/support.controller';

const router = Router();

// Regular user support endpoints
router.use(requireAuth);

// POST /api/support/tickets - Submit inquiry
router.post('/tickets', asyncHandler(SupportController.createTicket as any));

// GET /api/support/tickets - View my inquiries
router.get('/tickets', asyncHandler(SupportController.getUserTickets as any));

// GET /api/support/tickets/:id - View inquiry discussion
router.get('/tickets/:id', asyncHandler(SupportController.getTicketDetail as any));

// POST /api/support/tickets/:id/reply - Post message on ticket
router.post('/tickets/:id/reply', asyncHandler(SupportController.replyTicket as any));

export default router;
