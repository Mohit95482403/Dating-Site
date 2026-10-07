import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';

export interface PublicRouteProps {
  children?: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen message="Checking session..." />;
  }

  if (isAuthenticated) {
    const defaultDest = user?.isProfileComplete ? '/dashboard' : '/onboarding';
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || defaultDest;
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PublicRoute;
