import React, { useState, useEffect } from 'react';
import { Save, BarChart3, ShieldCheck } from 'lucide-react';
import type {
  CommunityItem,
  CommunityAnalyticsData,
  CommunityVisibility,
  CommunityJoinPolicy,
  PostingPermission,
  EventCreationPermission,
} from '../../types/community';
import { CommunityService } from '../../services/community.service';

interface CommunitySettingsTabProps {
  community: CommunityItem;
  onRefresh: () => void;
}

export const CommunitySettingsTab: React.FC<CommunitySettingsTabProps> = ({ community, onRefresh }) => {
  const [description, setDescription] = useState(community.description || '');
  const [visibility, setVisibility] = useState<CommunityVisibility>(community.visibility);
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>(community.joinPolicy);
  const [postingPermission, setPostingPermission] = useState<PostingPermission>(community.postingPermission);
  const [eventCreationPermission, setEventCreationPermission] = useState<EventCreationPermission>(
    community.eventCreationPermission
  );
  const [rulesText, setRulesText] = useState(community.rulesText || '');
  const [isSaving, setIsSaving] = useState(false);
  const [analytics, setAnalytics] = useState<CommunityAnalyticsData | null>(null);

  useEffect(() => {
    CommunityService.getAnalytics(community.id)
      .then(setAnalytics)
      .catch((err) => console.warn('Could not load analytics', err));
  }, [community.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await CommunityService.updateCommunity(community.id, {
        description: description.trim(),
        visibility,
        joinPolicy,
        postingPermission,
        eventCreationPermission,
        rulesText: rulesText.trim(),
      });
      alert('Community settings updated successfully! ✅');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="community-settings-tab">
      {analytics && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#f43f5e" /> Community Insights & Analytics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="community-sidebar-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Total Members</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{analytics.totalMembers}</div>
            </div>
            <div className="community-sidebar-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Active Members</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{analytics.activeMembers}</div>
            </div>
            <div className="community-sidebar-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Total Posts</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{analytics.totalPosts}</div>
            </div>
            <div className="community-sidebar-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Events Created</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{analytics.totalEvents}</div>
            </div>
            <div className="community-sidebar-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Group Messages</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a855f7' }}>{analytics.totalMessages}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="community-sidebar-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#f43f5e" /> Manage Settings & Policies
        </h3>

        <div className="form-group-custom">
          <label>Community Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Introduce the community..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group-custom">
            <label>Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as CommunityVisibility)}
            >
              <option value="public">Public (Discoverable by everyone)</option>
              <option value="private">Private (Restricted to members)</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label>Join Policy</label>
            <select
              value={joinPolicy}
              onChange={(e) => setJoinPolicy(e.target.value as CommunityJoinPolicy)}
            >
              <option value="open">Open (Instant join)</option>
              <option value="request_to_join">Request to Join (Moderator review)</option>
              <option value="invite_only">Invite Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group-custom">
            <label>Posting Permissions</label>
            <select
              value={postingPermission}
              onChange={(e) => setPostingPermission(e.target.value as PostingPermission)}
            >
              <option value="all_members">All Members Can Post</option>
              <option value="moderators_only">Moderators & Admins Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label>Event Creation Permissions</label>
            <select
              value={eventCreationPermission}
              onChange={(e) => setEventCreationPermission(e.target.value as EventCreationPermission)}
            >
              <option value="all_members">All Members Can Host Events</option>
              <option value="moderators_only">Moderators & Admins Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>
        </div>

        <div className="form-group-custom">
          <label>Community Guidelines & Rules</label>
          <textarea
            rows={4}
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder="1. Be respectful to fellow members.&#10;2. No spam or commercial promotions.&#10;3. Keep posts relevant to the theme."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="submit" className="btn-primary-gradient" disabled={isSaving}>
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
