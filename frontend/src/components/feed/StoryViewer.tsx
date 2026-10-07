import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import type { UserStoryGroup } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import { useAuth } from '../../hooks/useAuth';
import { getMediaUrl } from '../../utils/media';

interface StoryViewerProps {
  storyGroups: UserStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted?: (storyId: number) => void;
}

const REACTIONS = ['❤️', '🔥', '😍', '😂', '👏'];
const STORY_DURATION = 5000; // 5 seconds per story

export const StoryViewer: React.FC<StoryViewerProps> = ({
  storyGroups,
  initialGroupIndex,
  onClose,
  onStoryDeleted,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;

  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const activeGroup = storyGroups[currentGroupIdx];
  const activeStory = activeGroup?.stories[currentStoryIdx];
  const isOwner = activeStory ? activeStory.userId === currentUserId : false;

  const startTimeRef = useRef<number>(Date.now());

  // Navigate next story or group
  const handleNext = useCallback(() => {
    if (!activeGroup) return;
    if (currentStoryIdx < activeGroup.stories.length - 1) {
      setCurrentStoryIdx((prev) => prev + 1);
      setProgress(0);
    } else if (currentGroupIdx < storyGroups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [activeGroup, currentStoryIdx, currentGroupIdx, storyGroups.length, onClose]);

  // Navigate prev story or group
  const handlePrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((prev) => prev - 1);
      setProgress(0);
    } else if (currentGroupIdx > 0) {
      const prevGroup = storyGroups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIdx, currentGroupIdx, storyGroups]);

  // Mark active story as viewed
  useEffect(() => {
    if (activeStory && !activeStory.hasViewed && !isOwner) {
      FeedService.viewStory(activeStory.id).catch(() => {});
      activeStory.hasViewed = true;
    }
    setActiveReaction(activeStory?.myReaction || null);
  }, [activeStory, isOwner]);

  // Timer loop for progress bar
  useEffect(() => {
    if (isPaused || !activeStory) return;

    startTimeRef.current = Date.now() - (progress / 100) * STORY_DURATION;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        handleNext();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, activeStory, currentStoryIdx, currentGroupIdx, handleNext, progress]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ') setIsPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const handleReaction = async (reaction: string) => {
    if (!activeStory) return;
    setActiveReaction(reaction);
    try {
      await FeedService.reactToStory(activeStory.id, reaction);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!activeStory || !window.confirm('Delete this story?')) return;
    try {
      await FeedService.deleteStory(activeStory.id);
      if (onStoryDeleted) onStoryDeleted(activeStory.id);
      handleNext();
    } catch {
      alert('Failed to delete story.');
    }
  };

  if (!activeGroup || !activeStory) return null;

  return (
    <div className="story-viewer-backdrop">
      {/* Desktop Prev Button */}
      {currentGroupIdx > 0 || currentStoryIdx > 0 ? (
        <button
          type="button"
          className="story-nav-btn prev"
          onClick={handlePrev}
          aria-label="Previous story"
        >
          <ChevronLeft size={28} />
        </button>
      ) : null}

      <div
        className="story-viewer-card"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars for each story in group */}
        <div className="story-progress-container">
          {activeGroup.stories.map((story, idx) => {
            let fillPct = 0;
            if (idx < currentStoryIdx) fillPct = 100;
            else if (idx === currentStoryIdx) fillPct = progress;
            return (
              <div key={story.id} className="story-progress-bar">
                <div
                  className="story-progress-fill"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header */}
        <div className="story-top-bar">
          <div className="story-top-author">
            <div className="story-top-avatar">
              <img
                src={getMediaUrl(activeGroup.author.avatarUrl) || '/default-avatar.png'}
                alt={activeGroup.author.firstName}
              />
            </div>
            <div className="story-top-meta">
              <span className="story-top-name">
                {activeGroup.author.firstName} {activeGroup.author.lastName}
              </span>
              <span className="story-top-time">
                {new Date(activeStory.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOwner && (
              <button
                type="button"
                className="story-close-btn"
                onClick={handleDelete}
                title="Delete story"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              className="story-close-btn"
              onClick={onClose}
              aria-label="Close stories"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Story Media */}
        <div className="story-media-view">
          {activeStory.mediaType === 'video' ? (
            <video
              src={getMediaUrl(activeStory.mediaUrl)}
              autoPlay
              playsInline
              muted
              loop
            />
          ) : (
            <img src={getMediaUrl(activeStory.mediaUrl)} alt="Story visual" />
          )}

          {activeStory.caption && (
            <div className="story-caption-overlay">
              {activeStory.caption}
            </div>
          )}
        </div>

        {/* Bottom Bar: Owner Stats or Viewer Reactions */}
        <div className="story-bottom-bar">
          {isOwner ? (
            <div className="story-viewers-tag">
              <Eye size={16} />
              <span>{activeStory.viewsCount} views</span>
            </div>
          ) : (
            <div className="story-reactions-rail">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="story-reaction-btn"
                  onClick={() => handleReaction(emoji)}
                  style={{
                    transform: activeReaction === emoji ? 'scale(1.3)' : 'scale(1)',
                  }}
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Next Button */}
      {currentGroupIdx < storyGroups.length - 1 ||
      currentStoryIdx < activeGroup.stories.length - 1 ? (
        <button
          type="button"
          className="story-nav-btn next"
          onClick={handleNext}
          aria-label="Next story"
        >
          <ChevronRight size={28} />
        </button>
      ) : null}
    </div>
  );
};

export default StoryViewer;
