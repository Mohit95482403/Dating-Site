import React, { useState } from 'react';
import { SlidersHorizontal, X, Lock, Check, Sparkles, RotateCcw } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import type { PeopleFilterParams, ExploreSortOption } from '../../types/explore';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PeopleFilterParams;
  onApply: (newFilters: PeopleFilterParams) => void;
  onReset: () => void;
}

const COMMON_INTERESTS = [
  'Travel',
  'Music',
  'Photography',
  'Gaming',
  'Fitness',
  'Movies',
  'Reading',
  'Cooking',
  'Technology',
  'Art',
  'Sports',
  'Dancing',
  'Food',
  'Coding',
  'Adventure',
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const { hasFeature, openUpgradeModal } = useSubscription();
  const canUseAdvanced = hasFeature('ADVANCED_FILTERS');

  // Local filter drafts
  const [minAge, setMinAge] = useState<number>(filters.minAge || 18);
  const [maxAge, setMaxAge] = useState<number>(filters.maxAge || 60);
  const [city, setCity] = useState<string>(filters.city || '');
  const [gender, setGender] = useState<string>(filters.gender || 'all');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(filters.interests || []);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(Boolean(filters.verifiedOnly));
  const [onlineOnly, setOnlineOnly] = useState<boolean>(Boolean(filters.onlineOnly));
  const [hasPhoto, setHasPhoto] = useState<boolean>(Boolean(filters.hasPhoto));
  const [sort, setSort] = useState<ExploreSortOption>(filters.sort || 'recommended');

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleVerifiedClick = () => {
    if (!canUseAdvanced) {
      openUpgradeModal(
        'ADVANCED_FILTERS',
        'Verified Member Discovery',
        'Filter discovery exclusively by verified authentic profiles with Connectly Premium.'
      );
      return;
    }
    setVerifiedOnly(!verifiedOnly);
  };

  const handleOnlineClick = () => {
    if (!canUseAdvanced) {
      openUpgradeModal(
        'ADVANCED_FILTERS',
        'Real-Time Presence Filter',
        'Discover people actively online right now with Connectly Premium.'
      );
      return;
    }
    setOnlineOnly(!onlineOnly);
  };

  const handleSortChange = (newSort: ExploreSortOption) => {
    if (newSort === 'compatibility' && !canUseAdvanced) {
      openUpgradeModal(
        'ADVANCED_FILTERS',
        'AI Compatibility Ranking',
        'Sort discovery by deep algorithmic compatibility with Connectly Premium.'
      );
      return;
    }
    setSort(newSort);
  };

  const handleApply = () => {
    onApply({
      minAge,
      maxAge,
      city: city.trim() || undefined,
      gender: gender !== 'all' ? gender : undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
      verifiedOnly,
      onlineOnly,
      hasPhoto,
      sort,
    });
    onClose();
  };

  const handleResetLocal = () => {
    setMinAge(18);
    setMaxAge(60);
    setCity('');
    setGender('all');
    setSelectedInterests([]);
    setVerifiedOnly(false);
    setOnlineOnly(false);
    setHasPhoto(false);
    setSort('recommended');
    onReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="filter-drawer-backdrop" onClick={onClose} />

      {/* Drawer Container */}
      <aside className="filter-drawer glass-panel" aria-label="Discovery Filters">
        <div className="filter-drawer-header">
          <div className="filter-header-title">
            <SlidersHorizontal size={18} />
            <span>Advanced Filters</span>
          </div>
          <button
            type="button"
            className="filter-close-btn"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        <div className="filter-drawer-body">
          {/* Age Bounds */}
          <div className="filter-group">
            <label className="filter-label">Age Range ({minAge} – {maxAge})</label>
            <div className="filter-range-inputs">
              <div className="range-field">
                <span className="field-prefix">Min</span>
                <input
                  type="number"
                  min={18}
                  max={maxAge}
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge))}
                  className="filter-number-input"
                />
              </div>
              <span className="range-sep">to</span>
              <div className="range-field">
                <span className="field-prefix">Max</span>
                <input
                  type="number"
                  min={minAge}
                  max={99}
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge))}
                  className="filter-number-input"
                />
              </div>
            </div>
          </div>

          {/* Location / City */}
          <div className="filter-group">
            <label className="filter-label">City / Location</label>
            <input
              type="text"
              placeholder="e.g. Mumbai, Bangalore..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="filter-text-input"
            />
          </div>

          {/* Gender */}
          <div className="filter-group">
            <label className="filter-label">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="filter-select"
            >
              <option value="all">Everyone</option>
              <option value="female">Women</option>
              <option value="male">Men</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-group">
            <label className="filter-label">Sort Results By</label>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as ExploreSortOption)}
              className="filter-select"
            >
              <option value="recommended">Recommended (Smart Discovery)</option>
              <option value="newest">Newest Members</option>
              <option value="popular">Popular &amp; Active</option>
              <option value="compatibility">
                {canUseAdvanced ? 'Highest Compatibility' : 'Highest Compatibility 🔒 PRO'}
              </option>
            </select>
          </div>

          {/* Premium Filter Toggles */}
          <div className="filter-group">
            <label className="filter-label">Smart Attributes</label>
            <div className="filter-toggles-list">
              {/* Verified Only */}
              <button
                type="button"
                className={`filter-toggle-card ${verifiedOnly ? 'active' : ''}`}
                onClick={handleVerifiedClick}
              >
                <div className="toggle-info">
                  <span className="toggle-title">Verified Only</span>
                  <span className="toggle-desc">Authentic checked profiles</span>
                </div>
                {!canUseAdvanced ? (
                  <span className="lock-badge" title="Premium Feature">
                    <Lock size={14} />
                  </span>
                ) : (
                  <div className={`checkbox-box ${verifiedOnly ? 'checked' : ''}`}>
                    {verifiedOnly && <Check size={12} />}
                  </div>
                )}
              </button>

              {/* Online Only */}
              <button
                type="button"
                className={`filter-toggle-card ${onlineOnly ? 'active' : ''}`}
                onClick={handleOnlineClick}
              >
                <div className="toggle-info">
                  <span className="toggle-title">Online Now</span>
                  <span className="toggle-desc">Recently active within 15m</span>
                </div>
                {!canUseAdvanced ? (
                  <span className="lock-badge" title="Premium Feature">
                    <Lock size={14} />
                  </span>
                ) : (
                  <div className={`checkbox-box ${onlineOnly ? 'checked' : ''}`}>
                    {onlineOnly && <Check size={12} />}
                  </div>
                )}
              </button>

              {/* Has Photo */}
              <button
                type="button"
                className={`filter-toggle-card ${hasPhoto ? 'active' : ''}`}
                onClick={() => setHasPhoto(!hasPhoto)}
              >
                <div className="toggle-info">
                  <span className="toggle-title">Has Profile Photo</span>
                  <span className="toggle-desc">Show only users with pictures</span>
                </div>
                <div className={`checkbox-box ${hasPhoto ? 'checked' : ''}`}>
                  {hasPhoto && <Check size={12} />}
                </div>
              </button>
            </div>
          </div>

          {/* Interests Filter */}
          <div className="filter-group">
            <label className="filter-label">Filter by Interests</label>
            <div className="interests-pill-cloud">
              {COMMON_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    className={`interest-select-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleInterest(interest)}
                  >
                    <span>{interest}</span>
                    {isSelected && <Check size={12} className="pill-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Premium banner if not upgraded */}
          {!canUseAdvanced && (
            <div className="filter-premium-banner glass-panel">
              <div className="banner-top">
                <Sparkles size={16} className="sparkle-gold" />
                <span className="banner-title">Connectly Premium</span>
              </div>
              <p className="banner-text">
                Unlock verified discovery, online presence filters, and AI compatibility sorting.
              </p>
              <button
                type="button"
                className="banner-upgrade-btn"
                onClick={() =>
                  openUpgradeModal(
                    'ADVANCED_FILTERS',
                    'Unlock Advanced Filters',
                    'Access all search & discovery filters with Connectly Premium.'
                  )
                }
              >
                Upgrade to Unlock
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="filter-drawer-footer">
          <button
            type="button"
            className="btn-filter-reset"
            onClick={handleResetLocal}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="btn-filter-apply"
            onClick={handleApply}
          >
            Apply Filters
          </button>
        </div>
      </aside>
    </>
  );
};
