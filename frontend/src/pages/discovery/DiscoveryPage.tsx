import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DiscoveryProfile, DiscoveryFiltersState } from '../../types/discovery';
import discoveryService from '../../services/discovery.service';
import DiscoveryCardStack from '../../components/discovery/DiscoveryCardStack';
import DiscoveryActions from '../../components/discovery/DiscoveryActions';
import DiscoverySkeleton from '../../components/discovery/DiscoverySkeleton';
import DiscoveryFilters from '../../components/discovery/DiscoveryFilters';
import CandidateProfileModal from '../../components/discovery/CandidateProfileModal';
import DiscoveryMatchModal from '../../components/discovery/DiscoveryMatchModal';
import { SlidersHorizontal, Sparkles, RefreshCw, Compass } from 'lucide-react';
import BoostButton from '../../components/premium/BoostButton';
import { useSubscription } from '../../hooks/useSubscription';
import '../../components/discovery/Discovery.css';

export const DiscoveryPage: React.FC = () => {
  const { openUpgradeModal } = useSubscription();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<DiscoveryFiltersState>({
    gender: 'all',
    minAge: 18,
    maxAge: 60,
    maxDistanceKm: 50,
  });

  // Action / Animation lock state
  const [animatingAction, setAnimatingAction] = useState<'like' | 'pass' | 'super' | null>(null);
  const [actionLocked, setActionLocked] = useState(false);

  // Modals state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsProfile, setDetailsProfile] = useState<DiscoveryProfile | null>(null);
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<DiscoveryProfile | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Fetch candidates from real backend
  const fetchProfiles = useCallback(async (customFilters?: DiscoveryFiltersState) => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = customFilters || filters;
      const data = await discoveryService.getDiscoveryProfiles(activeFilters, 25);
      setProfiles(data.profiles || []);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error('Failed to load discovery profiles:', err);
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('Advanced discovery filters')) {
        openUpgradeModal('ADVANCED_FILTERS', 'Advanced Filters Locked', err.response.data.message);
      }
      setError(err?.response?.data?.message || err?.message || 'Unable to load candidate profiles.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const currentCandidate = profiles[currentIndex] || null;

  // Process PASS
  const handlePass = useCallback(async (targetProfile?: DiscoveryProfile) => {
    const candidate = targetProfile || currentCandidate;
    if (!candidate || actionLocked) return;

    setActionLocked(true);
    setAnimatingAction('pass');

    try {
      // Trigger API in parallel with exit animation
      await discoveryService.passProfile(candidate.userId);

      setTimeout(() => {
        setAnimatingAction(null);
        setCurrentIndex((prev) => prev + 1);
        setActionLocked(false);
      }, 350);
    } catch (err: any) {
      console.error('Pass failed:', err);
      setAnimatingAction(null);
      setActionLocked(false);
      showToast(err?.response?.data?.message || 'Failed to pass profile.', 'error');
    }
  }, [currentCandidate, actionLocked]);

  // Process LIKE
  const handleLike = useCallback(async (targetProfile?: DiscoveryProfile) => {
    const candidate = targetProfile || currentCandidate;
    if (!candidate || actionLocked) return;

    setActionLocked(true);
    setAnimatingAction('like');

    try {
      const result = await discoveryService.likeProfile(candidate.userId);

      setTimeout(() => {
        setAnimatingAction(null);
        setCurrentIndex((prev) => prev + 1);
        setActionLocked(false);

        // Check if mutual match occurred!
        if (result.matched) {
          setMatchedProfile(candidate);
          setIsMatchOpen(true);
        }
      }, 350);
    } catch (err: any) {
      console.error('Like failed:', err);
      setAnimatingAction(null);
      setActionLocked(false);
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('Daily like limit')) {
        openUpgradeModal('UNLIMITED_LIKES', 'Daily Like Limit Reached', err.response.data.message);
      } else {
        showToast(err?.response?.data?.message || 'Failed to like profile.', 'error');
      }
    }
  }, [currentCandidate, actionLocked, openUpgradeModal]);

  // Process SUPER LIKE
  const handleSuperLike = useCallback(async (targetProfile?: DiscoveryProfile) => {
    const candidate = targetProfile || currentCandidate;
    if (!candidate || actionLocked) return;

    setActionLocked(true);
    setAnimatingAction('super');

    try {
      const result = await discoveryService.superLikeProfile(candidate.userId);

      setTimeout(() => {
        setAnimatingAction(null);
        setCurrentIndex((prev) => prev + 1);
        setActionLocked(false);

        if (result.matched) {
          setMatchedProfile(candidate);
          setIsMatchOpen(true);
        } else {
          showToast(`Super Liked ${candidate.firstName}! ⭐`, 'success');
        }
      }, 350);
    } catch (err: any) {
      console.error('Super Like failed:', err);
      setAnimatingAction(null);
      setActionLocked(false);
      if (err?.response?.status === 403) {
        openUpgradeModal('EXTRA_SUPER_LIKES', 'Super Like Limit Reached', err?.response?.data?.message || 'Upgrade to Connectly Premium for extra Super Likes daily!');
      } else {
        showToast(err?.response?.data?.message || 'Failed to super-like profile.', 'error');
      }
    }
  }, [currentCandidate, actionLocked, openUpgradeModal]);

  // Open details modal
  const handleOpenDetails = (candidate?: DiscoveryProfile) => {
    const target = candidate || currentCandidate;
    if (target) {
      setDetailsProfile(target);
      setIsDetailsOpen(true);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or modal is open
      if (
        isFiltersOpen ||
        isDetailsOpen ||
        isMatchOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleLike();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSuperLike();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleOpenDetails();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePass, handleLike, handleSuperLike, isFiltersOpen, isDetailsOpen, isMatchOpen]);

  // Handle filter changes
  const handleApplyFilters = (newFilters: DiscoveryFiltersState) => {
    setFilters(newFilters);
    fetchProfiles(newFilters);
    showToast('Filters applied successfully', 'info');
  };

  const handleResetFilters = () => {
    const defaultFilters: DiscoveryFiltersState = {
      gender: 'all',
      minAge: 18,
      maxAge: 60,
      maxDistanceKm: 50,
    };
    setFilters(defaultFilters);
    fetchProfiles(defaultFilters);
    showToast('Preferences restored to defaults', 'info');
  };

  return (
    <div className="discovery-page-container">
      {/* TOAST ALERT */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-md transition-all ${
          toast.type === 'error'
            ? 'bg-rose-500/90 text-white border border-rose-400'
            : toast.type === 'success'
            ? 'bg-emerald-500/90 text-white border border-emerald-400'
            : 'bg-indigo-600/90 text-white border border-indigo-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* TOP HEADER & FILTER TRIGGER */}
      <div className="discovery-top-bar">
        <div className="discovery-brand-heading">
          <Compass size={24} className="text-pink-500" />
          <span>Discover</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BoostButton compact />
          <button
            type="button"
            className="discovery-filter-trigger"
            onClick={() => setIsFiltersOpen(true)}
            aria-label="Open discovery filters"
          >
            <SlidersHorizontal size={15} />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* MAIN DISCOVERY CONTENT */}
      {loading ? (
        <DiscoverySkeleton />
      ) : error ? (
        <div className="discovery-empty-state">
          <div className="empty-sparkle-icon">
            <RefreshCw size={32} />
          </div>
          <h2 className="empty-title">Something went wrong</h2>
          <p className="empty-subtitle">{error}</p>
          <button
            type="button"
            className="empty-btn primary"
            onClick={() => fetchProfiles()}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      ) : currentIndex >= profiles.length ? (
        /* EMPTY STATE: ALL CAUGHT UP */
        <div className="discovery-empty-state">
          <div className="empty-sparkle-icon">
            <Sparkles size={36} />
          </div>
          <h2 className="empty-title">You're all caught up ✨</h2>
          <p className="empty-subtitle">
            There are no more candidate profiles matching your current preferences right now.
          </p>
          <div className="empty-actions-row">
            <button
              type="button"
              className="empty-btn primary"
              onClick={() => setIsFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Adjust Preferences
            </button>
            <button
              type="button"
              className="empty-btn secondary"
              onClick={() => fetchProfiles()}
            >
              <RefreshCw size={16} />
              Refresh Feed
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE CARD STACK & INTERACTION CONTROLS */
        <>
          <DiscoveryCardStack
            profiles={profiles}
            currentIndex={currentIndex}
            onSwipeLeft={handlePass}
            onSwipeRight={handleLike}
            onSwipeUp={handleSuperLike}
            onOpenDetails={handleOpenDetails}
            animatingAction={animatingAction}
          />

          <DiscoveryActions
            onPass={() => handlePass()}
            onSuperLike={() => handleSuperLike()}
            onLike={() => handleLike()}
            onOpenDetails={() => handleOpenDetails()}
            disabled={actionLocked}
          />
        </>
      )}

      {/* CANDIDATE FULL PROFILE MODAL */}
      <CandidateProfileModal
        profile={detailsProfile}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onPass={() => {
          setIsDetailsOpen(false);
          handlePass(detailsProfile || undefined);
        }}
        onSuperLike={() => {
          setIsDetailsOpen(false);
          handleSuperLike(detailsProfile || undefined);
        }}
        onLike={() => {
          setIsDetailsOpen(false);
          handleLike(detailsProfile || undefined);
        }}
        actionDisabled={actionLocked}
      />

      {/* PREFERENCES / FILTERS MODAL */}
      <DiscoveryFilters
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {/* MUTUAL MATCH CELEBRATION MODAL */}
      <DiscoveryMatchModal
        isOpen={isMatchOpen}
        onClose={() => setIsMatchOpen(false)}
        matchedProfile={matchedProfile}
        onKeepSwiping={() => setIsMatchOpen(false)}
      />
    </div>
  );
};

export default DiscoveryPage;
