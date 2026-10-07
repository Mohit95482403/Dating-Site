import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, MessageSquarePlus, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PostItem, UserStoryGroup, StoryItem } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import StoryRail from '../../components/feed/StoryRail';
import StoryViewer from '../../components/feed/StoryViewer';
import StoryComposerModal from '../../components/feed/StoryComposerModal';
import PostComposer from '../../components/feed/PostComposer';
import PostCard from '../../components/feed/PostCard';
import { useSocket } from '../../hooks/useSocket';
import '../../components/feed/feed.css';

export const FeedPage: React.FC = () => {
  const { socket } = useSocket();

  // State
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story modals
  const [activeStoryGroupIdx, setActiveStoryGroupIdx] = useState<number | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // Ref to prevent duplicate concurrent pagination loads
  const loadingRef = useRef(false);

  // Fetch initial posts
  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoadingPosts(true);
      else setLoadingMore(true);
      setError(null);

      const data = await FeedService.getFeed(pageNum, 15);
      const incomingPosts = Array.isArray(data?.posts) ? data.posts : [];
      if (append) {
        setPosts((prev) => [...(Array.isArray(prev) ? prev : []), ...incomingPosts]);
      } else {
        setPosts(incomingPosts);
      }
      setHasMore(Boolean(data?.pagination?.hasMore));
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load feed. Please try again.');
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  // Fetch stories
  const fetchStories = useCallback(async () => {
    try {
      setLoadingStories(true);
      const groups = await FeedService.getStories();
      setStoryGroups(Array.isArray(groups) ? groups : []);
    } catch {
      setStoryGroups([]);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, false);
    fetchStories();
  }, [fetchPosts, fetchStories]);

  // Infinite scroll trigger
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
            hasMore &&
            !loadingPosts &&
            !loadingMore &&
            !loadingRef.current
          ) {
            loadingRef.current = true;
            fetchPosts(page + 1, true);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingPosts, loadingMore, page, fetchPosts]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (newPost: PostItem) => {
      setPosts((prev) => [newPost, ...prev]);
    };

    const handlePostDeleted = ({ postId }: { postId: number }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    const handleStoryNew = () => {
      fetchStories();
    };

    socket.on('feed:post:new', handleNewPost);
    socket.on('feed:post:deleted', handlePostDeleted);
    socket.on('story:new', handleStoryNew);

    return () => {
      socket.off('feed:post:new', handleNewPost);
      socket.off('feed:post:deleted', handlePostDeleted);
      socket.off('story:new', handleStoryNew);
    };
  }, [socket, fetchStories]);

  const handlePostCreated = (newPost: PostItem) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleStoryCreated = (_newStory: StoryItem) => {
    fetchStories();
  };

  return (
    <div className="feed-page-container">
      {/* 1. 24-Hour Stories Bar */}
      <StoryRail
        storyGroups={storyGroups}
        onOpenStory={(index) => setActiveStoryGroupIdx(index)}
        onAddStory={() => setIsCreatingStory(true)}
        loading={loadingStories}
      />

      {/* 2. Create Post Box */}
      <PostComposer onPostCreated={handlePostCreated} />

      {/* Error state */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="composer-media-btn"
            onClick={() => fetchPosts(1, false)}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* 3. Feed Posts Stream */}
      {loadingPosts ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="post-card"
              style={{ minHeight: '180px', opacity: 0.6 }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      width: '120px',
                      height: '14px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    style={{
                      width: '80px',
                      height: '10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  width: '90%',
                  height: '24px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                }}
              />
            </div>
          ))}
        </div>
      ) : (Array.isArray(posts) ? posts : []).length === 0 ? (
        /* Empty State */
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
              background: 'rgba(255, 51, 102, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-pink)',
            }}
          >
            <MessageSquarePlus size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Your feed is quiet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
              Connect with more people to discover updates, or be the first to share a post!
            </p>
          </div>
          <Link to="/discover">
            <button type="button" className="composer-submit-btn" style={{ marginTop: '8px' }}>
              <Compass size={16} /> Discover People
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(Array.isArray(posts) ? posts : []).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}

          {loadingMore && (
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              Loading more updates...
            </div>
          )}

          {!hasMore && (Array.isArray(posts) ? posts : []).length > 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              ✨ You're all caught up with the latest updates!
            </div>
          )}
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryGroupIdx !== null && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={activeStoryGroupIdx}
          onClose={() => setActiveStoryGroupIdx(null)}
          onStoryDeleted={() => fetchStories()}
        />
      )}

      {/* Story Composer Modal */}
      {isCreatingStory && (
        <StoryComposerModal
          onClose={() => setIsCreatingStory(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}
    </div>
  );
};

export default FeedPage;
