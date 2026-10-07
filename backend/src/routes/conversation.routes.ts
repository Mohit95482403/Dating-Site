import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { ConversationController } from '../controllers/conversation.controller';
import { MessageController } from '../controllers/message.controller';

const router = Router();

// All conversation routes require authentication
router.use(requireAuth);

// GET /api/conversations - List active conversations
router.get('/', ConversationController.getConversations);

// GET /api/conversations/unread-count - Total unread messages for badges
router.get('/unread-count', ConversationController.getUnreadCount);

// GET /api/conversations/match/:matchId - Get or create conversation for match
router.get('/match/:matchId', ConversationController.getOrCreateForMatch);

// GET /api/conversations/:conversationId - Single conversation details
router.get('/:conversationId', ConversationController.getConversation);

// POST /api/conversations/:conversationId/read - Mark messages read
router.post('/:conversationId/read', ConversationController.markAsRead);

// GET /api/conversations/:conversationId/messages - Paginated messages
router.get('/:conversationId/messages', MessageController.getMessages);

// POST /api/conversations/:conversationId/messages - Send message
router.post('/:conversationId/messages', MessageController.sendMessage);

export default router;
