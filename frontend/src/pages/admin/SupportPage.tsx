import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  MessageSquare,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { socketService } from '../../services/socket';
import {
  formatDateSafe,
  formatDateTimeSafe,
  formatTimeSafe,
  formatNumberSafe,
} from '../../utils/helpers';
import type { SupportTicketItem, SupportMessageItem, SupportStats } from '../../types/admin';

export const AdminSupportPage: React.FC = () => {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket detail state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminService.getSupportStats();
      setStats(data);
    } catch {
      // Stats non-blocking
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminService.getSupportTickets({
        page,
        limit: 15,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTickets(Array.isArray(res?.tickets) ? res.tickets : []);
      setTotal(Number(res?.total || 0));
      setTotalPages(Number(res?.totalPages || 1));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch support tickets.');
      setTickets([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const handleTicketUpdate = () => {
      fetchStats();
      fetchTickets();
    };

    socketService.on('support:ticket_created', handleTicketUpdate);
    socketService.on('support:ticket_activity', handleTicketUpdate);
    socketService.on('support:status_changed', handleTicketUpdate);

    return () => {
      socketService.off('support:ticket_created', handleTicketUpdate);
      socketService.off('support:ticket_activity', handleTicketUpdate);
      socketService.off('support:status_changed', handleTicketUpdate);
    };
  }, [fetchStats, fetchTickets]);

  const openTicketDetail = async (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket);
    setIsDetailLoading(true);
    try {
      const res = await adminService.getSupportTicketDetail(ticket.id);
      setSelectedTicket(res.ticket);
      setMessages(res.messages);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load ticket conversation');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setIsSubmittingReply(true);
      const newMsg = await adminService.replySupportTicket(
        selectedTicket.id,
        replyText.trim(),
        isInternalNote
      );
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setIsInternalNote(false);
      // Refresh list
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await adminService.updateSupportTicketStatus(selectedTicket.id, newStatus);
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update ticket status.');
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent':
        return '#f43f5e';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#fbbf24';
      default:
        return '#94a3b8';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <span className="admin-status-badge status-open" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>Open</span>;
      case 'in_progress':
        return <span className="admin-status-badge status-in_progress" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>In Progress</span>;
      case 'waiting_for_user':
        return <span className="admin-status-badge status-waiting" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>Waiting User</span>;
      case 'resolved':
        return <span className="admin-status-badge status-resolved" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>Resolved</span>;
      case 'closed':
        return <span className="admin-status-badge status-closed" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>Closed</span>;
      default:
        return <span className="admin-status-badge">{s}</span>;
    }
  };

  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LifeBuoy size={24} color="#38bdf8" />
            User Support &amp; Help Desk
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
            Triaged customer inquiry tickets, user messaging, resolution auditing &amp; staff collaboration
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={() => {
            fetchStats();
            fetchTickets();
          }}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Sync Desk</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="admin-kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-title">Open Tickets</span>
              <AlertCircle size={18} color="#38bdf8" />
            </div>
            <div className="admin-kpi-val" style={{ color: '#38bdf8' }}>
              {formatNumberSafe(stats.openTickets)}
            </div>
            <div className="admin-kpi-footer">
              <span className="admin-kpi-subtext">Awaiting staff response</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-title">In Progress</span>
              <Clock size={18} color="#fbbf24" />
            </div>
            <div className="admin-kpi-val" style={{ color: '#fbbf24' }}>
              {formatNumberSafe(stats.inProgressTickets)}
            </div>
            <div className="admin-kpi-footer">
              <span className="admin-kpi-subtext">Active staff investigations</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-title">Urgent Priority</span>
              <AlertCircle size={18} color="#f43f5e" />
            </div>
            <div className="admin-kpi-val" style={{ color: '#f43f5e' }}>
              {formatNumberSafe(stats.urgentTickets ?? stats.urgentOpenTickets)}
            </div>
            <div className="admin-kpi-footer">
              <span className="admin-kpi-subtext">Immediate triage required</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-title">Resolved Total</span>
              <CheckCircle size={18} color="#34d399" />
            </div>
            <div className="admin-kpi-val" style={{ color: '#34d399' }}>
              {formatNumberSafe(stats.resolvedTickets)}
            </div>
            <div className="admin-kpi-footer">
              <span className="admin-kpi-subtext">Total solved tickets</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#131722',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, user email or subject..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#1a1f2e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_user">Waiting for User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#1a1f2e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#1a1f2e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="all">All Categories</option>
            <option value="account">Account</option>
            <option value="login">Login</option>
            <option value="profile">Profile</option>
            <option value="messages">Messages</option>
            <option value="calls">Calls</option>
            <option value="payments">Payments</option>
            <option value="subscription">Subscription</option>
            <option value="safety">Safety</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Total Tickets: <strong style={{ color: '#fff' }}>{formatNumberSafe(total)}</strong>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <div style={{
              width: '28px',
              height: '28px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 0.75rem'
            }} />
            <span>Loading support queue...</span>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#f87171' }}>
            <p>{error}</p>
            <button type="button" className="admin-btn admin-btn-outline" onClick={fetchTickets}>
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <LifeBuoy size={36} color="#334155" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No support tickets found.</p>
            <span style={{ fontSize: '0.78rem' }}>Adjust search or filters to inspect tickets</span>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openTicketDetail(t)}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                      {t.ticketNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem' }}>
                      {t.userName || 'Member'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {t.userEmail}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject}
                    </div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.78rem', color: '#cbd5e1' }}>
                      {t.category}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: getPriorityColor(t.priority),
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td>{getStatusBadge(t.status)}</td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {formatDateSafe(t.createdAt)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTicketDetail(t);
                      }}
                      style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                    >
                      <MessageSquare size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Conversation Detail Drawer / Modal */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setSelectedTicket(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              height: '100vh',
              background: '#111420',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                    {selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: getPriorityColor(selectedTicket.priority) }}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem' }}>
                  {selectedTicket.subject}
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  User: <strong style={{ color: '#e2e8f0' }}>{selectedTicket.userName || 'Member'}</strong> ({selectedTicket.userEmail}) • Category: {selectedTicket.category}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Status Control */}
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>Change Status:</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    background: '#1e2433',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    outline: 'none',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_for_user">Waiting for User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Submitted: {formatDateTimeSafe(selectedTicket.createdAt)}
              </div>
            </div>

            {/* Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  Loading conversation history...
                </div>
              ) : (
                messages.map((m) => {
                  const isStaff = m.senderRole === 'admin' || m.senderRole === 'moderator';
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: m.isInternalNote
                          ? 'rgba(251, 191, 36, 0.08)'
                          : isStaff
                          ? 'rgba(99, 102, 241, 0.12)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: m.isInternalNote
                          ? '1px dashed rgba(251, 191, 36, 0.4)'
                          : isStaff
                          ? '1px solid rgba(99, 102, 241, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isStaff ? '#6366f1' : '#38bdf8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {isStaff ? 'S' : 'U'}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                            {m.senderName || (isStaff ? 'Connectly Staff' : 'User')}
                          </span>
                          {m.isInternalNote && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(251, 191, 36, 0.2)',
                                color: '#fbbf24',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                              }}
                            >
                              <Lock size={10} /> Staff Internal Note
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {formatTimeSafe(m.createdAt)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {m.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer */}
            <form
              onSubmit={handleSendReply}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#0d101a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#fbbf24', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                  />
                  <span>Post as Private Internal Note (User will NOT see this)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Write internal staff note for investigation logs...'
                      : 'Write a response to the user...'
                  }
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: isInternalNote
                      ? '1px dashed rgba(251, 191, 36, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyText.trim()}
                  className="admin-btn admin-btn-primary"
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: isInternalNote
                      ? 'linear-gradient(135deg, #d97706, #b45309)'
                      : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmittingReply ? 'Sending...' : isInternalNote ? 'Save Note' : 'Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportPage;
