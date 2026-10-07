import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit,
  RotateCw,
  Eye,
  MousePointer,
  Heart,
  EyeOff,
  Sliders,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import personalizationService from '../../services/personalization.service';
import type { AdminPersonalizationAnalytics, RecommendationExperiment } from '../../types/personalization';
import { useSocket } from '../../hooks/useSocket';
import '../../styles/admin.css';

export const RecommendationsPage: React.FC = () => {
  const { socket } = useSocket();
  const [analytics, setAnalytics] = useState<AdminPersonalizationAnalytics | null>(null);
  const [experiments, setExperiments] = useState<RecommendationExperiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const res = await personalizationService.getAdminAnalytics();
      setAnalytics(res.analytics);
      setExperiments(res.experiments);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch recommendation analytics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchData(true);
    };

    socket.on('recommendations:updated', handleUpdate);
    return () => {
      socket.off('recommendations:updated', handleUpdate);
    };
  }, [socket, fetchData]);

  if (isLoading && !analytics) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#ec4899',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p>Loading recommendation telemetry &amp; A/B experiment data...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BrainCircuit size={28} color="#ec4899" />
            <span>Recommendation Intelligence &amp; Telemetry</span>
          </h1>
          <p className="admin-page-desc">
            Day 26 Behavioral Learning Model • Candidate Generation • A/B Experiments • Exposure CTR
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="btn-admin secondary"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCw size={15} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {analytics && (
        <>
          {/* KPI Summary Cards */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Total Impressions</span>
                <Eye size={18} color="#818cf8" />
              </div>
              <div className="admin-kpi-val">{analytics.totalImpressions.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span className="admin-kpi-badge positive">Live exposures tracked</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Overall CTR</span>
                <MousePointer size={18} color="#ec4899" />
              </div>
              <div className="admin-kpi-val" style={{ color: '#ec4899' }}>
                {analytics.ctr}%
              </div>
              <div className="admin-kpi-footer">
                <span className="admin-kpi-subtext">{analytics.totalClicks.toLocaleString()} total clicks</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Positive Like Signals</span>
                <Heart size={18} color="#f43f5e" />
              </div>
              <div className="admin-kpi-val">{analytics.totalLikes.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span className="admin-kpi-subtext">Direct card actions &amp; matches</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Negative Feedback Rate</span>
                <EyeOff size={18} color="#fbbf24" />
              </div>
              <div className="admin-kpi-val">{analytics.notInterestedRate}%</div>
              <div className="admin-kpi-footer">
                <span className="admin-kpi-subtext">{analytics.totalFeedback} dismissals recorded</span>
              </div>
            </div>
          </div>

          {/* A/B Experiments Breakdown */}
          <div className="admin-card" style={{ marginTop: '1.5rem' }}>
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sliders size={20} color="#6366f1" />
                <h3 className="admin-card-title">Recommendation A/B Experiments</h3>
              </div>
              <span className="admin-badge blue">
                {experiments.length} Active Buckets
              </span>
            </div>

            <div className="admin-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Experiment</th>
                      <th>Version</th>
                      <th>Traffic</th>
                      <th>Assigned Users</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                      <th>Like Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.experimentPerformance.map((exp) => {
                      const expDef = experiments.find((e) => e.version === exp.version);
                      return (
                        <tr key={exp.version}>
                          <td>
                            <strong style={{ color: '#ffffff' }}>{exp.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {expDef?.description || 'Scoring variant'}
                            </div>
                          </td>
                          <td>
                            <span className="admin-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                              {exp.version.toUpperCase()}
                            </span>
                          </td>
                          <td>{expDef ? `${expDef.traffic_percentage}%` : '50%'}</td>
                          <td>{exp.users.toLocaleString()}</td>
                          <td>{exp.impressions.toLocaleString()}</td>
                          <td>{exp.clicks.toLocaleString()}</td>
                          <td>
                            <strong style={{ color: exp.ctr > 5 ? '#34d399' : '#f1f5f9' }}>
                              {exp.ctr}%
                            </strong>
                          </td>
                          <td>{exp.likeRate}%</td>
                          <td>
                            <span className="admin-badge green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Performance By Recommendation Type */}
          <div className="admin-card" style={{ marginTop: '1.5rem' }}>
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Layers size={20} color="#ec4899" />
                <h3 className="admin-card-title">Performance by Recommendation Entity Type</h3>
              </div>
            </div>

            <div className="admin-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Recommendation Type</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                      <th>Engagement Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recommendationTypeBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                          No exposure telemetry recorded yet.
                        </td>
                      </tr>
                    ) : (
                      analytics.recommendationTypeBreakdown.map((item) => {
                        const totalClicks = analytics.totalClicks || 1;
                        const share = Number(((item.clicks / totalClicks) * 100).toFixed(1));
                        return (
                          <tr key={item.type}>
                            <td>
                              <span className="admin-badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                                {item.type}
                              </span>
                            </td>
                            <td>{item.impressions.toLocaleString()}</td>
                            <td>{item.clicks.toLocaleString()}</td>
                            <td>
                              <strong style={{ color: item.ctr > 5 ? '#34d399' : '#f1f5f9' }}>
                                {item.ctr}%
                              </strong>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: '6px',
                                    borderRadius: '3px',
                                    background: 'rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                    maxWidth: '120px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.min(100, share)}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Recommendation Feedback */}
          <div className="admin-card" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <EyeOff size={20} color="#f59e0b" />
                <h3 className="admin-card-title">Recent User Recommendation Feedback &amp; Penalties</h3>
              </div>
              <span className="admin-badge yellow">Repetition &amp; Dislike Tracker</span>
            </div>

            <div className="admin-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User ID</th>
                      <th>Type</th>
                      <th>Entity ID</th>
                      <th>Feedback Signal</th>
                      <th>Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                          No negative feedback logged. Recommendation quality is healthy!
                        </td>
                      </tr>
                    ) : (
                      analytics.recentFeedback.map((fb) => (
                        <tr key={fb.id}>
                          <td>{new Date(fb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                          <td>#{fb.user_id}</td>
                          <td>
                            <span className="admin-badge blue">{fb.recommendation_type}</span>
                          </td>
                          <td>#{fb.entity_id}</td>
                          <td>
                            <span
                              className="admin-badge"
                              style={{
                                background:
                                  fb.feedback_type === 'NOT_INTERESTED'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  fb.feedback_type === 'NOT_INTERESTED'
                                    ? '#f87171'
                                    : '#fbbf24',
                              }}
                            >
                              {fb.feedback_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td>{fb.reason || 'User clicked "Not interested"'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationsPage;
