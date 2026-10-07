import React, { useState, useEffect, useCallback } from 'react';
import aiService from '../../services/ai.service';
import type { CompatibilityResult, CompatibilityTier } from '../../types/ai';
import {
  Sparkles,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Heart,
  Compass,
  Sliders,
  MapPin,
  UserCheck,
} from 'lucide-react';
import './AIComponents.css';

interface MatchCompatibilityCardProps {
  matchId?: number;
  targetUserId?: number;
  targetName?: string;
  initialData?: CompatibilityResult;
}

export const MatchCompatibilityCard: React.FC<MatchCompatibilityCardProps> = ({
  matchId,
  targetUserId,
  targetName = 'your connection',
  initialData,
}) => {
  const [data, setData] = useState<CompatibilityResult | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchCompatibility = useCallback(async () => {
    if (!matchId && !targetUserId) return;
    setLoading(true);
    setError(null);

    try {
      let result: CompatibilityResult;
      if (matchId) {
        result = await aiService.getMatchCompatibility(matchId);
      } else if (targetUserId) {
        result = await aiService.getUserCompatibility(targetUserId);
      } else {
        return;
      }
      setData(result);
    } catch (err: any) {
      console.error('Failed to load compatibility details:', err);
      setError(
        err?.response?.data?.message ||
          'Unable to calculate compatibility at this time. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, targetUserId]);

  useEffect(() => {
    if (!initialData) {
      fetchCompatibility();
    }
  }, [fetchCompatibility, initialData]);

  if (loading) {
    return (
      <div className="compatibility-card" aria-busy="true">
        <div className="compatibility-header">
          <div className="compatibility-header-left">
            <Sparkles size={18} className="text-purple-400" />
            <h3 className="compatibility-title">Calculating Compatibility...</h3>
          </div>
        </div>
        <div className="ai-loading-state">
          <div className="ai-loading-spinner" />
          <p className="ai-loading-text">
            Analyzing shared interests, preferences, and lifestyle signals...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="compatibility-card">
        <div className="compatibility-header">
          <div className="compatibility-header-left">
            <AlertCircle size={18} className="text-rose-400" />
            <h3 className="compatibility-title">Compatibility Analysis</h3>
          </div>
        </div>
        <div className="ai-error-banner">
          <span>{error || 'Compatibility data unavailable.'}</span>
          <button
            type="button"
            onClick={fetchCompatibility}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ff4d79',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    overallScore,
    compatibilityTier,
    categoryScores,
    sharedInterests,
    reasons,
    aiExplanation,
  } = data;

  // Circular gauge math (radius = 36, circumference = 2 * PI * 36 = 226.19)
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (overallScore / 100) * circumference;

  const getTierClass = (tier: CompatibilityTier) => {
    switch (tier) {
      case 'Exceptional':
        return 'ai-badge-tier-exceptional';
      case 'High':
        return 'ai-badge-tier-high';
      case 'Good':
        return 'ai-badge-tier-good';
      case 'Moderate':
        return 'ai-badge-tier-moderate';
      default:
        return 'ai-badge-tier-growing';
    }
  };

  const getScoreStrokeColor = (score: number) => {
    if (score >= 85) return '#ec4899';
    if (score >= 70) return '#a855f7';
    if (score >= 50) return '#3b82f6';
    return '#eab308';
  };

  return (
    <div className="compatibility-card">
      {/* Header */}
      <div className="compatibility-header">
        <div className="compatibility-header-left">
          <Sparkles size={18} className="text-purple-400" />
          <h3 className="compatibility-title">Smart Match Compatibility</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`ai-badge ${getTierClass(compatibilityTier)}`}>
            {compatibilityTier} Match
          </span>
          <button
            type="button"
            onClick={fetchCompatibility}
            title="Recalculate compatibility"
            aria-label="Refresh compatibility calculation"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '0.2rem',
              borderRadius: '0.3rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Gauge & Tier Info */}
      <div className="compatibility-main-gauge-row">
        <div className="compatibility-score-circle">
          <svg className="compatibility-score-svg" viewBox="0 0 84 84">
            <circle
              className="compatibility-score-bg-ring"
              cx="42"
              cy="42"
              r={radius}
            />
            <circle
              className="compatibility-score-fill-ring"
              cx="42"
              cy="42"
              r={radius}
              stroke={getScoreStrokeColor(overallScore)}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
          <div className="compatibility-score-number">
            {overallScore}
            <span>%</span>
          </div>
        </div>

        <div className="compatibility-tier-info">
          <h4 className="compatibility-tier-title">
            {overallScore}% Match Potential
          </h4>
          <p className="compatibility-tier-desc">
            Calculated from shared interests, lifestyle preferences, and profile alignment with {data.targetName || targetName}.
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="compatibility-breakdown-grid">
        <div className="compatibility-category-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Heart size={12} className="text-rose-400" />
            <span className="compatibility-category-label">Interests</span>
          </div>
          <div className="compatibility-category-bar-wrap">
            <div
              className="compatibility-category-bar-fill"
              style={{
                width: `${categoryScores.sharedInterests}%`,
                background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
              }}
            />
          </div>
          <span className="compatibility-category-val">{categoryScores.sharedInterests}%</span>
        </div>

        <div className="compatibility-category-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sliders size={12} className="text-purple-400" />
            <span className="compatibility-category-label">Preferences</span>
          </div>
          <div className="compatibility-category-bar-wrap">
            <div
              className="compatibility-category-bar-fill"
              style={{
                width: `${categoryScores.preferences}%`,
                background: 'linear-gradient(90deg, #a855f7, #6366f1)',
              }}
            />
          </div>
          <span className="compatibility-category-val">{categoryScores.preferences}%</span>
        </div>

        <div className="compatibility-category-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={12} className="text-blue-400" />
            <span className="compatibility-category-label">Location</span>
          </div>
          <div className="compatibility-category-bar-wrap">
            <div
              className="compatibility-category-bar-fill"
              style={{
                width: `${categoryScores.location}%`,
                background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              }}
            />
          </div>
          <span className="compatibility-category-val">{categoryScores.location}%</span>
        </div>

        <div className="compatibility-category-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserCheck size={12} className="text-emerald-400" />
            <span className="compatibility-category-label">Richness</span>
          </div>
          <div className="compatibility-category-bar-wrap">
            <div
              className="compatibility-category-bar-fill"
              style={{
                width: `${categoryScores.profileRichness}%`,
                background: 'linear-gradient(90deg, #10b981, #14b8a6)',
              }}
            />
          </div>
          <span className="compatibility-category-val">{categoryScores.profileRichness}%</span>
        </div>
      </div>

      {/* Shared Interests Chips */}
      {sharedInterests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <h5 className="compatibility-subheading">Shared Interests ({sharedInterests.length})</h5>
          <div className="compatibility-shared-chips">
            {sharedInterests.map((interest, idx) => (
              <span key={`shared-${idx}`} className="compatibility-interest-chip">
                #{interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verified Reasons List */}
      {reasons.length > 0 && (
        <div className="compatibility-reasons-wrap">
          <h5 className="compatibility-subheading">Why You May Connect</h5>
          <ul className="compatibility-reasons-list">
            {reasons.map((reason, idx) => (
              <li key={`reason-${idx}`} className="compatibility-reason-item">
                <CheckCircle size={15} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Natural Language Explanation */}
      {aiExplanation && (
        <div className="compatibility-ai-quote-box">
          <Compass size={18} className="text-purple-400" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#d8b4fe',
                display: 'block',
                marginBottom: '0.2rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              AI Compatibility Insight
            </span>
            <p className="compatibility-ai-quote-text">"{aiExplanation}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCompatibilityCard;
