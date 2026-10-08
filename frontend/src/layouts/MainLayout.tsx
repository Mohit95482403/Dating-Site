import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimatedBackground from '../components/common/AnimatedBackground';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { SocketProvider } from '../context/SocketContext';
import { CallProvider } from '../context/CallContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import CallOverlayContainer from '../components/calling/CallOverlayContainer';
import PremiumModal from '../components/premium/PremiumModal';

export const MainLayout: React.FC = () => {
  const location = useLocation();

  // Immersive views (such as chat workspace or focused auth forms) do not display the marketing footer
  const isImmersiveView =
    location.pathname.startsWith('/messages') ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  return (
    <SocketProvider>
      <CallProvider>
        <SubscriptionProvider>
          <div className="app-layout">
            <AnimatedBackground />
            <Navbar />
            <main className="app-main-content">
              <Suspense
                fallback={
                  <div className="page-suspense-fallback">
                    <LoadingSpinner size="lg" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </main>
            {!isImmersiveView && <Footer />}
          </div>
          <CallOverlayContainer />
          <PremiumModal />
        </SubscriptionProvider>
      </CallProvider>
    </SocketProvider>
  );
};

export default MainLayout;
