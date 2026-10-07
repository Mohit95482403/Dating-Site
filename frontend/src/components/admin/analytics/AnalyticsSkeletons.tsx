import React from 'react';

export const AnalyticsCardSkeleton: React.FC = () => (
  <div
    className="admin-card"
    style={{
      padding: '1.25rem',
      height: '140px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      animation: 'pulse 1.5s infinite ease-in-out',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
      <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }} />
    </div>
    <div style={{ width: '120px', height: '32px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px' }} />
    <div style={{ width: '160px', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '320px' }) => (
  <div
    className="admin-card"
    style={{
      padding: '1.5rem',
      height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      animation: 'pulse 1.5s infinite ease-in-out',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ width: '180px', height: '18px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
      <div style={{ width: '100px', height: '18px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
    </div>
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
  </div>
);

export const FunnelSkeleton: React.FC = () => (
  <div
    className="admin-card"
    style={{
      padding: '1.5rem',
      height: '360px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      animation: 'pulse 1.5s infinite ease-in-out',
    }}
  >
    <div style={{ width: '220px', height: '20px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
          <div style={{ width: '60px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
        </div>
        <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
      </div>
    ))}
  </div>
);
