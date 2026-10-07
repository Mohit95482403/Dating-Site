import React, { useState, useEffect, useCallback } from 'react';
import aiService from '../../../services/ai.service';
import type { AIAnalyticsSummary } from '../../../types/ai';
import {
  Sparkles,
  Bot,
  Zap,
  Activity,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export const AIAnalyticsCard: React.FC = () => {
  const [data, setData] = useState<AIAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await aiService.getAIAnalytics();
      setData(summary);
    } catch (err: any) {
      console.error('Failed to load AI analytics:', err);
      setError(err?.response?.data?.message || 'Could not load AI telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div
      className="admin-card"
      style={{
        background: 'linear-gradient(145deg, rgba(30, 27, 46, 0.75) 0%, rgba(18, 16, 28, 0.9) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d8b4fe',
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              AI Intelligence & Telemetry System
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.55)' }}>
              Real-time invocation volume, fallback resiliency, and feature usage
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          title="Refresh AI Metrics"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
          Loading AI telemetry...
        </div>
      ) : error ? (
        <div style={{ color: '#fca5a5', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          {error}
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a855f7', fontSize: '0.75rem' }}>
                <Zap size={13} />
                <span>Total Requests</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {data.totalRequests}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ec4899', fontSize: '0.75rem' }}>
                <Activity size={13} />
                <span>Today</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {data.requestsToday}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6', fontSize: '0.75rem' }}>
                <Sparkles size={13} />
                <span>Most Used Feature</span>
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: '0.45rem',
                  textTransform: 'capitalize',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {data.mostUsedFeature.replace(/_/g, ' ') || 'None'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.75rem' }}>
                <CheckCircle size={13} />
                <span>Success / Fallback</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.45rem' }}>
                <span style={{ color: '#10b981' }}>{data.statusSummary.success}</span> /{' '}
                <span style={{ color: '#f59e0b' }}>{data.statusSummary.fallback}</span>
                {data.statusSummary.error > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>
                    ({data.statusSummary.error} err)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feature Breakdown Pills */}
          {Object.keys(data.breakdown).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Feature Volume:</span>
              {Object.entries(data.breakdown).map(([feat, count]) => (
                <span
                  key={feat}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#d8b4fe',
                  }}
                >
                  {feat.replace(/_/g, ' ')}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AIAnalyticsCard;
