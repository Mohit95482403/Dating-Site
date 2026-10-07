import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Lock, Globe, Zap, ArrowRight, Check } from 'lucide-react';
import type { CommunityItem } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { getMediaUrl } from '../../utils/media';

interface CommunityCardProps {
  community: CommunityItem;
  onMembershipChange?: (communityId: number, status: string) => void;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({ community, onMembershipChange }) => {
  const [isJoining, setIsJoining] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(
    community.userMembership?.status || null
  );

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (membershipStatus === 'active') return;

    try {
      setIsJoining(true);
      const res = await CommunityService.joinCommunity(community.id);
      setMembershipStatus(res.status);
      if (onMembershipChange) {
        onMembershipChange(community.id, res.status);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join community.');
    } finally {
      setIsJoining(false);
    }
  };

  const isMember = membershipStatus === 'active';
  const isPending = membershipStatus === 'pending';

  return (
    <div className="community-card">
      <div
        className="community-card-cover"
        style={{
          backgroundImage: community.coverImage ? `url(${getMediaUrl(community.coverImage)})` : undefined,
        }}
      >
        <div className="community-card-cover-overlay" />

        {community.isBoosted && (
          <div className="community-card-boost-badge">
            <Zap size={11} fill="currentColor" /> Boosted
          </div>
        )}

        <div className="community-card-privacy-badge">
          {community.visibility === 'private' ? (
            <>
              <Lock size={11} /> Private
            </>
          ) : (
            <>
              <Globe size={11} /> Public
            </>
          )}
        </div>

        <div className="community-card-avatar">
          {community.avatarImage ? (
            <img src={getMediaUrl(community.avatarImage)} alt={community.name} />
          ) : (
            community.name.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      <div className="community-card-body">
        {community.categoryName && (
          <div className="community-card-category">{community.categoryName}</div>
        )}

        <h3 className="community-card-title">{community.name}</h3>

        <p className="community-card-desc">
          {community.description || 'Welcome to our vibrant group! Join to connect, share, and attend meetups.'}
        </p>

        <div className="community-card-stats">
          <div className="community-card-stat">
            <Users size={14} />
            <span>{community.memberCount} members</span>
          </div>
          <div className="community-card-stat">
            <span>•</span>
            <span>{community.postCount} posts</span>
          </div>
          {community.eventCount > 0 && (
            <div className="community-card-stat">
              <span>•</span>
              <span>{community.eventCount} events</span>
            </div>
          )}
        </div>

        <div className="community-card-footer">
          <Link
            to={`/communities/${community.slug}`}
            className="btn-outline-glass"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <span>View</span>
            <ArrowRight size={14} />
          </Link>

          {isMember ? (
            <button className="btn-outline-glass" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', flex: 1, justifyContent: 'center' }} disabled>
              <Check size={14} /> Joined
            </button>
          ) : isPending ? (
            <button className="btn-outline-glass" style={{ color: '#f59e0b', flex: 1, justifyContent: 'center' }} disabled>
              Pending
            </button>
          ) : (
            <button
              className="btn-primary-gradient"
              onClick={handleJoin}
              disabled={isJoining}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {isJoining ? 'Joining...' : community.joinPolicy === 'request_to_join' ? 'Request' : 'Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
