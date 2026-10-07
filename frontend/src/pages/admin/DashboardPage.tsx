import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Heart,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Send,
  Shield,
  Activity,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminDashboardStats, AdminDateRange } from '../../types/admin';
import { AdminTrendChart } from '../../components/admin/AdminTrendChart';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [range, setRange] = useState<AdminDateRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (r: AdminDateRange) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getDashboardStats(r);
      setStats(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(range);
  }, [range, fetchStats]);

  const handleRangeChange = (newRange: AdminDateRange) => {
    setRange(newRange);
  };

  if (isLoading && !stats) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p>Loading real-time platform metrics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="admin-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', textAlign: 'center', padding: '2.5rem' }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
        <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Failed to Load Dashboard Metrics</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.25rem' }}>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => fetchStats(range)}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Header Overview & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
            System Executive Overview
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Real database aggregates, security monitoring, and platform operations.
          </p>
        </div>

        <div className="admin-range-tabs">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`admin-range-btn ${range === r ? 'active' : ''}`}
              onClick={() => handleRangeChange(r)}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Total Users</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="admin-stat-value">{stats?.totalUsers.toLocaleString()}</div>
          <div className="admin-stat-meta">
            <UserCheck size={13} color="#10b981" />
            <span style={{ color: '#34d399' }}>{stats?.activeUsers} Active</span>
            <span style={{ color: '#64748b' }}>• {stats?.newUsers} new</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Total Matches</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <Heart size={18} />
            </div>
          </div>
          <div className="admin-stat-value">{stats?.totalMatches.toLocaleString()}</div>
          <div className="admin-stat-meta">
            <TrendingUp size={13} color="#ec4899" />
            <span>Successful connections</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Total Messages</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="admin-stat-value">{stats?.totalMessages.toLocaleString()}</div>
          <div className="admin-stat-meta">
            <Activity size={13} color="#60a5fa" />
            <span>Real-time communication</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Pending Reports</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="admin-stat-value" style={{ color: stats?.pendingReports ? '#f87171' : '#ffffff' }}>
            {stats?.pendingReports}
          </div>
          <div className="admin-stat-meta">
            <Link to="/admin/reports" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 600 }}>
              Review triage →
            </Link>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Pending Verification</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="admin-stat-value" style={{ color: stats?.pendingVerifications ? '#34d399' : '#ffffff' }}>
            {stats?.pendingVerifications}
          </div>
          <div className="admin-stat-meta">
            <Link to="/admin/verification" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 600 }}>
              Review submissions →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Triage & Operations Shortcuts
        </h3>
        <div className="admin-quick-grid">
          <Link to="/admin/reports" className="admin-quick-btn">
            <AlertTriangle size={18} color="#f87171" />
            <span>Pending Reports ({stats?.pendingReports || 0})</span>
          </Link>
          <Link to="/admin/verification" className="admin-quick-btn">
            <ShieldCheck size={18} color="#34d399" />
            <span>Identity Submissions ({stats?.pendingVerifications || 0})</span>
          </Link>
          <Link to="/admin/users" className="admin-quick-btn">
            <Users size={18} color="#818cf8" />
            <span>Directory & Moderation</span>
          </Link>
          <Link to="/admin/notifications" className="admin-quick-btn">
            <Send size={18} color="#38bdf8" />
            <span>Send Announcement</span>
          </Link>
        </div>
      </div>

      {/* 4. Real Trend Charts */}
      {stats?.charts && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <TrendingUp size={18} className="text-indigo-400" />
              <span>Platform Trajectory & Growth ({range.toUpperCase()})</span>
            </div>
          </div>
          <AdminTrendChart
            labels={stats.charts.labels}
            userGrowth={stats.charts.userGrowth}
            matchGrowth={stats.charts.matchGrowth}
            messageGrowth={stats.charts.messageGrowth}
            reportGrowth={stats.charts.reportGrowth}
          />
        </div>
      )}

      {/* 5. Real Recent Activity Feed */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">
            <Activity size={18} className="text-pink-400" />
            <span>Live Platform Event Stream</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Latest 10 MySQL events</span>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.recentActivity.map((act) => (
              <div
                key={act.id + act.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#0d0f18',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        act.type === 'report_submitted' ? 'rgba(239, 68, 68, 0.15)' :
                        act.type === 'verification_submitted' ? 'rgba(59, 130, 246, 0.15)' :
                        act.type === 'user_moderated' ? 'rgba(245, 158, 11, 0.15)' :
                        'rgba(99, 102, 241, 0.15)',
                      color:
                        act.type === 'report_submitted' ? '#f87171' :
                        act.type === 'verification_submitted' ? '#60a5fa' :
                        act.type === 'user_moderated' ? '#fbbf24' :
                        '#818cf8',
                    }}
                  >
                    {act.type === 'report_submitted' ? <AlertTriangle size={16} /> :
                     act.type === 'verification_submitted' ? <ShieldCheck size={16} /> :
                     act.type === 'user_moderated' ? <Shield size={16} /> :
                     <UserPlus size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {act.description}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(act.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📡</div>
            <div className="admin-empty-title">No recent activity detected</div>
            <p>Database activity log is currently clear.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
