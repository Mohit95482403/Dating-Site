import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Check, X, Ban, RefreshCw } from 'lucide-react';
import type { CommunityItem, CommunityMemberItem, MemberRole } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { getMediaUrl } from '../../utils/media';

interface CommunityMembersTabProps {
  community: CommunityItem;
  onRefresh: () => void;
}

export const CommunityMembersTab: React.FC<CommunityMembersTabProps> = ({ community, onRefresh }) => {
  const [members, setMembers] = useState<CommunityMemberItem[]>([]);
  const [pendingMembers, setPendingMembers] = useState<CommunityMemberItem[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const membership = community.userMembership;
  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin' || isOwner;
  const isModerator = membership?.role === 'moderator' || isAdmin;

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await CommunityService.getMembers(community.id, {
        status: 'active',
        search: search.trim() || undefined,
      });
      setMembers(res.members || []);

      if (isModerator) {
        const pendingRes = await CommunityService.getMembers(community.id, { status: 'pending' });
        setPendingMembers(pendingRes.members || []);
      }
    } catch (err: any) {
      console.error('Failed to load community members', err);
    } finally {
      setIsLoading(false);
    }
  }, [community.id, search, isModerator]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleApprove = async (userId: number) => {
    try {
      setActionLoadingId(userId);
      await CommunityService.approveJoinRequest(community.id, userId);
      setPendingMembers((prev) => prev.filter((m) => m.userId !== userId));
      loadMembers();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve member.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId: number) => {
    try {
      setActionLoadingId(userId);
      await CommunityService.rejectJoinRequest(community.id, userId);
      setPendingMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId: number, role: MemberRole) => {
    try {
      setActionLoadingId(userId);
      await CommunityService.updateMemberRole(community.id, userId, role);
      loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBan = async (userId: number) => {
    const reason = prompt('Reason for banishing member from this community:');
    if (reason === null) return;

    try {
      setActionLoadingId(userId);
      await CommunityService.banMember(community.id, userId, reason || 'Violation of community guidelines');
      loadMembers();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to ban member.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return (
          <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
            OWNER
          </span>
        );
      case 'admin':
        return (
          <span style={{ background: '#e11d48', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            ADMIN
          </span>
        );
      case 'moderator':
        return (
          <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            MOD
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="community-members-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-outline-glass ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Users size={16} />
            <span>Active Members ({members.length})</span>
          </button>

          {isModerator && pendingMembers.length > 0 && (
            <button
              className={`btn-outline-glass ${activeTab === 'pending' ? 'active' : ''}`}
              style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              onClick={() => setActiveTab('pending')}
            >
              Pending Requests ({pendingMembers.length})
            </button>
          )}
        </div>

        <div className="communities-search-input-wrap" style={{ maxWidth: '280px' }}>
          <Search size={16} className="communities-search-icon" />
          <input
            type="text"
            className="communities-search-input"
            placeholder="Filter members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          <p>Loading member directory...</p>
        </div>
      ) : activeTab === 'pending' ? (
        <div>
          {pendingMembers.length === 0 ? (
            <div className="community-sidebar-card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No pending join requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingMembers.map((item) => (
                <div
                  key={item.id}
                  className="community-sidebar-card"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', margin: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="community-card-avatar" style={{ position: 'static', width: '42px', height: '42px' }}>
                      {item.user.avatarUrl ? (
                        <img src={getMediaUrl(item.user.avatarUrl)} alt={item.user.fullName} />
                      ) : (
                        item.user.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', color: '#fff', fontSize: '0.95rem' }}>
                        {item.user.fullName}
                      </h4>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>
                        @{item.user.username}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary-gradient"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => handleApprove(item.userId)}
                      disabled={actionLoadingId === item.userId}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      className="btn-outline-glass"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}
                      onClick={() => handleReject(item.userId)}
                      disabled={actionLoadingId === item.userId}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {members.map((item) => {
            const canManageThisUser =
              isOwner || (isAdmin && item.role !== 'owner' && item.role !== 'admin');

            return (
              <div
                key={item.id}
                className="community-sidebar-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', margin: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="community-card-avatar" style={{ position: 'static', width: '44px', height: '44px' }}>
                      {item.user.avatarUrl ? (
                        <img src={getMediaUrl(item.user.avatarUrl)} alt={item.user.fullName} />
                      ) : (
                        item.user.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', color: '#fff', fontSize: '0.95rem' }}>
                        {item.user.fullName}
                      </h4>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>
                        @{item.user.username}
                      </p>
                    </div>
                  </div>

                  {getRoleBadge(item.role)}
                </div>

                {canManageThisUser && item.userId !== community.creatorId && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '10px',
                    }}
                  >
                    {isOwner && (
                      <select
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          padding: '4px 6px',
                        }}
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.userId, e.target.value as MemberRole)}
                        disabled={actionLoadingId === item.userId}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}

                    <button
                      className="btn-outline-glass"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                      title="Ban member"
                      onClick={() => handleBan(item.userId)}
                      disabled={actionLoadingId === item.userId}
                    >
                      <Ban size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
