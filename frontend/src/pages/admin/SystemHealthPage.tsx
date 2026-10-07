import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Database,
  Server,
  Radio,
  HardDrive,
  Cpu,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { DetailedSystemHealth, SecurityEventItem } from '../../types/admin';
import { AdminTable, type Column } from '../../components/admin/AdminTable';
import { useToast } from '../../context/ToastContext';

export const AdminSystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<DetailedSystemHealth | null>(null);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const toast = useToast();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setEventsPage(1);
    }, 350);
  };

  const fetchHealth = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoadingHealth(true);
      const data = await adminService.getSystemHealth();
      setHealth(data);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.response?.data?.message || 'Failed to fetch system health telemetry.');
      }
    } finally {
      if (!silent) setIsLoadingHealth(false);
    }
  }, [toast]);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoadingEvents(true);
      const res = await adminService.getSecurityEvents({
        page: eventsPage,
        limit: 15,
        action: actionFilter,
        search: debouncedSearch,
      });
      setEvents(res.events);
      setTotalEvents(res.total);
      setEventsTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load security audit events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [eventsPage, actionFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Periodic Auto-refresh every 15 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    if (status === 'healthy') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          <CheckCircle2 size={12} />
          Operational
        </span>
      );
    }
    if (status === 'degraded') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          <AlertTriangle size={12} />
          Degraded
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        fontSize: '0.75rem',
        fontWeight: 700,
      }}>
        <XCircle size={12} />
        Critical
      </span>
    );
  };

  const columns: Column<SecurityEventItem>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '60px',
      render: (e) => <span style={{ fontWeight: 700, color: '#94a3b8' }}>#{e.id}</span>,
    },
    {
      key: 'action',
      header: 'Security Event',
      render: (e) => {
        let color = '#818cf8';
        let bg = 'rgba(99, 102, 241, 0.15)';
        if (e.action.includes('RATE_LIMIT') || e.action.includes('FAILED')) {
          color = '#f87171';
          bg = 'rgba(239, 68, 68, 0.15)';
        } else if (e.action.includes('UNAUTHORIZED') || e.action.includes('BANNED') || e.action.includes('SUSPENDED')) {
          color = '#fbbf24';
          bg = 'rgba(245, 158, 11, 0.15)';
        } else if (e.action.includes('SUCCESS') || e.action.includes('APPROVED')) {
          color = '#34d399';
          bg = 'rgba(16, 185, 129, 0.15)';
        }
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '6px',
            background: bg,
            color,
            fontSize: '0.78rem',
            fontWeight: 700,
          }}>
            {e.action}
          </span>
        );
      },
    },
    {
      key: 'user',
      header: 'Identity / Source IP',
      render: (e) => (
        <div>
          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.82rem' }}>
            {e.userName || (e.userId ? `User #${e.userId}` : 'Unauthenticated Client')}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.72rem', fontFamily: 'monospace' }}>
            {e.userEmail ? `${e.userEmail} • ` : ''}{e.ipAddress || 'Internal'}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Event Detail',
      render: (e) => (
        <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
          {e.description || 'Security audit recorded.'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (e) => (
        <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {' • '}
          {new Date(e.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* 1. Header Overview & Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              System Health &amp; Security Observability
            </h1>
            {health && getStatusBadge(health.status)}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            Live infrastructure diagnostics, database connection pools, memory utilization, and real-time security events.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn"
            style={{
              background: autoRefresh ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: autoRefresh ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
              color: autoRefresh ? '#818cf8' : '#94a3b8',
              fontSize: '0.8rem',
            }}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity size={14} className={autoRefresh ? 'animate-pulse' : ''} />
            <span>Auto-Refresh: {autoRefresh ? '15s ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              fetchHealth();
              fetchEvents();
            }}
            disabled={isLoadingHealth}
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={isLoadingHealth ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top Subsystems Diagnostic Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        {/* API Gateway */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">REST API Gateway</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Server size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Port 5000</span>
            {health && getStatusBadge(health.subsystems.api.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Security headers, CORS, rate limits enforced</span>
          </div>
        </div>

        {/* Database */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">MySQL Database</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Database size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {health?.subsystems.database.latencyMs !== undefined ? `${health.subsystems.database.latencyMs}ms ping` : 'Checking...'}
            </span>
            {health && getStatusBadge(health.subsystems.database.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>
              Pool: {health?.metrics.dbPoolConnections.total || 1} active • InnoDB optimized
            </span>
          </div>
        </div>

        {/* Socket.IO Real-time */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Socket.IO Gateway</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <Radio size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {health?.metrics.onlineUsers || 0} Online
            </span>
            {health && getStatusBadge(health.subsystems.socketIo.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>WebSocket + WebRTC Signaling active</span>
          </div>
        </div>

        {/* Storage */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Media Storage</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <HardDrive size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>uploads/</span>
            {health && getStatusBadge(health.subsystems.storage.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>MIME-verified • Path traversal defended</span>
          </div>
        </div>

        {/* AI & Personalization */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">AI Engine</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Cpu size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {health?.subsystems.aiService.details?.provider || 'Algorithmic'}
            </span>
            {health && getStatusBadge(health.subsystems.aiService.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Fallback active • Prompt injection safe</span>
          </div>
        </div>

        {/* Payment Subsystem */}
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-title">Payment Architecture</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Idempotent</span>
            {health && getStatusBadge(health.subsystems.paymentService.status)}
          </div>
          <div className="admin-stat-meta" style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Webhook signatures &amp; transactions safe</span>
          </div>
        </div>
      </div>

      {/* 3. Deep Telemetry & Memory Details */}
      {health && (
        <div className="admin-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <div className="admin-card-header" style={{ marginBottom: '1rem' }}>
            <div className="admin-card-title">
              <Activity size={18} className="text-indigo-400" />
              <span>Process Performance &amp; Node.js Diagnostics</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Last updated: {lastRefreshedAt.toLocaleTimeString()}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center',
          }}>
            {/* Heap Usage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Heap Memory</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>
                  {health.memory.heapUsedMb} MB / {health.memory.heapTotalMb} MB
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((health.memory.heapUsedMb / health.memory.heapTotalMb) * 100))}%`,
                  background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                  borderRadius: '4px',
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>RSS: {health.memory.rssMb} MB</span>
            </div>

            {/* Uptime */}
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Process Uptime</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                {formatUptime(health.uptimeSeconds)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Environment: {health.environment} (v{health.version})</span>
            </div>

            {/* 24h Alerts */}
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>24h Security Alerts</div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: health.metrics.recentSecurityAlerts > 0 ? '#fbbf24' : '#34d399',
              }}>
                {health.metrics.recentSecurityAlerts} triggers
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Brute-force, rate limits, and access violations</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Security Audit Log Stream */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} color="#f87171" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Security Event Audit Trail
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
              Real-time security log capturing failed logins, rate limit triggers, authorization breaches, and administrative decisions.
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="admin-filter-bar">
          <div className="admin-search-box">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search security descriptions, IPs, emails..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <select
            className="admin-select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setEventsPage(1);
            }}
          >
            <option value="all">All Security Actions</option>
            <option value="RATE_LIMIT_TRIGGERED">RATE_LIMIT_TRIGGERED</option>
            <option value="FAILED_LOGIN">FAILED_LOGIN</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_BANNED">USER_BANNED</option>
            <option value="USER_SUSPENDED">USER_SUSPENDED</option>
            <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
            <option value="ADMIN_ACTION">ADMIN_ACTION</option>
            <option value="VERIFICATION_REJECTED">VERIFICATION_REJECTED</option>
          </select>
        </div>

        {/* Security Events Table */}
        <AdminTable
          columns={columns}
          data={events}
          loading={isLoadingEvents}
          emptyTitle="No security events recorded"
          emptySubtitle="No security alerts match the selected criteria."
          emptyIcon="🛡️"
          page={eventsPage}
          totalPages={eventsTotalPages}
          totalItems={totalEvents}
          onPageChange={(p) => setEventsPage(p)}
        />
      </div>
    </div>
  );
};

export default AdminSystemHealthPage;
