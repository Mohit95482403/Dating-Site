import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MoreVertical, 
  ShieldCheck, 
  Flame, 
  Info, 
  EyeOff, 
  Hash,
  ExternalLink
} from 'lucide-react';
import type { ScoredRecommendation, FeedbackType } from '../../types/personalization';
import WhySeeingThisModal from './WhySeeingThisModal';
import { getMediaUrl } from '../../utils/media';

interface RecommendationCardProps {
  recommendation: ScoredRecommendation<any>;
  onFeedback: (recommendationType: any, entityId: string | number, feedbackType: FeedbackType) => void;
  onActionClick?: (recommendation: ScoredRecommendation<any>) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = React.memo(({
  recommendation,
  onFeedback,
  onActionClick,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyModalOpen, setWhyModalOpen] = useState(false);

  const { item, score, explanation, recommendationType } = recommendation;

  // Extract display parameters according to type
  let entityId = '';
  let title = '';
  let subtitle = '';
  let imageUrl = '';
  let isVerified = false;
  let isBoosted = false;
  let targetRoute = '';

  switch (recommendationType) {
    case 'PEOPLE':
      entityId = String(item.user_id);
      title = `${item.first_name || 'Member'}${item.last_name ? ' ' + item.last_name : ''}${item.age ? ', ' + item.age : ''}`;
      subtitle = item.occupation || item.location_city || 'Active member';
      imageUrl = getMediaUrl(item.avatar_url) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
      isVerified = Boolean(item.profile_verified || item.user_verified);
      isBoosted = Boolean(item.has_active_subscription);
      targetRoute = `/profile/${item.user_id}`;
      break;

    case 'COMMUNITY':
      entityId = String(item.id);
      title = item.name;
      subtitle = `${item.member_count || 1} members • ${item.category_name || 'Group'}`;
      imageUrl = getMediaUrl(item.cover_image || item.avatar_image) || 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80';
      isBoosted = Boolean(item.is_boosted);
      targetRoute = `/communities/${item.slug || item.id}`;
      break;

    case 'EVENT':
      entityId = String(item.id);
      title = item.title;
      subtitle = `${item.community_name || 'Community Event'} • ${item.location_name || 'Virtual'}`;
      imageUrl = getMediaUrl(item.cover_image) || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80';
      targetRoute = `/communities/${item.community_slug || 'events'}`;
      break;

    case 'POST':
      entityId = String(item.id);
      title = `${item.author_first_name || 'User'}'s Post`;
      subtitle = item.community_name ? `in ${item.community_name}` : 'Public feed';
      imageUrl = getMediaUrl(item.author_avatar_url) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
      isVerified = Boolean(item.author_verified);
      targetRoute = `/feed?post=${item.id}`;
      break;

    case 'TRENDING':
      entityId = String(item.id);
      title = `#${item.name}`;
      subtitle = `${item.posts_count || 0} active posts`;
      targetRoute = `/explore?q=%23${encodeURIComponent(item.name)}`;
      break;
  }

  const handleCardClick = () => {
    if (onActionClick) {
      onActionClick(recommendation);
    } else if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleFeedback = (e: React.MouseEvent, type: FeedbackType) => {
    e.stopPropagation();
    setMenuOpen(false);
    onFeedback(recommendationType, entityId, type);
  };

  return (
    <>
      <div className={`recommendation-card-item glass-panel ${recommendationType.toLowerCase()}-card`} onClick={handleCardClick}>
        {/* Card Header & Media */}
        <div className="card-media-wrapper">
          {recommendationType === 'TRENDING' ? (
            <div className="trending-media-placeholder">
              <Hash size={32} className="trending-hash-icon" />
            </div>
          ) : (
            <img src={imageUrl} alt={title} className="card-media-img" loading="lazy" />
          )}

          {/* Badges */}
          <div className="card-badges-overlay">
            {isVerified && (
              <span className="badge-pill verified-badge" title="Verified Profile">
                <ShieldCheck size={12} /> Verified
              </span>
            )}
            {isBoosted && (
              <span className="badge-pill boosted-badge" title="Featured Highlight">
                <Flame size={12} /> Featured
              </span>
            )}
          </div>

          {/* Top Actions: Menu Button */}
          <div className="card-top-actions">
            <button
              className="card-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              aria-label="Recommendation options"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="card-dropdown-menu glass-panel" onClick={(e) => e.stopPropagation()}>
                <button
                  className="dropdown-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setWhyModalOpen(true);
                  }}
                >
                  <Info size={14} />
                  <span>Why am I seeing this?</span>
                </button>
                <button className="dropdown-menu-item" onClick={(e) => handleFeedback(e, 'NOT_INTERESTED')}>
                  <EyeOff size={14} />
                  <span>Not interested</span>
                </button>
                <button className="dropdown-menu-item" onClick={(e) => handleFeedback(e, 'SHOW_LESS')}>
                  <EyeOff size={14} />
                  <span>Show less like this</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="card-details-wrapper">
          <div className="card-main-info">
            <h4 className="card-title" title={title}>
              {title}
            </h4>
            <p className="card-subtitle">{subtitle}</p>
          </div>

          {/* Explainability Bar */}
          {explanation && (
            <div
              className="card-explanation-banner"
              onClick={(e) => {
                e.stopPropagation();
                setWhyModalOpen(true);
              }}
              title="Click to understand this recommendation"
            >
              <Sparkles size={12} className="explanation-sparkle" />
              <span className="explanation-text">{explanation.primary}</span>
              <Info size={11} className="explanation-info-icon" />
            </div>
          )}

          {/* Action Trigger */}
          <div className="card-action-footer">
            <span className="card-action-link">
              {recommendationType === 'PEOPLE' && 'View Profile'}
              {recommendationType === 'COMMUNITY' && 'Explore Community'}
              {recommendationType === 'EVENT' && 'View Event'}
              {recommendationType === 'POST' && 'Read Post'}
              {recommendationType === 'TRENDING' && 'Explore Tag'}
              <ExternalLink size={12} className="action-arrow" />
            </span>
          </div>
        </div>
      </div>

      {/* Why Am I Seeing This Modal */}
      <WhySeeingThisModal
        isOpen={whyModalOpen}
        onClose={() => setWhyModalOpen(false)}
        title={title}
        recommendationType={recommendationType}
        explanation={explanation}
        score={score}
      />
    </>
  );
});

export default RecommendationCard;
