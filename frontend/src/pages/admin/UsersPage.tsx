import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShieldAlert,
  Eye,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  KeyRound,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminUserListItem } from '../../types/admin';
import { AdminTable, type Column } from '../../components/admin/AdminTable';
import { SuspendUserModal } from '../../components/admin/SuspendUserModal';
import { getMediaUrl } from '../../utils/media';
import { BanUserModal } from '../../components/admin/BanUserModal';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserListItem | null>(null);
  const [unsuspendTarget, setUnsuspendTarget] = useState<AdminUserListItem | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUserListItem | null>(null);
  const [resetSessionsTarget, setResetSessionsTarget] = useState<AdminUserListItem | null>(null);

  const toast = useToast();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle Search Input with 350ms Debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getUsers({
        page,
        limit: 15,
        search: debouncedSearch,
        status: statusFilter,
        verification: verificationFilter,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch users directory.');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, verificationFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Actions
  const handleSuspendConfirm = async (reason: string) => {
    if (!suspendTarget) return;
    await adminService.suspendUser(suspendTarget.id, reason);
    toast.success(`User ${suspendTarget.firstName || 'User'} suspended successfully.`);
    fetchUsers();
  };

  const handleBanConfirm = async (reason: string) => {
    if (!banTarget) return;
    await adminService.banUser(banTarget.id, reason);
    toast.success(`User ${banTarget.firstName || 'User'} has been permanently banned.`);
    fetchUsers();
  };

  const handleUnsuspendConfirm = async () => {
    if (!unsuspendTarget) return;
    await adminService.unsuspendUser(unsuspendTarget.id, 'Administrative reinstatement');
    toast.success(`Suspension lifted for ${unsuspendTarget.firstName || 'User'}.`);
    fetchUsers();
  };

  const handleUnbanConfirm = async () => {
    if (!unbanTarget) return;
    await adminService.unbanUser(unbanTarget.id, 'Administrative pardon');
    toast.success(`Ban removed for ${unbanTarget.firstName || 'User'}.`);
    fetchUsers();
  };

  const handleResetSessionsConfirm = async () => {
    if (!resetSessionsTarget) return;
    await adminService.resetSessions(resetSessionsTarget.id, 'Administrative session reset');
    toast.success(`Active sessions revoked for ${resetSessionsTarget.firstName || 'User'}.`);
  };

  const columns: Column<AdminUserListItem>[] = [
    {
      key: 'user',
      header: 'Member Profile',
      render: (u) => (
        <div className="admin-user-cell">
          <div className="admin-user-thumb">
            {u.avatarUrl ? (
              <img src={getMediaUrl(u.avatarUrl)} alt={u.firstName || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (u.firstName ? u.firstName.charAt(0).toUpperCase() : 'U')
            )}
          </div>
          <div>
            <div className="admin-user-name">
              {u.firstName || 'Unnamed'} {u.lastName || ''}
              {u.role === 'admin' && (
                <span className="admin-badge-sub" style={{ marginLeft: '0.4rem' }}>Admin</span>
              )}
            </div>
            <div className="admin-user-sub">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (u) => {
        let cls = 'active';
        if (u.status === 'suspended') cls = 'suspended';
        if (u.status === 'banned') cls = 'banned';
        return (
          <span className={`admin-status-badge ${cls}`}>
            {u.status}
          </span>
        );
      },
    },
    {
      key: 'verification',
      header: 'ID Verified',
      render: (u) => (
        u.isVerified ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>
            <CheckCircle size={14} />
            <span>Verified</span>
          </span>
        ) : (
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>— Unverified</span>
        )
      ),
    },
    {
      key: 'reports',
      header: 'Safety Reports',
      render: (u) => (
        u.reportsReceivedCount > 0 ? (
          <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertTriangle size={13} />
            <span>{u.reportsReceivedCount} reported</span>
          </span>
        ) : (
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Clean (0)</span>
        )
      ),
    },
    {
      key: 'joined',
      header: 'Registration',
      render: (u) => (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Administrative Actions',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <Link
            to={`/admin/users/${u.id}`}
            className="admin-btn admin-btn-outline"
            style={{ padding: '0.3rem 0.6rem' }}
            title="Inspect Details"
          >
            <Eye size={13} />
            <span>Inspect</span>
          </Link>

          {u.role !== 'admin' && (
            <>
              {u.status === 'suspended' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-success"
                  onClick={() => setUnsuspendTarget(u)}
                  style={{ padding: '0.3rem 0.6rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Unsuspend</span>
                </button>
              ) : u.status === 'banned' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-success"
                  onClick={() => setUnbanTarget(u)}
                  style={{ padding: '0.3rem 0.6rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Unban</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-warning"
                    onClick={() => setSuspendTarget(u)}
                    style={{ padding: '0.3rem 0.6rem' }}
                  >
                    <AlertTriangle size={13} />
                    <span>Suspend</span>
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => setBanTarget(u)}
                    style={{ padding: '0.3rem 0.6rem' }}
                  >
                    <ShieldAlert size={13} />
                    <span>Ban</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setResetSessionsTarget(u)}
                style={{ padding: '0.3rem 0.5rem' }}
                title="Invalidate Sessions"
              >
                <KeyRound size={13} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
            User Management Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            {total} registered users on Connectly. Search, moderate, inspect, and enforce safety policies.
          </p>
        </div>
      </div>

      {/* Filter and Debounced Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, email, or user ID..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="banned">Banned Only</option>
          </select>

          <select
            className="admin-select"
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Verifications</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
            <option value="pending">Pending Verification</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <AdminTable
        columns={columns}
        data={users}
        loading={isLoading}
        emptyTitle="No users matched your query"
        emptySubtitle="Try adjusting your search criteria or status filters."
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
      />

      {/* Modals */}
      <SuspendUserModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        userId={suspendTarget?.id || 0}
        userName={suspendTarget?.firstName || 'User'}
        onConfirm={handleSuspendConfirm}
      />

      <BanUserModal
        isOpen={!!banTarget}
        onClose={() => setBanTarget(null)}
        userId={banTarget?.id || 0}
        userName={banTarget?.firstName || 'User'}
        onConfirm={handleBanConfirm}
      />

      <ConfirmActionModal
        isOpen={!!unsuspendTarget}
        onClose={() => setUnsuspendTarget(null)}
        title="Lift Account Suspension"
        message={`Reactivate account access for ${unsuspendTarget?.firstName || 'User'} (${unsuspendTarget?.email})?`}
        confirmText="Lift Suspension"
        confirmVariant="success"
        onConfirm={handleUnsuspendConfirm}
      />

      <ConfirmActionModal
        isOpen={!!unbanTarget}
        onClose={() => setUnbanTarget(null)}
        title="Remove Permanent Ban"
        message={`Pardon and restore account access for ${unbanTarget?.firstName || 'User'} (${unbanTarget?.email})?`}
        confirmText="Remove Ban"
        confirmVariant="success"
        onConfirm={handleUnbanConfirm}
      />

      <ConfirmActionModal
        isOpen={!!resetSessionsTarget}
        onClose={() => setResetSessionsTarget(null)}
        title="Invalidate Active Sessions"
        message={`Force-logout all active browsers and sessions for ${resetSessionsTarget?.firstName || 'User'}?`}
        confirmText="Revoke Sessions"
        confirmVariant="warning"
        onConfirm={handleResetSessionsConfirm}
      />
    </div>
  );
};

export default AdminUsersPage;
