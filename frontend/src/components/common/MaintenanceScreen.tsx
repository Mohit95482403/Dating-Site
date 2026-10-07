import React from 'react';
import { Shield, RefreshCw, Clock } from 'lucide-react';

interface MaintenanceScreenProps {
  onRefresh?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onRefresh }) => {
  const handleReload = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b, #0b0d14 60%)',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(19, 23, 34, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(99, 102, 241, 0.2)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Shield size={32} color="#ffffff" />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
          }}
        >
          <Clock size={14} />
          <span>Scheduled Platform Maintenance</span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 1rem',
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Connectly is temporarily unavailable
        </h1>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '0.98rem',
            lineHeight: 1.6,
            margin: '0 0 2rem',
          }}
        >
          We're currently performing system updates to enhance platform stability, security, and performance. We'll be back online momentarily.
        </p>

        <button
          type="button"
          onClick={handleReload}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.75rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <RefreshCw size={16} />
          <span>Refresh Page</span>
        </button>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
