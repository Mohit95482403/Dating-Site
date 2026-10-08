import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionService from '../../services/subscription.service';
import discoveryService from '../../services/discovery.service';
import { useToast } from '../../context/ToastContext';
import type { ReceivedLikeCandidate } from '../../types/subscription';
import { getMediaUrl } from '../../utils/media';
import '../../components/premium/Premium.css';

export const LikesReceivedPage: React.FC = () => {
  const { hasFeature } = useSubscription();
  const toast = useToast();
  const navigate = useNavigate();

  const [likes, setLikes] = useState<ReceivedLikeCandidate[]>([]);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [matchingUserId, setMatchingUserId] = useState<number | null>(null);

  const canSeeWhoLiked = hasFeature('SEE_WHO_LIKED');

  useEffect(() => {
    let isMounted = true;

    const fetchReceivedLikes = async () => {
      if (!canSeeWhoLiked) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await SubscriptionService.getReceivedLikes();
        if (isMounted) {
          setLikes(data.likes || []);
          setLikesCount(data.count || 0);
        }
      } catch (err: any) {
        console.error('Failed to load incoming likes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReceivedLikes();

    return () => {
      isMounted = false;
    };
  }, [canSeeWhoLiked]);

  const handleLikeBack = async (candidateId: number) => {
    try {
      setMatchingUserId(candidateId);
      const res = await discoveryService.likeProfile(candidateId);
      if (res.matched) {
        toast.success("🎉 It's a Mutual Match! You can now start chatting immediately!");
      } else {
        toast.success('Liked profile back!');
      }
      // Remove from incoming likes list
      setLikes((prev) => prev.filter((c) => c.userId !== candidateId));
      setLikesCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to match with user.';
      toast.error(msg);
    } finally {
      setMatchingUserId(null);
    }
  };

  return (
    <div className="likes-received-container">
      <div className="likes-received-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Who Liked You
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            {canSeeWhoLiked
              ? `You have ${likesCount} people waiting to connect with you.`
              : 'People have expressed interest in your profile.'}
          </p>
        </div>
      </div>

      {!canSeeWhoLiked ? (
        // Blurred Teaser View for Free Users
        <div className="blurred-likes-teaser">
          <div className="blurred-bg-sample">
            <div style={{ height: '220px', background: '#3b82f6', borderRadius: '1rem' }} />
            <div style={{ height: '220px', background: '#ec4899', borderRadius: '1rem' }} />
            <div style={{ height: '220px', background: '#8b5cf6', borderRadius: '1rem' }} />
            <div style={{ height: '220px', background: '#f59e0b', borderRadius: '1rem' }} />
          </div>

          <div className="teaser-content">
            <div className="teaser-lock-icon">
              <Lock size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem' }}>
              See Everyone Who Liked You
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Why wait to swipe? Connectly Premium lets you unblur everyone who already swiped right
              on you and match with them instantly!
            </p>
            <button
              onClick={() => navigate('/premium')}
              className="plan-cta-btn btn-primary"
              style={{ width: 'auto', margin: '0 auto', padding: '0.85rem 2rem' }}
            >
              <Sparkles size={18} />
              <span>Unlock Secret Admirers</span>
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          Loading your admirers...
        </div>
      ) : likes.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(236, 72, 153, 0.1)',
              color: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Heart size={32} />
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
            No incoming likes yet
          </h3>
          <p style={{ color: '#94a3b8', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Boost your profile or update your photos to increase your visibility to candidates nearby.
          </p>
        </div>
      ) : (
        <div className="likes-received-grid">
          {likes.map((candidate) => (
            <div key={candidate.userId} className="like-candidate-card">
              <div className="like-photo-wrap">
                <img
                  src={
                    getMediaUrl(candidate.avatarUrl) ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={candidate.firstName}
                  onError={(e) => {
                    // Fallback avatar
                    (e.target as HTMLElement).setAttribute(
                      'src',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
                    );
                  }}
                />

                {candidate.isSuperLike && (
                  <div className="like-super-badge">
                    <Star size={12} fill="#ffffff" />
                    <span>Super Liked You</span>
                  </div>
                )}
              </div>

              <div className="like-card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4>
                    {candidate.firstName}, {candidate.age}
                  </h4>
                  {candidate.isVerified && (
                    <span title="Verified Member" style={{ display: 'inline-flex' }}>
                      <ShieldCheck size={16} color="#38bdf8" />
                    </span>
                  )}
                </div>

                {candidate.city && (
                  <p>{candidate.city}</p>
                )}

                {candidate.bio && (
                  <p
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '0.82rem',
                    }}
                  >
                    {candidate.bio}
                  </p>
                )}

                <button
                  disabled={matchingUserId === candidate.userId}
                  onClick={() => handleLikeBack(candidate.userId)}
                  className="like-card-action-btn"
                >
                  <Heart size={16} fill="#ffffff" />
                  <span>
                    {matchingUserId === candidate.userId ? 'Matching...' : 'Match Back'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikesReceivedPage;
