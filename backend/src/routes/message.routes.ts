import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { MessageController } from '../controllers/message.controller';
import { ReactionController } from '../controllers/reaction.controller';

const router = Router();

router.use(requireAuth);

// GET /api/messages/:conversationId - Paginated messages
router.get('/:conversationId', MessageController.getMessages);

// POST /api/messages/:conversationId - Send message
router.post('/:conversationId', MessageController.sendMessage);

// POST /api/messages/:messageId/reaction - Add or toggle message reaction
router.post('/:messageId/reaction', ReactionController.toggleReaction);

// DELETE /api/messages/:messageId/reaction - Remove message reaction
router.delete('/:messageId/reaction', ReactionController.removeReaction);

export default router;
