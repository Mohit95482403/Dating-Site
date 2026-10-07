import React from 'react';
import { HeartPulse, CheckCircle2, TrendingUp, AlertCircle, Info } from 'lucide-react';
import type { PlatformHealth } from '../../../types/analytics';

interface PlatformHealthCardProps {
  health: PlatformHealth;
}

export const PlatformHealthCard: React.FC<PlatformHealthCardProps> = ({ health }) => {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'Growing':
        return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)', icon: <TrendingUp size={14} /> };
      case 'Healthy':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', icon: <CheckCircle2 size={14} /> };
      case 'Needs Attention':
        return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.25)', icon: <AlertCircle size={14} /> };
      case 'Stable':
      default:
        return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.25)', icon: <Info size={14} /> };
    }
  };

  const domains = [
    { title: 'User Growth', item: health.growth },
    { title: 'Engagement & Chat', item: health.engagement },
    { title: 'Platform Safety', item: health.safety },
    { title: 'Identity Verification', item: health.verification },
  ];

  return (
    <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <HeartPulse size={20} className="text-emerald-400" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          Platform Operating Health
        </h3>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
        Rule-based operational health telemetry evaluated from live registration velocity, engagement ratios, and safety backlogs.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {domains.map((d) => {
          const style = getBadgeStyle(d.item.status);
          return (
            <div
              key={d.title}
              style={{
                background: '#090b14',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>{d.title}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: style.color,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                    }}
                  >
                    {style.icon}
                    {d.item.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  {d.item.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformHealthCard;
