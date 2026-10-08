import React, { useState, useEffect } from 'react';
import { Send, Heart, Trash2, User } from 'lucide-react';
import type { CommentItem } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import { useAuth } from '../../hooks/useAuth';
import { getMediaUrl } from '../../utils/media';

interface PostCommentsProps {
  postId: number;
  initialCommentsCount?: number;
  onCommentsCountChange: (count: number) => void;
}

export const PostComments: React.FC<PostCommentsProps> = ({
  postId,
  onCommentsCountChange,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      if (!postId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await FeedService.getComments(postId);
        if (isMounted) {
          const list = Array.isArray(data?.comments)
            ? data.comments
            : Array.isArray(data)
            ? (data as any)
            : [];
          setComments(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Unable to load comments.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchComments();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting || !postId) return;

    try {
      setSubmitting(true);
      const newComment = await FeedService.createComment(postId, content.trim());
      if (newComment && newComment.id) {
        setComments((prev) => {
          const updated = [...(Array.isArray(prev) ? prev : []), newComment];
          onCommentsCountChange(updated.length);
          return updated;
        });
        setContent('');
      }
    } catch {
      alert('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await FeedService.deleteComment(commentId);
      setComments((prev) => {
        const updated = (Array.isArray(prev) ? prev : []).filter((c) => c.id !== commentId);
        onCommentsCountChange(updated.length);
        return updated;
      });
    } catch {
      alert('Failed to delete comment.');
    }
  };

  const handleLike = async (comment: CommentItem) => {
    try {
      if (comment.isLiked) {
        await FeedService.unlikeComment(comment.id);
        setComments((prev) =>
          (Array.isArray(prev) ? prev : []).map((c) =>
            c.id === comment.id
              ? { ...c, isLiked: false, likesCount: Math.max(0, (c.likesCount || 0) - 1) }
              : c
          )
        );
      } else {
        await FeedService.likeComment(comment.id);
        setComments((prev) =>
          (Array.isArray(prev) ? prev : []).map((c) =>
            c.id === comment.id
              ? { ...c, isLiked: true, likesCount: (c.likesCount || 0) + 1 }
              : c
          )
        );
      }
    } catch {
      // ignore
    }
  };

  const safeComments = Array.isArray(comments) ? comments : [];

  return (
    <div className="post-comments-container">
      {/* Comments List */}
      <div className="comments-list">
        {loading && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Loading comments...
          </div>
        )}

        {!loading && error && (
          <div style={{ fontSize: '0.8rem', color: '#f87171' }}>
            {error}
          </div>
        )}

        {!loading && !error && safeComments.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No comments yet. Be the first to chime in!
          </div>
        )}

        {!loading && !error && safeComments.map((comment) => {
          if (!comment || !comment.id) return null;
          const isOwner = comment.userId === currentUserId;
          const author = comment.author || {
            id: comment.userId,
            firstName: 'User',
            lastName: '',
            avatarUrl: undefined,
            isVerified: false,
            role: 'user',
          };
          const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'User';
          const avatarUrl = author.avatarUrl || (author as any)?.photoUrl;
          const formattedTime = comment.createdAt
            ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {avatarUrl ? (
                  <img src={getMediaUrl(avatarUrl)} alt={authorName} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
                    <User size={16} color="#94a3b8" />
                  </div>
                )}
              </div>

              <div className="comment-bubble">
                <div className="comment-header">
                  <span className="comment-author-name">{authorName}</span>
                  {formattedTime && <span className="comment-time">{formattedTime}</span>}
                </div>

                <div className="comment-text" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {comment.content}
                </div>

                <div className="comment-actions-bar">
                  <button
                    type="button"
                    className={`comment-like-btn ${comment.isLiked ? 'liked' : ''}`}
                    onClick={() => handleLike(comment)}
                  >
                    <Heart size={12} fill={comment.isLiked ? 'var(--accent-pink)' : 'none'} />
                    <span>{comment.likesCount > 0 ? comment.likesCount : ''}</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      className="comment-delete-btn"
                      onClick={() => handleDelete(comment.id)}
                      title="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="comment-input-row">
        <input
          type="text"
          className="comment-input-field"
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
        />
        <button
          type="submit"
          className="comment-send-btn"
          disabled={submitting || !content.trim()}
          title="Send comment"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default PostComments;
