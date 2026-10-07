import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  X,
  ExternalLink,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  User as UserIcon,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { getAccessToken, api } from '../../services/api';
import type { AdminVerificationListItem } from '../../types/admin';
import { AdminTable, type Column } from '../../components/admin/AdminTable';
import { RejectVerificationModal } from '../../components/admin/RejectVerificationModal';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../hooks/useSocket';
import { BACKEND_URL } from '../../config/env';

/**
 * Safely resolves relative or absolute document URL and attaches JWT query token
 * so standard browser media elements (img, iframe, a href, window.open) pass authorization.
 */
export const resolveDocumentUrl = (rawUrl?: string | null): string => {
  if (!rawUrl) return '';
  const token = getAccessToken();
  let base = rawUrl;

  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    const apiOrigin = BACKEND_URL;
    base = `${apiOrigin}${base.startsWith('/') ? '' : '/'}${base}`;
  }

  if (token) {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }
  return base;
};

interface DocumentInspectionModalProps {
  item: AdminVerificationListItem;
  onClose: () => void;
  onApprove: (item: AdminVerificationListItem) => void;
  onReject: (item: AdminVerificationListItem) => void;
}

const DocumentInspectionModal: React.FC<DocumentInspectionModalProps> = ({
  item,
  onClose,
  onApprove,
  onReject,
}) => {
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const blobRef = useRef<string | null>(null);

  const rawDocumentUrl = item.documentUrl || item.selfieUrl;

  const loadDocument = useCallback(async () => {
    if (!rawDocumentUrl) {
      setIsLoading(false);
      setErrorMessage('Document was not submitted with this verification request.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const isPdfByExtension = rawDocumentUrl.toLowerCase().endsWith('.pdf');
    setIsPdf(isPdfByExtension);

    try {
      // 1. Fetch via authenticated Axios client (attaches Authorization header automatically)
      const response = await api.get(rawDocumentUrl, { responseType: 'blob' });
      const contentType = String(response.headers['content-type'] || '');
      const detectedPdf = isPdfByExtension || contentType.toLowerCase().includes('pdf');
      setIsPdf(detectedPdf);

      const objectUrl = URL.createObjectURL(response.data);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
      }
      blobRef.current = objectUrl;
      setDocBlobUrl(objectUrl);
      setIsLoading(false);
    } catch (err: any) {
      console.warn('[DocumentInspection] Authenticated blob fetch failed, trying authorized direct URL:', err);
      // 2. Fallback to direct authorized URL with token query
      const authorizedUrl = resolveDocumentUrl(rawDocumentUrl);
      if (authorizedUrl) {
        setDocBlobUrl(authorizedUrl);
        setIsLoading(false);
      } else {
        setErrorMessage('The document record exists, but the file could not be loaded.');
        setIsLoading(false);
      }
    }
  }, [rawDocumentUrl]);

  useEffect(() => {
    loadDocument();
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [loadDocument]);

  const handleDownload = () => {
    if (!docBlobUrl && !rawDocumentUrl) return;
    const downloadUrl = docBlobUrl || resolveDocumentUrl(rawDocumentUrl);
    const filename = rawDocumentUrl?.split('/').pop() || `verification-doc-${item.id}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    const directUrl = resolveDocumentUrl(rawDocumentUrl) || docBlobUrl;
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="admin-modal-dialog"
        style={{ maxWidth: '880px', width: 'min(880px, calc(100vw - 32px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="admin-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={22} className="text-emerald-400" />
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Document Inspection: {item.firstName} {item.lastName || ''}
              </span>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                User #{item.userId} &bull; {item.email} &bull; Submitted {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close inspection modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Instructions / Notice Banner */}
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.84rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              Compare the submitted official identification document against the user's registered primary avatar.
            </span>
            <span className={`admin-status-badge ${item.status === 'approved' ? 'resolved' : item.status === 'rejected' ? 'banned' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
              {item.status}
            </span>
          </div>

          {/* Comparison Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Left: Account Avatar */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="admin-input-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem' }}>
                  Account Avatar
                </span>
              </div>
              <div
                style={{
                  height: '340px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0d0f18',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {item.avatarUrl ? (
                  <img
                    src={resolveDocumentUrl(item.avatarUrl)}
                    alt={`${item.firstName}'s Avatar`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                    <UserIcon size={36} />
                    <span style={{ fontSize: '0.82rem' }}>No Avatar Uploaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Submitted Document Inspection Area */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="admin-input-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem' }}>
                    Submitted Document
                  </span>
                  {isPdf ? (
                    <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      PDF Document
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      Image Photo
                    </span>
                  )}
                </div>

                {/* Actions Toolbar: Open New Tab, Download, Zoom Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {!isPdf && docBlobUrl && !isLoading && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline"
                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                        onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline"
                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      {zoomLevel !== 1 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline"
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                          onClick={() => setZoomLevel(1)}
                          title="Reset Zoom"
                        >
                          1x
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleDownload}
                    disabled={isLoading || !docBlobUrl}
                    title="Download original document file"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleOpenNewTab}
                    disabled={isLoading || !rawDocumentUrl}
                    title="Open document in a new browser tab"
                  >
                    <ExternalLink size={13} />
                    <span>Open Tab</span>
                  </button>
                </div>
              </div>

              {/* Document Display Box */}
              <div
                style={{
                  height: '340px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0a0d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                    <Loader2 size={28} className="animate-spin text-cyan-400" />
                    <span style={{ fontSize: '0.85rem' }}>Loading verification document...</span>
                  </div>
                ) : errorMessage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', padding: '1rem', textAlign: 'center' }}>
                    <AlertTriangle size={32} />
                    <span style={{ fontSize: '0.88rem' }}>{errorMessage}</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline"
                      style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}
                      onClick={loadDocument}
                    >
                      <RefreshCw size={13} />
                      <span>Retry Loading</span>
                    </button>
                  </div>
                ) : isPdf && docBlobUrl ? (
                  <iframe
                    src={docBlobUrl}
                    title="Verification PDF Document"
                    style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                  />
                ) : docBlobUrl ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '0.5rem' }}>
                    <img
                      src={docBlobUrl}
                      alt="Submitted Verification ID"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.15s ease',
                      }}
                      onError={() => {
                        setErrorMessage('Failed to display document image.');
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                    <FileText size={36} />
                    <span style={{ fontSize: '0.85rem' }}>Document was not submitted with this verification request.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prior Rejection Reason Note */}
          {item.rejectionReason && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.84rem' }}>
              <strong>Prior Rejection Reason:</strong> {item.rejectionReason}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="admin-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '1rem 1.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onClose}
          >
            Close Inspection
          </button>

          {item.status === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => onReject(item)}
              >
                Reject Request
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-success"
                onClick={() => onApprove(item)}
              >
                Approve Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminVerificationPage: React.FC = () => {
  const [verifications, setVerifications] = useState<AdminVerificationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);

  // Inspection modal
  const [inspectItem, setInspectItem] = useState<AdminVerificationListItem | null>(null);

  // Action modals
  const [approveTarget, setApproveTarget] = useState<AdminVerificationListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminVerificationListItem | null>(null);

  const toast = useToast();
  const { socket } = useSocket();

  const fetchVerifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getVerifications({
        page,
        limit: 15,
        status: statusFilter,
      });
      setVerifications(res.verifications);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load verification submissions.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleNewVerif = () => fetchVerifications();
    socket.on('verification:new', handleNewVerif);
    socket.on('verification:reviewed', handleNewVerif);
    return () => {
      socket.off('verification:new', handleNewVerif);
      socket.off('verification:reviewed', handleNewVerif);
    };
  }, [socket, fetchVerifications]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    await adminService.approveVerification(approveTarget.id);
    toast.success(`Identity verification approved for ${approveTarget.firstName}. Profile is now verified.`);
    fetchVerifications();
  };

  const handleReject = async (reason: string, adminNotes?: string) => {
    if (!rejectTarget) return;
    await adminService.rejectVerification(rejectTarget.id, reason, adminNotes);
    toast.info(`Verification rejected for ${rejectTarget.firstName}. User has been notified.`);
    fetchVerifications();
  };

  const columns: Column<AdminVerificationListItem>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '70px',
      render: (v) => <span style={{ fontWeight: 700, color: '#94a3b8' }}>#{v.id}</span>,
    },
    {
      key: 'user',
      header: 'Member Profile',
      render: (v) => (
        <div className="admin-user-cell">
          <div className="admin-user-thumb">
            {v.avatarUrl ? (
              <img src={resolveDocumentUrl(v.avatarUrl)} alt={v.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              v.firstName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="admin-user-name">{v.firstName} {v.lastName || ''}</div>
            <div className="admin-user-sub">{v.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Review Status',
      render: (v) => {
        let cls = 'pending';
        if (v.status === 'approved') cls = 'resolved';
        if (v.status === 'rejected') cls = 'banned';
        return (
          <span className={`admin-status-badge ${cls}`}>
            {v.status}
          </span>
        );
      },
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (v) => (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          {new Date(v.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'document',
      header: 'Identity Document',
      render: (v) => (
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={() => setInspectItem(v)}
          style={{ padding: '0.3rem 0.65rem' }}
        >
          <Eye size={13} />
          <span>Inspect Document</span>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Moderation Decision',
      render: (v) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {v.status === 'pending' ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                style={{ padding: '0.3rem 0.6rem' }}
                onClick={() => setRejectTarget(v)}
                title="Reject verification"
              >
                <XCircle size={14} />
                <span>Reject</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-success"
                style={{ padding: '0.3rem 0.6rem' }}
                onClick={() => setApproveTarget(v)}
                title="Approve verification"
              >
                <CheckCircle size={14} />
                <span>Approve</span>
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {v.status === 'approved' ? `Approved by ${v.reviewedByName || 'Admin'}` : `Rejected`}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page">
      {/* Top Banner / Metrics */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Profile Identity Verification</h1>
          <p className="admin-page-subtitle">
            Review user-submitted official government identity documents, compare against live profile photos, and grant verified badges.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={() => fetchVerifications()}
          >
            <ShieldCheck size={15} />
            <span>Refresh Submissions</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filters-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="admin-tabs" style={{ display: 'flex', gap: '0.4rem' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`admin-tab ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'pending' ? 'Pending Review' : tab === 'approved' ? 'Approved' : tab === 'rejected' ? 'Rejected' : 'All Submissions'}
            </button>
          ))}
        </div>

        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: '170px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="pending">Pending Review Only</option>
          <option value="approved">Approved Verifications</option>
          <option value="rejected">Rejected Submissions</option>
          <option value="all">All Records</option>
        </select>
      </div>

      {/* Verifications Table */}
      <AdminTable
        columns={columns}
        data={verifications}
        loading={isLoading}
        emptyTitle="No verification requests"
        emptySubtitle="All identity verification requests have been processed."
        emptyIcon="🛡️"
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
      />

      {/* Enhanced Document Inspection Modal */}
      {inspectItem && (
        <DocumentInspectionModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onApprove={(item) => {
            setInspectItem(null);
            setApproveTarget(item);
          }}
          onReject={(item) => {
            setInspectItem(null);
            setRejectTarget(item);
          }}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmActionModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve Identity Verification"
        message={`Approve identity verification for ${approveTarget?.firstName}? The official verified badge will be added to their profile and discovery cards.`}
        confirmText="Approve Verification"
        confirmVariant="success"
        onConfirm={handleApprove}
      />

      <RejectVerificationModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        verificationId={rejectTarget?.id || 0}
        userName={rejectTarget?.firstName || 'User'}
        onConfirm={handleReject}
      />
    </div>
  );
};

export default AdminVerificationPage;
