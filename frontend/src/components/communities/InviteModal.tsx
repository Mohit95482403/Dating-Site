import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { CommunityService } from '../../services/community.service';
import { ExploreService } from '../../services/explore.service';

interface InviteModalProps {
  communityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ communityId, isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentUserIds, setSentUserIds] = useState<number[]>([]);
  const [sendingId, setSendingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const res = await ExploreService.search({ q: query.trim(), type: 'people', limit: 10 });
      setResults(res.people || []);
    } catch (err) {
      console.error('Failed to search people for invite', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async (userId: number) => {
    try {
      setSendingId(userId);
      await CommunityService.sendInvite(communityId, userId);
      setSentUserIds((prev) => [...prev, userId]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send invite.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div className="community-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="community-modal-title">
          <span>Invite Friends to Community</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div className="communities-search-input-wrap" style={{ flex: 1 }}>
            <Search size={16} className="communities-search-icon" />
            <input
              type="text"
              className="communities-search-input"
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary-gradient" disabled={isSearching}>
            {isSearching ? '...' : 'Search'}
          </button>
        </form>

        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {results.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', margin: '20px 0' }}>
              Search for users on Connectly to invite them to this group.
            </p>
          ) : (
            results.map((person) => {
              const isSent = sentUserIds.includes(person.id);
              return (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                >
                  <div>
                    <h5 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>{person.fullName}</h5>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>@{person.username}</span>
                  </div>

                  <button
                    className="btn-primary-gradient"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleSendInvite(person.id)}
                    disabled={isSent || sendingId === person.id}
                  >
                    {isSent ? 'Invited ✓' : sendingId === person.id ? 'Sending...' : 'Invite'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
