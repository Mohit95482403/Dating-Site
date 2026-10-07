import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
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
  return (
    <SocketProvider>
      <CallProvider>
        <SubscriptionProvider>
          <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AnimatedBackground />
            <Navbar />
            <main className="app-main-content">
              <Suspense
                fallback={
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <LoadingSpinner size="md" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </div>
          <CallOverlayContainer />
          <PremiumModal />
        </SubscriptionProvider>
      </CallProvider>
    </SocketProvider>
  );
};

export default MainLayout;
