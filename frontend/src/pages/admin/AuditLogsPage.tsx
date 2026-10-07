import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminAuditLogItem } from '../../types/admin';
import { AdminTable, type Column } from '../../components/admin/AdminTable';
import { useToast } from '../../context/ToastContext';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();
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

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getAuditLogs({
        page,
        limit: 20,
        action: actionFilter,
        search: debouncedSearch,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<AdminAuditLogItem>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '70px',
      render: (l) => <span style={{ fontWeight: 700, color: '#94a3b8' }}>#{l.id}</span>,
    },
    {
      key: 'action',
      header: 'Action Event',
      render: (l) => {
        let color = '#818cf8';
        if (l.action.includes('BANNED')) color = '#f87171';
        if (l.action.includes('SUSPENDED')) color = '#fbbf24';
        if (l.action.includes('APPROVED')) color = '#34d399';
        return (
          <span style={{ fontWeight: 700, color, fontSize: '0.82rem' }}>
            {l.action}
          </span>
        );
      },
    },
    {
      key: 'user',
      header: 'Initiating Identity',
      render: (l) => (
        <div>
          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}>
            {l.userName || 'System / Admin'}
          </div>
          {l.userEmail && <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{l.userEmail}</div>}
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      render: (l) => (
        <span style={{ textTransform: 'capitalize', color: '#cbd5e1', fontSize: '0.82rem' }}>
          {l.entityType} {l.entityId ? `#${l.entityId}` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Audit Description',
      render: (l) => (
        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          {l.description || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (l) => (
        <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
            Compliance & Administrative Audit Trail
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Immutable security ledger of all platform administrative interventions, moderation decisions, and system operations.
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
            placeholder="Search descriptions, emails, or IDs..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="admin-select"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Actions</option>
          <option value="USER_SUSPENDED">USER_SUSPENDED</option>
          <option value="USER_UNSUSPENDED">USER_UNSUSPENDED</option>
          <option value="USER_BANNED">USER_BANNED</option>
          <option value="USER_UNBANNED">USER_UNBANNED</option>
          <option value="REPORT_RESOLVED">REPORT_RESOLVED</option>
          <option value="VERIFICATION_APPROVED">VERIFICATION_APPROVED</option>
          <option value="VERIFICATION_REJECTED">VERIFICATION_REJECTED</option>
          <option value="BROADCAST_ANNOUNCEMENT">BROADCAST_ANNOUNCEMENT</option>
          <option value="SESSIONS_RESET">SESSIONS_RESET</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <AdminTable
        columns={columns}
        data={logs}
        loading={isLoading}
        emptyTitle="No audit logs recorded"
        emptySubtitle="No administrative records match your current criteria."
        emptyIcon="📜"
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
