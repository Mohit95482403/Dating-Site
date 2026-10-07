import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';
import type { CommunityItem } from '../../types/community';
import type { PostItem } from '../../types/feed';
import { CommunityService } from '../../services/community.service';
import PostComposer from '../feed/PostComposer';
import PostCard from '../feed/PostCard';
import { useSocket } from '../../hooks/useSocket';

interface CommunityFeedTabProps {
  community: CommunityItem;
}

export const CommunityFeedTab: React.FC<CommunityFeedTabProps> = ({ community }) => {
  const { socket } = useSocket();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const membership = community.userMembership;
  const isMember = membership?.status === 'active';
  const role = membership?.role;

  // Determine posting permission
  const canPost =
    isMember &&
    (community.postingPermission === 'all_members' ||
      ((community.postingPermission === 'moderators_only' ||
        community.postingPermission === 'admins_only') &&
        (role === 'owner' || role === 'admin' || (community.postingPermission === 'moderators_only' && role === 'moderator'))));

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await CommunityService.getPosts(community.id);
      setPosts((res.posts || []) as unknown as PostItem[]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load community posts.');
    } finally {
      setIsLoading(false);
    }
  }, [community.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Real-time new post socket listener
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data: any) => {
      if (data?.communityId === community.id && data?.post) {
        setPosts((prev) => [data.post, ...prev]);
      }
    };

    socket.on('community:post_created', handleNewPost);
    return () => {
      socket.off('community:post_created', handleNewPost);
    };
  }, [socket, community.id]);

  const handlePostCreated = (newPost: PostItem) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="community-feed-tab">
      {canPost && (
        <div style={{ marginBottom: '24px' }}>
          <PostComposer communityId={community.id} onPostCreated={handlePostCreated} />
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          <p>Loading community discussion...</p>
        </div>
      ) : error ? (
        <div className="community-sidebar-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div
          className="community-sidebar-card"
          style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}
        >
          <MessageSquare size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.1rem' }}>No posts yet</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {canPost
              ? 'Be the first to share an update, start a conversation, or upload photos!'
              : 'Join this community to start conversations and interact with members.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
          ))}
        </div>
      )}
    </div>
  );
};
