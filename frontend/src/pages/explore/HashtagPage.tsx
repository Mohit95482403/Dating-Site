import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, ArrowLeft, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { ExplorePostGrid } from '../../components/explore/ExplorePostGrid';
import { ExploreService } from '../../services/explore.service';
import type { HashtagDetailResponse } from '../../types/explore';
import '../../components/explore/explore.css';

export const HashtagPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();

  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [data, setData] = useState<HashtagDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tag) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    ExploreService.getHashtagDetail(tag, sort, 1, 30)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[HashtagPage] Failed to load hashtag:', err);
          setError(`Hashtag #${tag} has no posts yet or does not exist.`);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tag, sort]);

  const cleanTag = (tag || '').replace(/^#/, '');

  return (
    <div className="hashtag-page-root">
      {/* Header Panel */}
      <div className="hashtag-header-panel glass-panel">
        <div className="hashtag-header-left">
          <button
            type="button"
            className="btn-card-action"
            onClick={() => navigate('/explore')}
            aria-label="Back to explore"
            style={{ width: '38px', height: '38px', borderRadius: '50%' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="hashtag-icon-circle">
            <Hash size={32} />
          </div>
          <div>
            <h1 className="hashtag-title-text">#{cleanTag}</h1>
            <div className="hashtag-meta-badges">
              <span className="hashtag-count-badge">
                {data ? `${data.total} posts` : 'Loading...'}
              </span>
              {data?.hashtag?.trendBadge && (
                <span className={`trend-badge badge-${data.hashtag.trendBadge.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {data.hashtag.trendBadge}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Popular vs Recent */}
      <div className="hashtag-tabs-bar">
        <button
          type="button"
          className={`hashtag-tab-btn ${sort === 'popular' ? 'active' : ''}`}
          onClick={() => setSort('popular')}
        >
          <TrendingUp size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Popular
        </button>
        <button
          type="button"
          className={`hashtag-tab-btn ${sort === 'recent' ? 'active' : ''}`}
          onClick={() => setSort('recent')}
        >
          <Clock size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Recent
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="explore-empty-posts glass-panel">
          <AlertCircle size={28} className="empty-icon" />
          <p className="empty-text">{error}</p>
          <button
            type="button"
            className="btn-open-filters"
            onClick={() => navigate('/explore')}
            style={{ marginTop: '12px' }}
          >
            Explore Other Topics
          </button>
        </div>
      )}

      {/* Posts Grid */}
      {!error && (
        <ExplorePostGrid
          posts={data?.posts || []}
          isLoading={isLoading}
          title=""
        />
      )}
    </div>
  );
};

export default HashtagPage;
