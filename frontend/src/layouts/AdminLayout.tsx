import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminCommandPalette } from '../components/admin/AdminCommandPalette';
import { adminService } from '../services/admin.service';
import { useSocket } from '../hooks/useSocket';
import { SocketProvider } from '../context/SocketContext';
import { CallProvider } from '../context/CallContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import CallOverlayContainer from '../components/calling/CallOverlayContainer';
import '../styles/admin.css';

const AdminLayoutContent: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    const handleOpen = () => setIsCommandPaletteOpen(true);
    window.addEventListener('open-admin-command-palette', handleOpen);
    return () => window.removeEventListener('open-admin-command-palette', handleOpen);
  }, []);

  const fetchBadgeCounts = useCallback(async () => {
    try {
      setIsSyncing(true);
      const stats = await adminService.getDashboardStats('7d');
      setPendingReports(stats.pendingReports);
      setPendingVerifications(stats.pendingVerifications);
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
  }, [fetchBadgeCounts]);

  // Listen for real-time events for instant badges
  useEffect(() => {
    if (!socket) return;

    const handleNewReport = () => {
      setPendingReports((prev) => prev + 1);
    };

    const handleNewVerification = () => {
      setPendingVerifications((prev) => prev + 1);
    };

    const handleReportResolved = () => {
      setPendingReports((prev) => Math.max(0, prev - 1));
    };

    const handleVerificationReviewed = () => {
      setPendingVerifications((prev) => Math.max(0, prev - 1));
    };

    socket.on('report:new', handleNewReport);
    socket.on('verification:new', handleNewVerification);
    socket.on('report:resolved', handleReportResolved);
    socket.on('verification:reviewed', handleVerificationReviewed);

    return () => {
      socket.off('report:new', handleNewReport);
      socket.off('verification:new', handleNewVerification);
      socket.off('report:resolved', handleReportResolved);
      socket.off('verification:reviewed', handleVerificationReviewed);
    };
  }, [socket]);

  return (
    <div className="admin-layout">
      <AdminSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        pendingReportsCount={pendingReports}
        pendingVerificationsCount={pendingVerifications}
      />

      <div className="admin-main">
        <AdminHeader
          onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
          onRefresh={fetchBadgeCounts}
          isRefreshing={isSyncing}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="admin-content-area">
          <React.Suspense
            fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="admin-loading-spinner" />
              </div>
            }
          >
            <Outlet context={{ refreshBadges: fetchBadgeCounts }} />
          </React.Suspense>
        </main>
      </div>

      <AdminCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  return (
    <SocketProvider>
      <CallProvider>
        <SubscriptionProvider>
          <AdminLayoutContent />
          <CallOverlayContainer />
        </SubscriptionProvider>
      </CallProvider>
    </SocketProvider>
  );
};

export default AdminLayout;
