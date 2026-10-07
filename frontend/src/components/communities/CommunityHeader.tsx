import React, { useState } from 'react';
import { Users, Lock, Globe, Zap, UserPlus, LogOut, Share2, ShieldAlert } from 'lucide-react';
import type { CommunityItem } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { getMediaUrl } from '../../utils/media';

interface CommunityHeaderProps {
  community: CommunityItem;
  onRefresh: () => void;
  onOpenInvite: () => void;
  onOpenReport: () => void;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  community,
  onRefresh,
  onOpenInvite,
  onOpenReport,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const membership = community.userMembership;
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin';

  const handleJoin = async () => {
    try {
      setIsActionLoading(true);
      await CommunityService.joinCommunity(community.id);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join community.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this community?')) return;
    try {
      setIsActionLoading(true);
      await CommunityService.leaveCommunity(community.id);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to leave community.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBoost = async () => {
    try {
      setIsActionLoading(true);
      await CommunityService.boostCommunity(community.id);
      alert('Community successfully boosted for 7 days! 🚀');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to boost community. Premium required.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Community link copied to clipboard!');
    }
  };

  return (
    <div className="community-detail-header">
      <div
        className="community-detail-cover"
        style={{
          backgroundImage: community.coverImage ? `url(${getMediaUrl(community.coverImage)})` : undefined,
        }}
      />

      <div className="community-detail-header-body">
        <div className="community-detail-avatar-wrap">
          <div className="community-detail-avatar">
            {community.avatarImage ? (
              <img src={getMediaUrl(community.avatarImage)} alt={community.name} />
            ) : (
              community.name.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isMember ? (
              <>
                <button className="btn-outline-glass" onClick={onOpenInvite} title="Invite Friends">
                  <UserPlus size={16} />
                  <span>Invite</span>
                </button>

                {isOwnerOrAdmin && !community.isBoosted && (
                  <button
                    className="btn-outline-glass"
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
                    onClick={handleBoost}
                    disabled={isActionLoading}
                  >
                    <Zap size={16} />
                    <span>Boost</span>
                  </button>
                )}

                <button
                  className="btn-outline-glass"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  onClick={handleLeave}
                  disabled={isActionLoading}
                >
                  <LogOut size={16} />
                  <span>Leave</span>
                </button>
              </>
            ) : isPending ? (
              <button className="btn-outline-glass" style={{ color: '#f59e0b' }} disabled>
                Join Request Pending
              </button>
            ) : (
              <button className="btn-primary-gradient" onClick={handleJoin} disabled={isActionLoading}>
                {community.joinPolicy === 'request_to_join' ? 'Request to Join' : 'Join Community'}
              </button>
            )}

            <button className="btn-outline-glass" onClick={handleShare} title="Share Community">
              <Share2 size={16} />
            </button>

            <button className="btn-outline-glass" onClick={onOpenReport} title="Report Community">
              <ShieldAlert size={16} />
            </button>
          </div>
        </div>

        <div className="community-detail-info">
          <h1 className="community-detail-title">
            <span>{community.name}</span>
            {community.isBoosted && (
              <span className="community-card-boost-badge" style={{ position: 'static' }}>
                <Zap size={11} fill="currentColor" /> Boosted
              </span>
            )}
          </h1>

          <div className="community-detail-meta">
            {community.categoryName && (
              <span style={{ color: '#f43f5e', fontWeight: 600 }}>#{community.categoryName}</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {community.visibility === 'private' ? (
                <>
                  <Lock size={14} /> Private Group
                </>
              ) : (
                <>
                  <Globe size={14} /> Public Community
                </>
              )}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} /> {community.memberCount} members
            </span>
            {membership?.role && (
              <span
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#ff4d6d',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {membership.role}
              </span>
            )}
          </div>

          <p className="community-detail-desc">{community.description}</p>
        </div>
      </div>
    </div>
  );
};
