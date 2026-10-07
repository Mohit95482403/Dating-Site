import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Trash2,
  Eye,
  Shield,
  BarChart3,
  RefreshCw,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type { AdminContentReportItem, FeedAnalytics } from '../../types/feed';
import { FeedService } from '../../services/feed.service';
import '../../styles/admin.css';

export const AdminContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics'>('reports');
  const [reports, setReports] = useState<AdminContentReportItem[]>([]);
  const [analytics, setAnalytics] = useState<FeedAnalytics | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedReport, setSelectedReport] = useState<AdminContentReportItem | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FeedService.getAdminContentReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        targetType: targetTypeFilter === 'all' ? undefined : targetTypeFilter,
        search: searchQuery.trim() || undefined,
        page,
        limit: 15,
      });

      const reportList = Array.isArray(data?.reports) ? data.reports : [];
      setReports(reportList);

      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalReports(data.pagination.total || 0);
      } else {
        setTotalPages(1);
        setTotalReports(reportList.length);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load content reports.');
      setReports([]);
      setTotalPages(1);
      setTotalReports(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetTypeFilter, searchQuery, page]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FeedService.getAdminFeedAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load feed analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else {
      fetchAnalytics();
    }
  }, [activeTab, fetchReports, fetchAnalytics]);

  const handleModerationAction = async (
    action: 'dismiss' | 'remove_content' | 'warn_user' | 'restrict_user'
  ) => {
    if (!selectedReport) return;
    try {
      setProcessingAction(true);
      await FeedService.reviewContentReport(selectedReport.id, action, actionReason);
      setSelectedReport(null);
      setActionReason('');
      fetchReports();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Moderation action failed.');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Content Moderation & Feed Control</h1>
          <p className="admin-page-desc">
            Monitor community posts, stories, user engagement, and enforce content safety policies using real database telemetry.
          </p>
        </div>

        <div className="admin-tab-group" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`admin-btn ${activeTab === 'reports' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setActiveTab('reports')}
          >
            <AlertTriangle size={15} />
            <span>Reported Content</span>
          </button>
          <button
            type="button"
            className={`admin-btn ${activeTab === 'analytics' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={15} />
            <span>Feed Analytics</span>
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <>
          {/* Filters & Search */}
          <div
            className="admin-filter-bar"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              alignItems: 'center',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search reports by reason, notes, reporter..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="admin-input"
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Target Type Filter */}
            <select
              className="admin-select"
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: '130px' }}
            >
              <option value="all">All Content Types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="story">Stories</option>
            </select>

            {/* Status Filter */}
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: '140px' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="action_taken">Action Taken</option>
              <option value="dismissed">Dismissed</option>
            </select>

            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={fetchReports}
              title="Refresh Content Reports"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Table Container */}
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                Loading content reports...
              </div>
            ) : error ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                <AlertTriangle size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, marginBottom: '8px' }}>{error}</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={fetchReports}
                  style={{ marginTop: '8px' }}
                >
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>
            ) : (reports || []).length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No Content Reports Found
                </h3>
                <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
                  {searchQuery || statusFilter !== 'all' || targetTypeFilter !== 'all'
                    ? 'No reports match your current search or filter criteria. Try clearing filters.'
                    : 'All user-submitted content is currently clean and compliant with platform policies.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || targetTypeFilter !== 'all') && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      setStatusFilter('all');
                      setTargetTypeFilter('all');
                      setSearchQuery('');
                      setPage(1);
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Target Type</th>
                        <th>Reason</th>
                        <th>Reporter</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reports || []).map((report) => (
                        <tr key={report.id}>
                          <td>
                            <span
                              className="admin-badge"
                              style={{
                                textTransform: 'uppercase',
                                background:
                                  report.targetType === 'post'
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : report.targetType === 'comment'
                                    ? 'rgba(168, 85, 247, 0.15)'
                                    : 'rgba(236, 72, 153, 0.15)',
                              }}
                            >
                              {report.targetType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {report.reason}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{report.reporterName || 'Anonymous'}</div>
                            {report.reporterEmail && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{report.reporterEmail}</div>
                            )}
                          </td>
                          <td>
                            <span
                              className="admin-badge"
                              style={{
                                background:
                                  report.status === 'pending'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : report.status === 'action_taken'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(16, 185, 129, 0.15)',
                              }}
                            >
                              {report.status}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              onClick={() => setSelectedReport(report)}
                            >
                              <Eye size={14} /> Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div>
                    Showing <strong>{(reports || []).length}</strong> of <strong>{totalReports}</strong> report{totalReports !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* Analytics Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            className="admin-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Posts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {analytics?.totalPosts ?? 0}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Posts Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                {analytics?.postsToday ?? 0}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active Stories</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-pink, #ec4899)', marginTop: '4px' }}>
                {analytics?.activeStories ?? 0}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Likes</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f43f5e', marginTop: '4px' }}>
                {analytics?.totalLikes ?? 0}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Comments</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>
                {analytics?.totalComments ?? 0}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending Content Reports</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                {analytics?.pendingContentReports ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="feed-modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div className="feed-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="feed-modal-header">
              <h3 className="feed-modal-title">Review Reported Content</h3>
              <button
                type="button"
                className="feed-modal-close"
                onClick={() => setSelectedReport(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Report Details</div>
                <div style={{ fontWeight: 600, marginTop: '4px' }}>Reason: {selectedReport.reason}</div>
                {selectedReport.description && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Note: {selectedReport.description}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Reported by {selectedReport.reporterName} {selectedReport.reporterEmail ? `(${selectedReport.reporterEmail})` : ''}
                </div>
              </div>

              {selectedReport.contentDetails && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Content Content</div>
                  <div style={{ fontWeight: 600, marginTop: '4px' }}>
                    Author: {selectedReport.contentDetails.authorName || 'Unknown'}
                  </div>
                  {selectedReport.contentDetails.content && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                      "{selectedReport.contentDetails.content}"
                    </div>
                  )}
                  {selectedReport.contentDetails.mediaUrl && (
                    <div style={{ marginTop: '10px', maxHeight: '180px', overflow: 'hidden', borderRadius: '8px' }}>
                      <img
                        src={selectedReport.contentDetails.mediaUrl}
                        alt="Reported content"
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Admin Action Reason (Optional)
                </label>
                <input
                  type="text"
                  className="comment-input-field"
                  placeholder="Reason for audit log..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={processingAction}
                  onClick={() => handleModerationAction('dismiss')}
                >
                  <CheckCircle size={15} /> Dismiss Report
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  disabled={processingAction}
                  onClick={() => handleModerationAction('remove_content')}
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  <Trash2 size={15} /> Remove Content
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={processingAction}
                  onClick={() => handleModerationAction('warn_user')}
                >
                  <AlertTriangle size={15} /> Warn User
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={processingAction}
                  onClick={() => handleModerationAction('restrict_user')}
                >
                  <Shield size={15} /> Restrict User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContentPage;
