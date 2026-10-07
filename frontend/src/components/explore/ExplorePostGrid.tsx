import React, { useState } from 'react';
import { Heart, MessageSquare, Play, X, Sparkles } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import { PostCard } from '../feed/PostCard';
import type { SearchResultPost } from '../../types/explore';
import type { PostItem } from '../../types/feed';

interface ExplorePostGridProps {
  posts: SearchResultPost[];
  isLoading?: boolean;
  title?: string;
}

export const ExplorePostGrid: React.FC<ExplorePostGridProps> = ({
  posts,
  isLoading,
  title = 'Popular & Trending Posts',
}) => {
  const [selectedPost, setSelectedPost] = useState<SearchResultPost | null>(null);

  if (isLoading) {
    return (
      <div className="explore-post-grid-container">
        <div className="section-header">
          <div className="title-with-icon">
            <Sparkles size={18} className="section-icon accent-purple" />
            <h2 className="section-title">{title}</h2>
          </div>
        </div>
        <div className="explore-post-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="explore-post-tile-skeleton skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="explore-empty-posts glass-panel">
        <Sparkles size={24} className="empty-icon" />
        <p className="empty-text">No posts discovered in this section yet.</p>
      </div>
    );
  }

  // Convert SearchResultPost to PostItem format for PostCard reuse
  const toPostItem = (p: SearchResultPost): PostItem => ({
    id: p.id,
    userId: p.userId,
    content: p.content,
    mediaUrl: p.mediaUrl,
    mediaType: (p.mediaType as 'image' | 'video') || null,
    visibility: p.visibility as any,
    status: 'active',
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    bookmarksCount: p.bookmarksCount,
    sharesCount: p.sharesCount,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
    author: {
      id: p.author.id,
      firstName: p.author.firstName,
      lastName: p.author.lastName,
      avatarUrl: p.author.photoUrl || undefined,
      isVerified: Boolean(p.author.isVerified),
      role: 'user',
    },
    isLiked: Boolean(p.isLiked),
    isBookmarked: Boolean(p.isBookmarked),
  });

  return (
    <div className="explore-post-grid-container">
      {title && (
        <div className="section-header">
          <div className="title-with-icon">
            <Sparkles size={18} className="section-icon accent-purple" />
            <h2 className="section-title">{title}</h2>
          </div>
        </div>
      )}

      <div className="explore-post-grid">
        {posts.map((post) => {
          const hasMedia = Boolean(post.mediaUrl);
          const isVideo = post.mediaType === 'video';

          return (
            <div
              key={post.id}
              className={`explore-post-tile ${!hasMedia ? 'text-only' : ''}`}
              onClick={() => setSelectedPost(post)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSelectedPost(post);
              }}
            >
              {hasMedia ? (
                <>
                  {isVideo ? (
                    <video
                      src={getMediaUrl(post.mediaUrl!)}
                      className="tile-media"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={getMediaUrl(post.mediaUrl!)}
                      alt="Explore content"
                      className="tile-media"
                      loading="lazy"
                    />
                  )}
                  {isVideo && (
                    <span className="tile-video-indicator">
                      <Play size={14} fill="white" />
                    </span>
                  )}
                </>
              ) : (
                <div className="tile-text-content">
                  <p className="tile-text-snippet">
                    {post.content ? (post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content) : ''}
                  </p>
                  <span className="tile-author-signature">@{post.author.firstName}</span>
                </div>
              )}

              {/* Hover overlay with engagement stats */}
              <div className="tile-hover-overlay">
                <div className="tile-overlay-stats">
                  <span className="overlay-stat">
                    <Heart size={16} fill="white" /> {post.likesCount}
                  </span>
                  <span className="overlay-stat">
                    <MessageSquare size={16} fill="white" /> {post.commentsCount}
                  </span>
                </div>
                <div className="tile-overlay-author">
                  <span>{post.author.firstName}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Detail Modal using reused PostCard */}
      {selectedPost && (
        <div className="explore-post-modal-backdrop" onClick={() => setSelectedPost(null)}>
          <div
            className="explore-post-modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="explore-modal-close-btn"
              onClick={() => setSelectedPost(null)}
              aria-label="Close post viewer"
            >
              <X size={20} />
            </button>
            <div className="modal-postcard-wrapper">
              <PostCard
                post={toPostItem(selectedPost)}
                onPostDeleted={() => setSelectedPost(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
