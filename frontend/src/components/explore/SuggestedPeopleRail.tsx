import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, Star, CheckCircle, Zap, MapPin } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import { discoveryService } from '../../services/discovery.service';
import type { SearchResultProfile } from '../../types/explore';

interface SuggestedPeopleRailProps {
  profiles: SearchResultProfile[];
  isLoading?: boolean;
}

export const SuggestedPeopleRail: React.FC<SuggestedPeopleRailProps> = ({ profiles, isLoading }) => {
  const navigate = useNavigate();
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  const handleLike = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (likedMap[userId] || loadingMap[userId]) return;

    setLoadingMap((prev) => ({ ...prev, [userId]: true }));
    try {
      await discoveryService.likeProfile(userId);
      setLikedMap((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error('Failed to like profile:', err);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSuperLike = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (likedMap[userId] || loadingMap[userId]) return;

    setLoadingMap((prev) => ({ ...prev, [userId]: true }));
    try {
      await discoveryService.superLikeProfile(userId);
      setLikedMap((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error('Failed to super like profile:', err);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="suggested-people-section">
        <div className="section-header">
          <div className="title-with-icon">
            <Sparkles size={18} className="section-icon accent-pink" />
            <h2 className="section-title">Suggested For You</h2>
          </div>
        </div>
        <div className="suggested-cards-scroll">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="suggested-card-skeleton skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <div className="suggested-people-section">
      <div className="section-header">
        <div className="title-with-icon">
          <Sparkles size={18} className="section-icon accent-pink" />
          <div>
            <h2 className="section-title">Suggested For You</h2>
            <p className="section-subtitle">Personalized based on interests and compatibility</p>
          </div>
        </div>
      </div>

      <div className="suggested-cards-scroll">
        {profiles.map((p) => {
          const isLiked = likedMap[p.userId];
          const isInteracting = loadingMap[p.userId];

          return (
            <div
              key={p.userId}
              className="suggested-card glass-panel"
              onClick={() => navigate(`/profile/${p.userId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/profile/${p.userId}`);
              }}
            >
              {/* Photo & Badges */}
              <div className="card-media-wrapper">
                {p.photoUrl ? (
                  <img
                    src={getMediaUrl(p.photoUrl)}
                    alt={`${p.firstName}'s photo`}
                    className="card-photo"
                    loading="lazy"
                  />
                ) : (
                  <div className="card-photo-placeholder">
                    <span>{p.firstName?.[0] || 'U'}</span>
                  </div>
                )}

                {/* Compatibility Badge */}
                {p.compatibilityScore && (
                  <div className="card-compatibility-badge">
                    <Sparkles size={12} />
                    <span>{p.compatibilityScore}% Match</span>
                  </div>
                )}

                {/* Boost Indicator */}
                {p.isBoosted && (
                  <div className="card-boost-badge">
                    <Zap size={12} />
                    <span>Boosted</span>
                  </div>
                )}
              </div>

              {/* Info Details */}
              <div className="card-info">
                <div className="card-name-row">
                  <span className="card-name">
                    {p.firstName}{p.age ? `, ${p.age}` : ''}
                  </span>
                  {p.isVerified && (
                    <span title="Verified Member" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <CheckCircle size={15} className="verified-icon" />
                    </span>
                  )}
                  {p.isOnline && (
                    <span className="online-dot" title="Active now" />
                  )}
                </div>

                {p.locationCity && (
                  <div className="card-city-row">
                    <MapPin size={12} />
                    <span>{p.locationCity}</span>
                  </div>
                )}

                {/* Shared or Top Interests */}
                {p.interests && p.interests.length > 0 && (
                  <div className="card-interests-tags">
                    {p.interests.slice(0, 2).map((interest, idx) => (
                      <span key={idx} className="mini-interest-tag">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn-card-action view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${p.userId}`);
                    }}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    className={`btn-card-action superlike-btn ${isLiked ? 'liked' : ''}`}
                    onClick={(e) => handleSuperLike(e, p.userId)}
                    disabled={isLiked || isInteracting}
                    title="Super Like"
                  >
                    <Star size={14} />
                  </button>

                  <button
                    type="button"
                    className={`btn-card-action like-btn ${isLiked ? 'liked' : ''}`}
                    onClick={(e) => handleLike(e, p.userId)}
                    disabled={isLiked || isInteracting}
                    title="Like"
                  >
                    <Heart size={14} fill={isLiked ? '#ec4899' : 'none'} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
