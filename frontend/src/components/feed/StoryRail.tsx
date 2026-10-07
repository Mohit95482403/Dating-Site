import { Plus, User } from 'lucide-react';
import type { UserStoryGroup } from '../../types/feed';
import { useAuth } from '../../hooks/useAuth';
import { getMediaUrl } from '../../utils/media';

interface StoryRailProps {
  storyGroups: UserStoryGroup[];
  onOpenStory: (groupIndex: number) => void;
  onAddStory: () => void;
  loading?: boolean;
}

export const StoryRail: React.FC<StoryRailProps> = ({
  storyGroups,
  onOpenStory,
  onAddStory,
  loading = false,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const safeGroups = Array.isArray(storyGroups) ? storyGroups : [];

  const myGroupIndex = safeGroups.findIndex((g) => g.userId === currentUserId);
  const myStoryGroup = myGroupIndex !== -1 ? safeGroups[myGroupIndex] : null;

  return (
    <div className="story-rail-wrapper">
      <div className="story-rail-scroll">
        {/* Your Story item */}
        <button
          type="button"
          className="story-item"
          onClick={() => {
            if (myStoryGroup && myStoryGroup.stories.length > 0) {
              onOpenStory(myGroupIndex);
            } else {
              onAddStory();
            }
          }}
          title={myStoryGroup?.stories.length ? 'View your story' : 'Add a story'}
        >
          <div
            className={`story-avatar-ring ${
              myStoryGroup
                ? myStoryGroup.hasUnseen
                  ? 'unseen'
                  : 'seen'
                : 'my-story-ring'
            }`}
          >
            <div className="story-avatar-inner">
              {user?.avatarUrl ? (
                <img src={getMediaUrl(user.avatarUrl)} alt="Your profile" />
              ) : (
                <User size={24} color="#94a3b8" />
              )}
            </div>
            {/* Show plus icon if user has no stories or wants to add another */}
            {(!myStoryGroup || myStoryGroup.stories.length === 0) && (
              <span className="story-plus-badge">
                <Plus size={14} strokeWidth={3} />
              </span>
            )}
          </div>
          <span className="story-username">Your Story</span>
        </button>

        {/* Other users' stories */}
        {safeGroups
          .filter((group) => group.userId !== currentUserId)
          .map((group) => {
            const index = safeGroups.findIndex((g) => g.userId === group.userId);
            return (
              <button
                key={group.userId}
                type="button"
                className="story-item"
                onClick={() => onOpenStory(index)}
                title={`${group.author.firstName}'s story`}
              >
                <div
                  className={`story-avatar-ring ${
                    group.hasUnseen ? 'unseen' : 'seen'
                  }`}
                >
                  <div className="story-avatar-inner">
                    {group.author.avatarUrl ? (
                      <img
                        src={getMediaUrl(group.author.avatarUrl)}
                        alt={group.author.firstName}
                      />
                    ) : (
                      <User size={24} color="#94a3b8" />
                    )}
                  </div>
                </div>
                <span className="story-username">{group.author.firstName}</span>
              </button>
            );
          })}

        {loading && (
          <div style={{ display: 'flex', gap: '16px' }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="story-item"
                style={{ opacity: 0.5, pointerEvents: 'none' }}
              >
                <div className="story-avatar-ring seen">
                  <div className="story-avatar-inner" />
                </div>
                <span className="story-username">Loading...</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryRail;
