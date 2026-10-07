import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Compass, Sparkles, RefreshCw, AlertCircle, Mail, Check, X } from 'lucide-react';
import type { CommunityItem, CommunityCategory, CommunityInviteItem } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { CommunityCard } from '../../components/communities/CommunityCard';
import { CreateCommunityModal } from '../../components/communities/CreateCommunityModal';
import '../../components/communities/communities.css';

export const CommunitiesExplorePage: React.FC = () => {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [recommended, setRecommended] = useState<CommunityItem[]>([]);
  const [invites, setInvites] = useState<CommunityInviteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 300ms Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [cats, recs, invs] = await Promise.allSettled([
        CommunityService.getCategories(),
        CommunityService.getRecommended(),
        CommunityService.getUserInvites(),
      ]);

      if (cats.status === 'fulfilled') setCategories(cats.value);
      if (recs.status === 'fulfilled') setRecommended(recs.value);
      if (invs.status === 'fulfilled') setInvites(invs.value);
    } catch (err) {
      console.error('Error fetching categories or recommendations', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load communities list based on category & search
  const loadCommunities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        limit: 30,
      };
      if (selectedCategorySlug !== 'all') {
        params.category = selectedCategorySlug;
      }
      if (debouncedQuery) {
        params.search = debouncedQuery;
      }

      const res = await CommunityService.getCommunities(params);
      setCommunities(res.communities || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load communities.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategorySlug, debouncedQuery]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleRespondInvite = async (inviteId: number, accept: boolean) => {
    try {
      await CommunityService.respondInvite(inviteId, accept);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      loadCommunities();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to respond to invite.');
    }
  };

  return (
    <div className="communities-container">
      {/* Hero Banner */}
      <div className="communities-hero">
        <div className="communities-hero-content">
          <div>
            <h1 className="communities-hero-title">Connectly Communities & Clubs</h1>
            <p className="communities-hero-subtitle">
              Discover vibrant interest circles, join local meetups, participate in group chats, and build lasting friendships.
            </p>
          </div>

          <div className="communities-hero-actions">
            <button className="btn-primary-gradient" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              <span>Create Community</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Invites Banner */}
      {invites.length > 0 && (
        <div
          className="community-sidebar-card"
          style={{
            borderColor: 'rgba(244, 63, 94, 0.4)',
            background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d6d', fontWeight: 700, marginBottom: '12px' }}>
            <Mail size={18} />
            <span>You have {invites.length} pending community invitation{invites.length > 1 ? 's' : ''}!</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invites.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{inv.inviterName}</span> invited you to join{' '}
                  <strong style={{ color: '#ff4d6d' }}>{inv.communityName}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary-gradient"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleRespondInvite(inv.id, true)}
                  >
                    <Check size={14} /> Join
                  </button>
                  <button
                    className="btn-outline-glass"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444' }}
                    onClick={() => handleRespondInvite(inv.id, false)}
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Communities Rail (if any) */}
      {recommended.length > 0 && !debouncedQuery && selectedCategorySlug === 'all' && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} color="#f59e0b" />
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: 0 }}>
              Recommended For Your Interests
            </h2>
          </div>
          <div className="communities-grid" style={{ marginBottom: 0 }}>
            {recommended.slice(0, 3).map((comm) => (
              <CommunityCard key={comm.id} community={comm} onMembershipChange={loadCommunities} />
            ))}
          </div>
        </div>
      )}

      {/* Search & Categories Bar */}
      <div className="communities-controls-bar">
        <div className="communities-search-input-wrap">
          <Search size={18} className="communities-search-icon" />
          <input
            type="text"
            className="communities-search-input"
            placeholder="Search communities by name, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search communities"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="categories-scroll-rail">
        <button
          className={`category-pill ${selectedCategorySlug === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategorySlug('all')}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-pill ${selectedCategorySlug === cat.slug ? 'active' : ''}`}
            onClick={() => setSelectedCategorySlug(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '1.1rem' }}>Discovering communities...</p>
        </div>
      ) : error ? (
        <div className="community-sidebar-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : communities.length === 0 ? (
        <div
          className="community-sidebar-card"
          style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}
        >
          <Compass size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No communities found</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>
            {debouncedQuery
              ? `No communities matching "${debouncedQuery}". Try another search or create one!`
              : 'Be the first to create a community for this topic!'}
          </p>
          <button className="btn-primary-gradient" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Create Community
          </button>
        </div>
      ) : (
        <div className="communities-grid">
          {communities.map((comm) => (
            <CommunityCard key={comm.id} community={comm} onMembershipChange={loadCommunities} />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateCommunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
      />
    </div>
  );
};
