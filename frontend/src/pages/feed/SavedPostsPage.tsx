import React, { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PostItem } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import PostCard from '../../components/feed/PostCard';
import '../../components/feed/feed.css';

export const SavedPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    FeedService.getBookmarks()
      .then((data) => {
        if (isMounted) setPosts(data.posts);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="feed-page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/feed" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Saved Posts
        </h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px' }}>
          Loading saved posts...
        </div>
      ) : posts.length === 0 ? (
        <div
          className="post-card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(252, 163, 17, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <Bookmark size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No saved posts yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
              Posts you bookmark will appear here so you can revisit them anytime.
            </p>
          </div>
          <Link to="/feed">
            <button type="button" className="composer-submit-btn" style={{ marginTop: '8px' }}>
              Go to Feed
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedPostsPage;
