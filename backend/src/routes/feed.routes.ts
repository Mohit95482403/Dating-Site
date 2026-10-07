import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { FeedController } from '../controllers/feed.controller';
import { feedUpload, storyUpload } from '../middleware/feedUploadMiddleware';

const router = Router();

// All feed routes require authentication
router.use(authMiddleware);

// ────────────────── Posts ──────────────────
router.post('/posts', feedUpload.single('media'), FeedController.createPost);
router.get('/posts', FeedController.getFeed);
router.get('/posts/user/:userId', FeedController.getUserPosts);
router.delete('/posts/:postId', FeedController.deletePost);

// ────────────────── Post Likes ──────────────────
router.post('/posts/:postId/like', FeedController.likePost);
router.delete('/posts/:postId/like', FeedController.unlikePost);

// ────────────────── Comments ──────────────────
router.post('/posts/:postId/comments', FeedController.createComment);
router.get('/posts/:postId/comments', FeedController.getComments);
router.delete('/comments/:commentId', FeedController.deleteComment);
router.post('/comments/:commentId/like', FeedController.likeComment);
router.delete('/comments/:commentId/like', FeedController.unlikeComment);

// ────────────────── Bookmarks & Saves ──────────────────
router.post('/posts/:postId/bookmark', FeedController.bookmarkPost);
router.delete('/posts/:postId/bookmark', FeedController.unbookmarkPost);
router.post('/posts/:postId/save', FeedController.bookmarkPost);
router.delete('/posts/:postId/save', FeedController.unbookmarkPost);
router.get('/bookmarks', FeedController.getBookmarks);
router.get('/saved', FeedController.getBookmarks);

// ────────────────── Stories ──────────────────
router.post('/stories', storyUpload.single('media'), FeedController.createStory);
router.get('/stories', FeedController.getStoryFeed);
router.post('/stories/:storyId/view', FeedController.viewStory);
router.post('/stories/:storyId/react', FeedController.reactToStory);
router.delete('/stories/:storyId', FeedController.deleteStory);

// ────────────────── Content Reports ──────────────────
router.post('/reports', FeedController.reportContent);

// ────────────────── Admin Feed Management ──────────────────
router.get('/admin/reports', requireRole('admin'), FeedController.getContentReports);
router.patch('/admin/reports/:reportId', requireRole('admin'), FeedController.reviewContentReport);
router.get('/admin/analytics', requireRole('admin'), FeedController.getFeedAnalytics);

export default router;
