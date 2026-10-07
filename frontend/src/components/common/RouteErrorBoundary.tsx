import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

export const RouteErrorBoundary: React.FC = () => {
  const error: any = useRouteError();
  const navigate = useNavigate();

  const errorMessage =
    error?.statusText || error?.message || 'An unexpected error occurred.';

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 51, 102, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-pink)',
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Something went wrong
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          {errorMessage}
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={15} /> Reload
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/feed')}
          >
            <Home size={15} /> Go to Feed
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
