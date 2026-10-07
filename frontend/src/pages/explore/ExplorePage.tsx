import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Users, Hash, Tag, AlertCircle, RefreshCw } from 'lucide-react';
import { ExploreSearchBar } from '../../components/explore/ExploreSearchBar';
import { TrendingRail } from '../../components/explore/TrendingRail';
import { SuggestedPeopleRail } from '../../components/explore/SuggestedPeopleRail';
import { ExplorePostGrid } from '../../components/explore/ExplorePostGrid';
import { FilterDrawer } from '../../components/explore/FilterDrawer';
import { ExploreService } from '../../services/explore.service';
import { useSocket } from '../../hooks/useSocket';
import { getMediaUrl } from '../../utils/media';
import type {
  SearchType,
  GlobalSearchResponse,
  TrendingResponse,
  SearchResultProfile,
  SearchHistoryItem,
  PeopleFilterParams,
} from '../../types/explore';
import '../../components/explore/explore.css';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Discovery data state
  const [trending, setTrending] = useState<TrendingResponse | null>(null);
  const [suggestedPeople, setSuggestedPeople] = useState<SearchResultProfile[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<SearchResultProfile[]>([]);
  const [isFilteredView, setIsFilteredView] = useState(false);

  // Loading states
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(true);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<PeopleFilterParams>({});

  // 300ms Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load initial explore data (trending, suggested, search history)
  const loadInitialData = useCallback(async () => {
    setIsLoadingTrending(true);
    setIsLoadingSuggested(true);
    setErrorMessage(null);

    try {
      const [trendingData, suggestedData, historyData] = await Promise.allSettled([
        ExploreService.getTrending(),
        ExploreService.getSuggestedPeople(),
        ExploreService.getSearchHistory(),
      ]);

      if (trendingData.status === 'fulfilled') {
        setTrending(trendingData.value);
      }
      if (suggestedData.status === 'fulfilled') {
        setSuggestedPeople(suggestedData.value.profiles);
      }
      if (historyData.status === 'fulfilled') {
        setHistory(historyData.value);
      }
    } catch (err: any) {
      console.error('[ExplorePage] Error loading initial explore data:', err);
      setErrorMessage('Failed to load explore content. Please try again.');
    } finally {
      setIsLoadingTrending(false);
      setIsLoadingSuggested(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-time Socket.IO updates for explore content
  useEffect(() => {
    if (!socket) return;

    const handleExploreUpdate = () => {
      ExploreService.getTrending()
        .then((t) => setTrending(t))
        .catch(() => {});
    };

    socket.on('explore:content-updated', handleExploreUpdate);
    socket.on('trending:updated', handleExploreUpdate);

    return () => {
      socket.off('explore:content-updated', handleExploreUpdate);
      socket.off('trending:updated', handleExploreUpdate);
    };
  }, [socket]);

  // Perform search when debounced query or activeType changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    ExploreService.search({
      q: debouncedQuery,
      type: activeType,
    })
      .then((res) => {
        if (isMounted) {
          setSearchResults(res);
          // Refresh search history list quietly
          ExploreService.getSearchHistory().then(setHistory).catch(() => {});
        }
      })
      .catch((err) => {
        console.error('[ExplorePage] Search error:', err);
      })
      .finally(() => {
        if (isMounted) setIsSearching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, activeType]);

  // History handlers
  const handleSelectHistory = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setActiveType(item.searchType || 'all');
  };

  const handleRemoveHistory = async (id: number) => {
    try {
      await ExploreService.removeSearchHistoryItem(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('[ExplorePage] Failed to remove history item:', err);
    }
  };

  const handleClearHistory = async () => {
    try {
      await ExploreService.clearSearchHistory();
      setHistory([]);
    } catch (err) {
      console.error('[ExplorePage] Failed to clear history:', err);
    }
  };

  // Filter application handler
  const handleApplyFilters = async (filters: PeopleFilterParams) => {
    setActiveFilters(filters);
    setIsLoadingFiltered(true);
    setIsFilteredView(true);
    try {
      const result = await ExploreService.getFilteredPeople(filters);
      setFilteredPeople(result.profiles);
    } catch (err: any) {
      console.error('[ExplorePage] Failed to apply filters:', err);
    } finally {
      setIsLoadingFiltered(false);
    }
  };

  const handleResetFilters = () => {
    setActiveFilters({});
    setIsFilteredView(false);
    setFilteredPeople([]);
  };

  const hasActiveFiltersCount = Object.keys(activeFilters).filter((k) => {
    const val = (activeFilters as any)[k];
    return val !== undefined && val !== false && val !== 'all' && (Array.isArray(val) ? val.length > 0 : true);
  }).length;

  return (
    <div className="explore-page-root">
      {/* Header */}
      <header className="explore-hero-header">
        <h1 className="explore-page-title">Explore Connectly</h1>
        <p className="explore-page-subtitle">
          Discover compatible people, trending topics, and engaging content
        </p>
      </header>

      {/* Global Search Bar with debouncing and category tabs */}
      <ExploreSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        activeType={activeType}
        onTypeChange={setActiveType}
        history={history}
        onSelectHistory={handleSelectHistory}
        onRemoveHistory={handleRemoveHistory}
        onClearHistory={handleClearHistory}
        isLoading={isSearching}
      />

      {/* Toolbar (Filters toggle, status) */}
      <div className="explore-toolbar">
        <button
          type="button"
          className="btn-open-filters"
          onClick={() => setIsFilterOpen(true)}
          aria-label="Open discovery filters"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {hasActiveFiltersCount > 0 && (
            <span className="filter-active-count-badge">{hasActiveFiltersCount}</span>
          )}
        </button>

        <button
          type="button"
          className="btn-open-filters"
          onClick={() => navigate('/explore/communities')}
          style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: '#f43f5e' }}
        >
          <Users size={16} />
          <span>Communities</span>
        </button>

        {debouncedQuery && searchResults && (
          <span className="results-stats-indicator">
            {searchResults.totalMatches} results for "{debouncedQuery}"
          </span>
        )}

        {isFilteredView && (
          <span className="results-stats-indicator">
            Showing filtered people ({filteredPeople.length})
          </span>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={activeFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="explore-error-banner glass-panel">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button type="button" onClick={loadInitialData} className="btn-retry">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ────────────────── VIEW A: ACTIVE FILTERED PEOPLE VIEW ────────────────── */}
      {isFilteredView && (
        <div className="search-category-group">
          <div className="section-header">
            <div className="title-with-icon">
              <Users size={18} className="section-icon accent-pink" />
              <h2 className="section-title">Filtered People Discovery</h2>
            </div>
            <button
              type="button"
              className="btn-card-action"
              onClick={handleResetFilters}
              style={{ padding: '4px 12px' }}
            >
              Clear Filters
            </button>
          </div>

          {isLoadingFiltered ? (
            <div className="suggested-cards-scroll">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="suggested-card-skeleton skeleton-pulse" />
              ))}
            </div>
          ) : filteredPeople.length > 0 ? (
            <div className="search-people-list">
              {filteredPeople.map((person) => (
                <div
                  key={person.userId}
                  className="search-person-card glass-panel"
                  onClick={() => navigate(`/profile/${person.userId}`)}
                >
                  {person.photoUrl ? (
                    <img
                      src={getMediaUrl(person.photoUrl)}
                      alt={person.firstName}
                      className="search-person-avatar"
                    />
                  ) : (
                    <div className="search-person-avatar-placeholder">
                      {person.firstName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="search-person-meta">
                    <div className="search-person-name">
                      {person.firstName}{person.age ? `, ${person.age}` : ''}
                      {person.isVerified && <span className="verified-icon">✓</span>}
                    </div>
                    {person.locationCity && (
                      <div className="search-person-sub">{person.locationCity}</div>
                    )}
                    {person.interests && person.interests.length > 0 && (
                      <div className="search-person-interests">
                        {person.interests.slice(0, 2).map((int, i) => (
                          <span key={i} className="mini-interest-tag">{int}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="explore-empty-posts glass-panel">
              <Users size={24} className="empty-icon" />
              <p className="empty-text">No people match your current filters. Try expanding age or location!</p>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── VIEW B: SEARCH RESULTS VIEW ────────────────── */}
      {debouncedQuery && searchResults && !isFilteredView && (
        <div className="search-results-section">
          {/* People Matches */}
          {(activeType === 'all' || activeType === 'people') && searchResults.people.length > 0 && (
            <div className="search-category-group">
              <div className="section-header">
                <div className="title-with-icon">
                  <Users size={18} className="section-icon accent-pink" />
                  <h2 className="section-title">People ({searchResults.people.length})</h2>
                </div>
              </div>
              <div className="search-people-list">
                {searchResults.people.map((person) => (
                  <div
                    key={person.userId}
                    className="search-person-card glass-panel"
                    onClick={() => navigate(`/profile/${person.userId}`)}
                  >
                    {person.photoUrl ? (
                      <img
                        src={getMediaUrl(person.photoUrl)}
                        alt={person.firstName}
                        className="search-person-avatar"
                      />
                    ) : (
                      <div className="search-person-avatar-placeholder">
                        {person.firstName?.[0] || 'U'}
                      </div>
                    )}
                    <div className="search-person-meta">
                      <div className="search-person-name">
                        {person.firstName}{person.age ? `, ${person.age}` : ''}
                        {person.isVerified && <span className="verified-icon">✓</span>}
                      </div>
                      {person.locationCity && (
                        <div className="search-person-sub">{person.locationCity}</div>
                      )}
                      {person.interests && person.interests.length > 0 && (
                        <div className="search-person-interests">
                          {person.interests.slice(0, 2).map((int, i) => (
                            <span key={i} className="mini-interest-tag">{int}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags Matches */}
          {(activeType === 'all' || activeType === 'hashtags') && searchResults.hashtags.length > 0 && (
            <div className="search-category-group">
              <div className="section-header">
                <div className="title-with-icon">
                  <Hash size={18} className="section-icon accent-pink" />
                  <h2 className="section-title">Hashtags ({searchResults.hashtags.length})</h2>
                </div>
              </div>
              <div className="search-hashtags-list">
                {searchResults.hashtags.map((ht) => (
                  <div
                    key={ht.id}
                    className="search-hashtag-card glass-panel"
                    onClick={() => navigate(`/hashtag/${encodeURIComponent(ht.name)}`)}
                  >
                    <div>
                      <span className="trending-tag-name">#{ht.name}</span>
                      <div className="trending-post-count">{ht.postsCount} posts</div>
                    </div>
                    {ht.trendBadge && (
                      <span className={`trend-badge badge-${ht.trendBadge.toLowerCase().replace(/[^a-z]/g, '')}`}>
                        {ht.trendBadge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interests Matches */}
          {(activeType === 'all' || activeType === 'interests') && searchResults.interests.length > 0 && (
            <div className="search-category-group">
              <div className="section-header">
                <div className="title-with-icon">
                  <Tag size={18} className="section-icon accent-pink" />
                  <h2 className="section-title">Interests ({searchResults.interests.length})</h2>
                </div>
              </div>
              <div className="search-interests-list">
                {searchResults.interests.map((int) => (
                  <div key={int.id} className="search-interest-card glass-panel">
                    <span className="search-interest-name">{int.name}</span>
                    <span className="search-interest-count">{int.profilesCount} profiles</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Matches */}
          {(activeType === 'all' || activeType === 'posts') && (
            <ExplorePostGrid
              posts={searchResults.posts}
              isLoading={isSearching}
              title={`Posts (${searchResults.posts.length})`}
            />
          )}

          {/* No results state */}
          {searchResults.totalMatches === 0 && !isSearching && (
            <div className="explore-empty-posts glass-panel">
              <AlertCircle size={28} className="empty-icon" />
              <p className="empty-text">No results found for "{debouncedQuery}".</p>
              <p className="section-subtitle">Try searching for a different keyword or hashtag.</p>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── VIEW C: DEFAULT EXPLORE DISCOVERY HUB ────────────────── */}
      {!debouncedQuery && !isFilteredView && (
        <>
          {/* Trending Rail */}
          <TrendingRail
            hashtags={trending?.hashtags || []}
            isLoading={isLoadingTrending}
            onTagClick={(tag) => navigate(`/hashtag/${encodeURIComponent(tag)}`)}
          />

          {/* Suggested For You (Multi-signal Recommendations) */}
          <SuggestedPeopleRail
            profiles={suggestedPeople}
            isLoading={isLoadingSuggested}
          />

          {/* Trending & Popular Posts Grid */}
          <ExplorePostGrid
            posts={trending?.posts || []}
            isLoading={isLoadingTrending}
            title="Trending & Popular Content"
          />
        </>
      )}
    </div>
  );
};

export default ExplorePage;
