import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreVertical,
  CheckCircle,
  Trash2,
  AlertTriangle,
  User,
} from 'lucide-react';
import type { PostItem } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import { useAuth } from '../../hooks/useAuth';
import PostComments from './PostComments';
import SharePostModal from './SharePostModal';
import ReportContentModal from './ReportContentModal';
import { getMediaUrl } from '../../utils/media';

interface PostCardProps {
  post: PostItem;
  onPostDeleted?: (postId: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted }) => {
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const isOwner = post.userId === currentUserId;

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [sharesCount, setSharesCount] = useState(post.sharesCount);

  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleLikeToggle = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        await FeedService.unlikePost(post.id);
      } else {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        await FeedService.likePost(post.id);
      }
    } catch {
      // Rollback on failure
      setIsLiked(post.isLiked);
      setLikesCount(post.likesCount);
    }
  };

  const handleBookmarkToggle = async () => {
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        await FeedService.unbookmarkPost(post.id);
      } else {
        setIsBookmarked(true);
        await FeedService.bookmarkPost(post.id);
      }
    } catch {
      setIsBookmarked(post.isBookmarked);
    }
  };

  const handleDeletePost = async () => {
    setShowMenu(false);
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await FeedService.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch {
      alert('Failed to delete post.');
    }
  };

  // Render text content with hashtags highlighted
  const renderFormattedContent = (text: string | null) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="hashtag">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Format date cleanly
  const formattedTime = new Date(post.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="post-card">
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author-info">
          <div className="post-author-avatar">
            {post.author.avatarUrl ? (
              <img src={getMediaUrl(post.author.avatarUrl)} alt={post.author.firstName} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
                <User size={20} color="#94a3b8" />
              </div>
            )}
          </div>
          <div className="post-author-meta">
            <div className="post-author-name">
              <span>
                {post.author.firstName} {post.author.lastName}
              </span>
              {post.author.isVerified && (
                <CheckCircle size={15} className="post-verified-badge" fill="currentColor" />
              )}
            </div>
            <span className="post-timestamp">{formattedTime}</span>
          </div>
        </div>

        {/* Options Menu */}
        <div className="post-menu-wrapper">
          <button
            type="button"
            className="post-menu-btn"
            onClick={() => setShowMenu((prev) => !prev)}
            aria-label="Post options"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="post-menu-dropdown" onClick={() => setShowMenu(false)}>
              {isOwner ? (
                <button
                  type="button"
                  className="post-menu-item danger"
                  onClick={handleDeletePost}
                >
                  <Trash2 size={15} />
                  <span>Delete Post</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="post-menu-item"
                  onClick={() => setShowReportModal(true)}
                >
                  <AlertTriangle size={15} />
                  <span>Report Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Caption Content */}
      {post.content && (
        <div className="post-content">{renderFormattedContent(post.content)}</div>
      )}

      {/* Media Attachment */}
      {post.mediaUrl && (
        <div className="post-media-container">
          {post.mediaType === 'video' ? (
            <video src={getMediaUrl(post.mediaUrl)} controls playsInline />
          ) : (
            <img src={getMediaUrl(post.mediaUrl)} alt="Post content" loading="lazy" />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="post-actions-bar">
        <div className="post-actions-left">
          <button
            type="button"
            className={`post-action-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeToggle}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} />
            <span>{likesCount}</span>
          </button>

          <button
            type="button"
            className="post-action-btn"
            onClick={() => setShowComments((prev) => !prev)}
            title="Comments"
          >
            <MessageSquare size={18} />
            <span>{commentsCount}</span>
          </button>

          <button
            type="button"
            className="post-action-btn"
            onClick={() => setShowShareModal(true)}
            title="Share with connections"
          >
            <Share2 size={18} />
            {sharesCount > 0 && <span>{sharesCount}</span>}
          </button>
        </div>

        <button
          type="button"
          className={`post-action-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmarkToggle}
          title={isBookmarked ? 'Saved to bookmarks' : 'Save post'}
        >
          <Bookmark size={18} fill={isBookmarked ? 'var(--accent-amber)' : 'none'} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <PostComments
          postId={post.id}
          initialCommentsCount={commentsCount}
          onCommentsCountChange={(count) => setCommentsCount(count)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <SharePostModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShared={() => setSharesCount((prev) => prev + 1)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportContentModal
          targetType="post"
          targetId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </article>
  );
};

export default PostCard;
