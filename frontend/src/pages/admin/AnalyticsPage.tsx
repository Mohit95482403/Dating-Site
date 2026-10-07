import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Heart,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Flame,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import type {
  AnalyticsOverviewPayload,
  DateRangeFilter,
} from '../../types/analytics';
import { AnalyticsHeader } from '../../components/admin/analytics/AnalyticsHeader';
import { AnalyticsKpiCard } from '../../components/admin/analytics/AnalyticsKpiCard';
import { UserGrowthChart } from '../../components/admin/analytics/UserGrowthChart';
import { EngagementChart } from '../../components/admin/analytics/EngagementChart';
import { MatchingFunnelChart } from '../../components/admin/analytics/MatchingFunnelChart';
import { MessageStatsCard } from '../../components/admin/analytics/MessageStatsCard';
import { ProfileDistributionChart } from '../../components/admin/analytics/ProfileDistributionChart';
import { SafetyModerationSection } from '../../components/admin/analytics/SafetyModerationSection';
import { RetentionCohortTable } from '../../components/admin/analytics/RetentionCohortTable';
import { AdminWorkloadTable } from '../../components/admin/analytics/AdminWorkloadTable';
import { PlatformHealthCard } from '../../components/admin/analytics/PlatformHealthCard';
import { KeyInsightsList } from '../../components/admin/analytics/KeyInsightsList';
import { AnalyticsDetailTable } from '../../components/admin/analytics/AnalyticsDetailTable';
import { AIAnalyticsCard } from '../../components/admin/analytics/AIAnalyticsCard';
import {
  AnalyticsCardSkeleton,
  ChartSkeleton,
  FunnelSkeleton,
} from '../../components/admin/analytics/AnalyticsSkeletons';
import { socketService } from '../../services/socket';

export const AdminAnalyticsPage: React.FC = () => {
  const [filter, setFilter] = useState<DateRangeFilter>({ range: '30d' });
  const [data, setData] = useState<AnalyticsOverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  const debounceTimerRef = useRef<any>(null);

  const fetchAnalytics = useCallback(async (currentFilter: DateRangeFilter, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const res = await analyticsService.getOverview(currentFilter);
      setData(res);

      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Platform analytics could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and on filter change
  useEffect(() => {
    fetchAnalytics(filter);
  }, [filter, fetchAnalytics]);

  // Socket.IO real-time event listener (debounced refresh)
  useEffect(() => {
    socketService.connect();

    const handleRealtimePing = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchAnalytics(filter, true);
      }, 8000); // 8-second debounce to batch events and prevent request storm
    };

    socketService.on('notification', handleRealtimePing);
    socketService.on('user_presence_change', handleRealtimePing);
    socketService.on('new_match', handleRealtimePing);
    socketService.on('report_status_update', handleRealtimePing);
    socketService.on('verification_status_update', handleRealtimePing);

    return () => {
      socketService.off('notification', handleRealtimePing);
      socketService.off('user_presence_change', handleRealtimePing);
      socketService.off('new_match', handleRealtimePing);
      socketService.off('report_status_update', handleRealtimePing);
      socketService.off('verification_status_update', handleRealtimePing);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filter, fetchAnalytics]);

  const handleFilterChange = (newFilter: DateRangeFilter) => {
    setFilter(newFilter);
  };

  const handleRefresh = () => {
    fetchAnalytics(filter, true);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await analyticsService.downloadCsv(filter);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to export CSV report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header with Date Range Selector & Actions */}
      <AnalyticsHeader
        currentFilter={filter}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdatedTime}
      />

      {/* Error State */}
      {error && !isLoading && (
        <div
          className="admin-card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            textAlign: 'center',
            padding: '2.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={36} color="#f87171" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
            Analytics could not be loaded.
          </h3>
          <p style={{ color: '#fca5a5', fontSize: '0.88rem', marginBottom: '1.25rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
            {error}
          </p>
          <button
            onClick={() => fetchAnalytics(filter)}
            className="admin-btn admin-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton View */}
      {isLoading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <AnalyticsCardSkeleton key={n} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <FunnelSkeleton />
        </div>
      )}

      {/* Main Real Analytics Content */}
      {!isLoading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Platform Operating Health */}
          <PlatformHealthCard health={data.platformHealth} />

          {/* 2. Executive Insights */}
          <KeyInsightsList insights={data.insights} />

          {/* 3. Primary KPI Cards Grid */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
              Core Performance Indicators
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <AnalyticsKpiCard
                title="Total Users"
                metric={data.kpis.totalUsers}
                icon={<Users size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#6366f1"
                subtitle="All Registered Members"
              />
              <AnalyticsKpiCard
                title="New Signups"
                metric={data.kpis.newUsers}
                icon={<Users size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#818cf8"
                subtitle="Acquired in Period"
              />
              <AnalyticsKpiCard
                title="Active Members"
                metric={data.kpis.activeUsers}
                icon={<UserCheck size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#10b981"
                badge={
                  <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    DAU: {data.kpis.dau}
                  </span>
                }
              />
              <AnalyticsKpiCard
                title="Likes Expressed"
                metric={data.kpis.totalLikes}
                icon={<Heart size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#ec4899"
              />
              <AnalyticsKpiCard
                title="Super Likes"
                metric={data.kpis.totalSuperLikes}
                icon={<Flame size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#38bdf8"
              />
              <AnalyticsKpiCard
                title="Mutual Matches"
                metric={data.kpis.totalMatches}
                icon={<Sparkles size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#a855f7"
              />
              <AnalyticsKpiCard
                title="Messages Exchanged"
                metric={data.kpis.totalMessages}
                icon={<MessageSquare size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#3b82f6"
              />
              <AnalyticsKpiCard
                title="Pending Reports"
                metric={data.kpis.pendingReports}
                icon={<AlertTriangle size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#f43f5e"
              />
              <AnalyticsKpiCard
                title="Resolved Reports"
                metric={data.kpis.resolvedReports}
                icon={<CheckCircle size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#10b981"
              />
              <AnalyticsKpiCard
                title="Pending Verifications"
                metric={data.kpis.pendingVerification}
                icon={<ShieldCheck size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#fbbf24"
              />
              <AnalyticsKpiCard
                title="Verified Profiles"
                metric={data.kpis.verifiedUsers}
                icon={<ShieldCheck size={18} />}
                comparisonLabel={data.window.label}
                accentColor="#10b981"
                subtitle="Approved Identity Badges"
              />
            </div>
          </div>

          {/* 4. Core Visual Charts: User Growth & Multi-Series Engagement */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1.5rem' }}>
            <UserGrowthChart
              data={data.userGrowth}
              dau={data.kpis.dau}
              wau={data.kpis.wau}
              mau={data.kpis.mau}
            />
            <EngagementChart data={data.engagement} />
          </div>

          {/* 5. Matching Funnel & Conversion Rates */}
          <MatchingFunnelChart data={data.matchingFunnel} />

          {/* 6. Message, Conversation & Reaction Velocity */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
              Communication & Interpersonal Interaction
            </h3>
            <MessageStatsCard data={data.messages} />
          </div>

          {/* 7. Profile Quality & Photo Distribution */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
              Profile Completion & Portfolio Health
            </h3>
            <ProfileDistributionChart data={data.profiles} />
          </div>

          {/* 7b. Day 20 AI System Intelligence & Telemetry */}
          <div>
            <AIAnalyticsCard />
          </div>

          {/* 8. Safety, Reports Triage & Verification Performance */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
              Safety, Moderation & Identity Verification
            </h3>
            <SafetyModerationSection safety={data.safety} verification={data.verification} />
          </div>

          {/* 9. Retention Cohort & Admin Staff Operations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
            <RetentionCohortTable data={data.retention} />
            <AdminWorkloadTable workload={data.safety.adminWorkload} />
          </div>

          {/* 10. Period Audit Variance Table */}
          <AnalyticsDetailTable kpis={data.kpis} comparisonLabel={data.window.label} />
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
