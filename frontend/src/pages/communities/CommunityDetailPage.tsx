import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Calendar,
  Users,
  MessageCircle,
  Settings,
  Lock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import type { CommunityItem } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { CommunityHeader } from '../../components/communities/CommunityHeader';
import { CommunityFeedTab } from '../../components/communities/CommunityFeedTab';
import { CommunityEventsTab } from '../../components/communities/CommunityEventsTab';
import { CommunityMembersTab } from '../../components/communities/CommunityMembersTab';
import { CommunityChatTab } from '../../components/communities/CommunityChatTab';
import { CommunitySettingsTab } from '../../components/communities/CommunitySettingsTab';
import { InviteModal } from '../../components/communities/InviteModal';
import { ReportModal } from '../../components/communities/ReportModal';
import '../../components/communities/communities.css';

type TabKey = 'posts' | 'events' | 'members' | 'chat' | 'settings';

export const CommunityDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<CommunityItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadCommunity = useCallback(async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await CommunityService.getCommunityBySlug(slug);
      setCommunity(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load community.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  if (isLoading) {
    return (
      <div className="communities-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <RefreshCw className="animate-spin" size={36} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: '#fff', fontSize: '1.2rem' }}>Loading Community...</h2>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="communities-container" style={{ padding: '60px 20px', maxWidth: '600px' }}>
        <div className="community-sidebar-card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', margin: '0 0 10px 0' }}>Community Not Found</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 24px 0' }}>{error || 'This community does not exist or has been archived.'}</p>
          <Link to="/explore/communities" className="btn-primary-gradient">
            Browse Communities
          </Link>
        </div>
      </div>
    );
  }

  const membership = community.userMembership;
  const isMember = membership?.status === 'active';
  const isStaff = membership?.role === 'owner' || membership?.role === 'admin';
  const isPrivateGated = community.visibility === 'private' && !isMember;

  return (
    <div className="communities-container">
      {/* Community Header */}
      <CommunityHeader
        community={community}
        onRefresh={loadCommunity}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* Tabs Bar */}
      <div className="community-tabs-nav" style={{ marginBottom: '24px' }}>
        <button
          className={`community-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <MessageSquare size={16} />
          <span>Posts & Discussion</span>
        </button>

        <button
          className={`community-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Calendar size={16} />
          <span>Meetups & Events ({community.eventCount})</span>
        </button>

        <button
          className={`community-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={16} />
          <span>Members ({community.memberCount})</span>
        </button>

        {isMember && (
          <button
            className={`community-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageCircle size={16} />
            <span>Group Chat</span>
          </button>
        )}

        {isStaff && (
          <button
            className={`community-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Settings & Insights</span>
          </button>
        )}
      </div>

      {/* Private Community Gatekeeper */}
      {isPrivateGated ? (
        <div className="community-sidebar-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Lock size={44} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#ffffff', fontSize: '1.4rem', margin: '0 0 10px 0' }}>
            This Community is Private
          </h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Posts, events, member lists, and group chats are protected and only visible to verified members.
          </p>
          {membership?.status === 'pending' ? (
            <p style={{ color: '#f59e0b', fontWeight: 600 }}>Your join request is awaiting moderator approval.</p>
          ) : (
            <button
              className="btn-primary-gradient"
              onClick={async () => {
                await CommunityService.joinCommunity(community.id);
                loadCommunity();
              }}
            >
              {community.joinPolicy === 'request_to_join' ? 'Request to Join Group' : 'Join Group to View'}
            </button>
          )}
        </div>
      ) : (
        /* Community Main Content + Sidebar Grid */
        <div className="community-layout-grid">
          <div>
            {activeTab === 'posts' && <CommunityFeedTab community={community} />}
            {activeTab === 'events' && <CommunityEventsTab community={community} />}
            {activeTab === 'members' && <CommunityMembersTab community={community} onRefresh={loadCommunity} />}
            {activeTab === 'chat' && <CommunityChatTab community={community} />}
            {activeTab === 'settings' && isStaff && (
              <CommunitySettingsTab community={community} onRefresh={loadCommunity} />
            )}
          </div>

          {/* Right Sidebar */}
          <div>
            {/* About Card */}
            <div className="community-sidebar-card">
              <h4 className="community-sidebar-title">
                <BookOpen size={16} color="#f43f5e" /> About This Community
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {community.description || 'Welcome to our community! Connect, discuss, and make memories.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Category:</strong> {community.categoryName || 'General'}
                </div>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Join Policy:</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>
                    {community.joinPolicy.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Founded:</strong>{' '}
                  {new Date(community.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Rules Card */}
            {community.rulesText && (
              <div className="community-sidebar-card">
                <h4 className="community-sidebar-title">
                  <ShieldCheck size={16} color="#10b981" /> Community Guidelines
                </h4>
                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {community.rulesText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteModal
        communityId={community.id}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <ReportModal
        communityId={community.id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
