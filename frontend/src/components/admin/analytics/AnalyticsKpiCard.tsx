import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { KpiMetric } from '../../../types/analytics';

interface AnalyticsKpiCardProps {
  title: string;
  metric: KpiMetric;
  icon: React.ReactNode;
  comparisonLabel: string;
  subtitle?: string;
  accentColor?: string;
  badge?: React.ReactNode;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  title,
  metric,
  icon,
  comparisonLabel,
  subtitle,
  accentColor = '#6366f1',
  badge,
}) => {
  const isUp = metric.direction === 'up';
  const isDown = metric.direction === 'down';
  const isNa = metric.direction === 'na';

  const badgeColor = isUp ? '#10b981' : isDown ? '#f43f5e' : '#94a3b8';
  const badgeBg = isUp
    ? 'rgba(16, 185, 129, 0.12)'
    : isDown
    ? 'rgba(244, 63, 94, 0.12)'
    : 'rgba(148, 163, 184, 0.12)';

  return (
    <div
      className="admin-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem',
      }}
    >
      {/* Background Accent subtle glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          background: accentColor,
          opacity: 0.08,
          borderRadius: '50%',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.45rem',
            borderRadius: '9px',
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>

      {/* Primary Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {metric.value.toLocaleString()}
        </div>
        {badge}
      </div>

      {/* Comparison Delta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        {!isNa && metric.previousValue !== null ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              color: badgeColor,
              background: badgeBg,
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            {isUp && <ArrowUpRight size={13} />}
            {isDown && <ArrowDownRight size={13} />}
            {!isUp && !isDown && <Minus size={13} />}
            <span>{metric.formattedChange}</span>
          </div>
        ) : (
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>No previous-period data</span>
        )}

        <span style={{ color: '#64748b' }}>{comparisonLabel}</span>
      </div>
    </div>
  );
};

export default AnalyticsKpiCard;
