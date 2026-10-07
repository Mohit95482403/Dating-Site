import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash } from 'lucide-react';
import type { SearchResultHashtag } from '../../types/explore';

interface TrendingRailProps {
  hashtags: SearchResultHashtag[];
  isLoading?: boolean;
  onTagClick?: (tag: string) => void;
}

export const TrendingRail: React.FC<TrendingRailProps> = ({ hashtags, isLoading, onTagClick }) => {
  const navigate = useNavigate();

  const handleClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    } else {
      navigate(`/hashtag/${encodeURIComponent(tag)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="trending-rail-container">
        <div className="trending-rail-header">
          <TrendingUp size={18} className="trending-header-icon" />
          <span className="trending-header-title">Trending Topics</span>
        </div>
        <div className="trending-rail-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="trending-card-skeleton skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!hashtags || hashtags.length === 0) {
    return null;
  }

  return (
    <div className="trending-rail-container">
      <div className="trending-rail-header">
        <div className="trending-title-group">
          <TrendingUp size={18} className="trending-header-icon" />
          <h2 className="trending-header-title">Trending Now</h2>
        </div>
        <span className="trending-subtitle">Popular across Connectly</span>
      </div>

      <div className="trending-rail-list">
        {hashtags.map((ht) => (
          <div
            key={ht.id}
            className="trending-card glass-panel"
            onClick={() => handleClick(ht.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(ht.name);
              }
            }}
          >
            <div className="trending-card-top">
              <span className="trending-hash-icon">
                <Hash size={14} />
              </span>
              <span className="trending-tag-name">{ht.name}</span>
            </div>
            <div className="trending-card-bottom">
              <span className="trending-post-count">{ht.postsCount} posts</span>
              {ht.trendBadge && (
                <span className={`trend-badge badge-${ht.trendBadge.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {ht.trendBadge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
