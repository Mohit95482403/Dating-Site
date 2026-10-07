import React, { useState, useEffect, useCallback } from 'react';
import aiService from '../../services/ai.service';
import type { ProfileInsightsResult } from '../../types/ai';
import {
  Sparkles,
  X,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import './AIComponents.css';

interface ProfileAIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditSection?: (section: string) => void;
}

export const ProfileAIInsightsModal: React.FC<ProfileAIInsightsModalProps> = ({
  isOpen,
  onClose,
  onOpenEditSection,
}) => {
  const [data, setData] = useState<ProfileInsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getProfileInsights();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load profile AI insights:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to generate AI profile insights. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen, fetchInsights]);

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-insights-modal-title"
    >
      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-header-left">
            <div className="ai-modal-icon-badge">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="ai-insights-modal-title" className="ai-modal-title">
                Smart Profile Insights
              </h2>
              <p className="ai-modal-subtitle">
                AI-driven analysis of your profile strength & attraction signals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ai-modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {loading ? (
            <div className="ai-loading-state">
              <div className="ai-loading-spinner" />
              <p className="ai-loading-text">
                Analyzing your bio, photos, interests, and profile signals...
              </p>
            </div>
          ) : error ? (
            <div className="ai-error-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchInsights}
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
          ) : data ? (
            <>
              {/* Score / Rating Banner */}
              <div className="insights-score-banner">
                <div>
                  <h3 className="insights-rating-title">
                    Rating: <span style={{ color: '#ff4d79' }}>{data.overallRating}</span>
                  </h3>
                  <p className="insights-rating-sub">
                    Profile Completeness: <strong>{data.completionPercentage}%</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={16} color="#10b981" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    {data.completionPercentage >= 80
                      ? 'Optimal Visibility'
                      : 'More Potential'}
                  </span>
                </div>
              </div>

              {/* AI Summary Quote */}
              {data.aiSummary && (
                <div className="compatibility-ai-quote-box">
                  <Sparkles size={16} className="text-purple-400" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p className="compatibility-ai-quote-text">"{data.aiSummary}"</p>
                </div>
              )}

              {/* Strengths List */}
              {data.strengths.length > 0 && (
                <div className="insights-card-section">
                  <h4 className="insights-card-title">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Profile Strengths ({data.strengths.length})</span>
                  </h4>
                  <ul className="insights-list">
                    {data.strengths.map((str, idx) => (
                      <li key={`str-${idx}`} className="insights-item strength">
                        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions List */}
              {data.suggestions.length > 0 && (
                <div className="insights-card-section">
                  <h4 className="insights-card-title">
                    <Lightbulb size={14} className="text-amber-400" />
                    <span>Actionable Recommendations ({data.suggestions.length})</span>
                  </h4>
                  <ul className="insights-list">
                    {data.suggestions.map((sug, idx) => (
                      <li key={`sug-${idx}`} className="insights-item suggestion">
                        <Lightbulb size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="ai-modal-footer">
          {onOpenEditSection && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditSection('about');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.65rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Improve Profile</span>
              <ArrowRight size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.65rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileAIInsightsModal;
