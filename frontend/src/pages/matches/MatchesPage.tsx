import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import matchService from '../../services/match.service';
import type { MatchItem } from '../../types/match';
import MatchGrid from '../../components/matches/MatchGrid';
import MatchSkeleton from '../../components/matches/MatchSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { Heart, Search, RefreshCw, Sparkles, Compass } from 'lucide-react';
import '../../components/matches/Matches.css';

export const MatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { setMatchCount, refreshMatchCount } = useSocket();

  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await matchService.getMatches();
      setMatches(data.matches || []);
      setMatchCount(data.count ?? data.matches.length);
    } catch (err: any) {
      console.error('Failed to fetch matches:', err);
      setError(
        err?.response?.data?.message ||
        'Unable to load your matches at the moment. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setMatchCount]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Listen to real-time socket events triggered by SocketContext
  useEffect(() => {
    const handleNewMatchEvent = () => {
      fetchMatches(true);
      refreshMatchCount();
    };

    const handleUnmatchEvent = () => {
      fetchMatches(true);
      refreshMatchCount();
    };

    window.addEventListener('connectly:new-match', handleNewMatchEvent);
    window.addEventListener('connectly:unmatched', handleUnmatchEvent);

    return () => {
      window.removeEventListener('connectly:new-match', handleNewMatchEvent);
      window.removeEventListener('connectly:unmatched', handleUnmatchEvent);
    };
  }, [fetchMatches, refreshMatchCount]);

  // Client-side search filtering by first name
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase().trim();
    return matches.filter((m) =>
      m.user.firstName.toLowerCase().includes(q) ||
      (m.user.lastName && m.user.lastName.toLowerCase().includes(q))
    );
  }, [matches, searchQuery]);

  return (
    <div className="matches-page-container">
      {/* Page Header */}
      <div className="matches-header">
        <div className="matches-title-wrap">
          <div className="matches-badge-pill">
            <Sparkles size={14} />
            <span>Mutual Connections</span>
          </div>
          <h1 className="matches-main-heading">
            Your Matches
            {!loading && (
              <span className="matches-count-counter">
                ({matches.length})
              </span>
            )}
          </h1>
          <p className="matches-subheading">
            People who liked you back. Start a conversation and see where it goes.
          </p>
        </div>

        {/* Search & Refresh Actions */}
        <div className="matches-controls-bar">
          <div className="matches-search-wrap">
            <Search size={16} className="matches-search-icon" />
            <input
              type="text"
              placeholder="Search matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="matches-search-input"
              aria-label="Search matches by name"
            />
          </div>

          <button
            type="button"
            className={`matches-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchMatches(true)}
            disabled={loading || refreshing}
            aria-label="Refresh match list"
            title="Refresh match list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <MatchSkeleton count={8} />
      ) : error ? (
        /* Error State */
        <div className="matches-empty-state">
          <div className="matches-empty-icon">
            <RefreshCw size={36} />
          </div>
          <h2 className="matches-empty-title">Unable to load your matches</h2>
          <p className="matches-empty-desc">{error}</p>
          <button
            type="button"
            className="matches-empty-btn"
            onClick={() => fetchMatches(false)}
          >
            <RefreshCw size={18} />
            <span>Try Again</span>
          </button>
        </div>
      ) : matches.length === 0 ? (
        /* Empty State */
        <div className="matches-empty-state">
          <div className="matches-empty-icon">
            <Heart size={40} />
          </div>
          <h2 className="matches-empty-title">✨ No matches yet</h2>
          <p className="matches-empty-desc">
            Keep exploring. Your next connection could be one swipe away.
          </p>
          <Link to="/discover" className="matches-empty-btn">
            <Compass size={18} />
            <span>Discover People</span>
          </Link>
        </div>
      ) : filteredMatches.length === 0 ? (
        /* No Search Matches */
        <div className="matches-empty-state">
          <div className="matches-empty-icon">
            <Search size={36} />
          </div>
          <h2 className="matches-empty-title">No matching names found</h2>
          <p className="matches-empty-desc">
            No active matches matched "{searchQuery}". Try clearing your search query.
          </p>
          <button
            type="button"
            className="matches-empty-btn"
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Matches Grid */
        <MatchGrid matches={filteredMatches} />
      )}
    </div>
  );
};

export default MatchesPage;
