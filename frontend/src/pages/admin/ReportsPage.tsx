import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminReportListItem } from '../../types/admin';
import { AdminTable, type Column } from '../../components/admin/AdminTable';
import { ResolveReportModal } from '../../components/admin/ResolveReportModal';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../hooks/useSocket';

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<AdminReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [selectedReport, setSelectedReport] = useState<AdminReportListItem | null>(null);

  const toast = useToast();
  const { socket } = useSocket();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getReports({
        page,
        limit: 15,
        status: statusFilter,
        search: debouncedSearch,
      });
      setReports(res.reports);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleNewReport = () => {
      fetchReports();
    };
    socket.on('report:new', handleNewReport);
    socket.on('report:resolved', handleNewReport);
    return () => {
      socket.off('report:new', handleNewReport);
      socket.off('report:resolved', handleNewReport);
    };
  }, [socket, fetchReports]);

  const handleMarkUnderReview = async (reportId: number) => {
    try {
      await adminService.updateReportStatus(reportId, 'under_review');
      toast.info(`Report #${reportId} moved to Under Review.`);
      fetchReports();
    } catch (err: any) {
      toast.error('Failed to update report status.');
    }
  };

  const handleResolveConfirm = async (data: {
    action: 'dismiss' | 'warn' | 'suspend' | 'ban';
    resolutionNotes: string;
    warningMessage?: string;
  }) => {
    if (!selectedReport) return;
    await adminService.resolveReport(selectedReport.id, data);
    toast.success(`Report #${selectedReport.id} successfully resolved (${data.action}).`);
    fetchReports();
  };

  const columns: Column<AdminReportListItem>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '65px',
      render: (r) => (
        <span style={{ fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>#{r.id}</span>
      ),
    },
    {
      key: 'reportedUser',
      header: 'Reported Member',
      width: '200px',
      render: (r) => (
        <div className="admin-user-cell" style={{ minWidth: '160px', maxWidth: '240px' }}>
          <div className="admin-user-thumb" style={{ flexShrink: 0 }}>
            {r.reportedAvatar ? (
              <img src={r.reportedAvatar} alt={r.reportedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              r.reportedName.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="admin-user-name" title={r.reportedName}>
              <Link to={`/admin/users/${r.reportedUserId}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                {r.reportedName}
              </Link>
            </div>
            <div className="admin-user-sub" title={r.reportedEmail}>
              {r.reportedEmail}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'reporter',
      header: 'Reporter',
      width: '160px',
      render: (r) => (
        <div style={{ minWidth: '130px', maxWidth: '200px', overflow: 'hidden' }}>
          <div 
            style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={r.reporterName}
          >
            {r.reporterName}
          </div>
          <div 
            style={{ color: '#64748b', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={r.reporterEmail}
          >
            {r.reporterEmail}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Violation Reason',
      width: '220px',
      render: (r) => (
        <div style={{ minWidth: '170px', maxWidth: '280px' }}>
          <div style={{ fontWeight: 600, color: '#f87171', fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
            {r.reason}
          </div>
          {r.description && (
            <div 
              style={{ color: '#94a3b8', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}
              title={r.description}
            >
              "{r.description}"
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (r) => {
        let cls = 'pending';
        if (r.status === 'resolved') cls = 'resolved';
        if (r.status === 'dismissed') cls = 'dismissed';
        if (r.status === 'under_review') cls = 'suspended';
        return (
          <span className={`admin-status-badge ${cls}`} style={{ whiteSpace: 'nowrap' }}>
            {r.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      width: '110px',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Resolution',
      width: '140px',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
          {r.status === 'pending' && (
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => handleMarkUnderReview(r.id)}
              style={{ padding: '0.3rem 0.55rem', whiteSpace: 'nowrap' }}
              title="Mark Under Review"
            >
              <Clock size={13} />
              <span>Review</span>
            </button>
          )}

          {['pending', 'under_review'].includes(r.status) ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => setSelectedReport(r)}
              style={{ padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
            >
              <CheckCircle size={13} />
              <span>Take Action</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              {r.resolvedByName ? `By ${r.resolvedByName}` : 'Resolved'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Report Resolution & Safety Triage
          </h1>
          <p className="admin-page-subtitle">
            Inspect user reports, review allegations, and enforce platform disciplinary standards.
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
            placeholder="Search by reason, reporter, or reported user..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Reports</option>
          <option value="pending">Pending Only</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Reports Table */}
      <AdminTable
        columns={columns}
        data={reports}
        loading={isLoading}
        emptyTitle="No reports found"
        emptySubtitle="All clear! No reports match your current filtering criteria."
        emptyIcon="🛡️"
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
      />

      {/* Action / Resolution Modal */}
      <ResolveReportModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        reportId={selectedReport?.id || 0}
        reportedUserName={selectedReport?.reportedName || 'Member'}
        reportReason={selectedReport?.reason || 'Violation'}
        onConfirm={handleResolveConfirm}
      />
    </div>
  );
};

export default AdminReportsPage;
