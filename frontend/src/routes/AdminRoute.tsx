import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';

export interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen message="Verifying administrative privileges..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '3.5rem',
          marginBottom: '1rem',
          color: '#ef4444'
        }}>
          🛡️
        </div>
        <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 700 }}>
          403 — Administrative Access Forbidden
        </h1>
        <p style={{ color: '#64748b', maxWidth: '460px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          You do not have administrative clearance to access this control center. This incident is monitored and logged.
        </p>
        <a
          href="/dashboard"
          style={{
            padding: '0.65rem 1.4rem',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
          }}
        >
          Return to Member Dashboard
        </a>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
