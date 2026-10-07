import React, { useState } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import type { UserGrowthData } from '../../../types/analytics';

interface UserGrowthChartProps {
  data: UserGrowthData;
  dau?: number;
  wau?: number;
  mau?: number;
}

export const UserGrowthChart: React.FC<UserGrowthChartProps> = ({ data, dau, wau, mau }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { labels = [], newUsers = [], activeUsers = [] } = data;

  const hasData = labels.length > 0 && (newUsers.some((v) => v > 0) || activeUsers.some((v) => v > 0));

  if (!hasData) {
    return (
      <div className="admin-card" style={{ height: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Users size={36} style={{ color: '#475569', marginBottom: '0.75rem' }} />
        <h4 style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.25rem' }}>User Growth & Activity</h4>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Not enough data for this period.</p>
      </div>
    );
  }

  // Calculate SVG scales
  const maxVal = Math.max(1, ...newUsers, ...activeUsers);
  const chartHeight = 200;
  const chartWidth = 600;
  const paddingX = 40;
  const paddingY = 20;

  const pointsCount = labels.length;
  const stepX = pointsCount > 1 ? (chartWidth - paddingX * 2) / (pointsCount - 1) : 0;

  const getCoordinates = (values: number[]) => {
    return values.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
      return { x, y, val };
    });
  };

  const newUsersCoords = getCoordinates(newUsers);
  const activeUsersCoords = getCoordinates(activeUsers);

  const createSvgPath = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    return coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  };

  const createAreaPath = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return '';
    const line = createSvgPath(coords);
    const last = coords[coords.length - 1];
    const first = coords[0];
    return `${line} L ${last.x} ${chartHeight - paddingY} L ${first.x} ${chartHeight - paddingY} Z`;
  };

  const newUsersPath = createSvgPath(newUsersCoords);
  const newUsersArea = createAreaPath(newUsersCoords);
  const activeUsersPath = createSvgPath(activeUsersCoords);

  return (
    <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <TrendingUp size={18} className="text-indigo-400" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              User Acquisition & Active Dynamics
            </h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
            Real MySQL registrations and active telemetry over selected timeframe.
          </p>
        </div>

        {/* Legend & DAU/WAU/MAU */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }} />
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>New Signups</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Active Users</span>
          </div>

          {(dau !== undefined || wau !== undefined || mau !== undefined) && (
            <div style={{ display: 'flex', gap: '0.5rem', background: '#0a0d16', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
              <span style={{ color: '#94a3b8' }}>DAU: <strong style={{ color: '#ffffff' }}>{dau || 0}</strong></span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ color: '#94a3b8' }}>WAU: <strong style={{ color: '#ffffff' }}>{wau || 0}</strong></span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ color: '#94a3b8' }}>MAU: <strong style={{ color: '#ffffff' }}>{mau || 0}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto', overflowY: 'hidden' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '280px', display: 'block' }}
        >
          <defs>
            <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.12)" />

          {/* Area & Lines */}
          <path d={newUsersArea} fill="url(#newUsersGrad)" />
          <path d={newUsersPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={activeUsersPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {newUsersCoords.map((pt, i) => (
            <circle
              key={`new-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === i ? 5 : 3.5}
              fill="#6366f1"
              stroke="#0e121d"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}

          {activeUsersCoords.map((pt, i) => (
            <circle
              key={`act-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === i ? 4.5 : 3}
              fill="#10b981"
              stroke="#0e121d"
              strokeWidth="1.5"
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}

          {/* Active Hover Guide */}
          {hoverIndex !== null && newUsersCoords[hoverIndex] && (
            <line
              x1={newUsersCoords[hoverIndex].x}
              y1={paddingY}
              x2={newUsersCoords[hoverIndex].x}
              y2={chartHeight - paddingY}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && labels[hoverIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '15px',
              background: '#090b14',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.8rem',
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>{labels[hoverIndex]}</div>
            <div style={{ color: '#818cf8', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span>New Signups:</span>
              <strong>{newUsers[hoverIndex]}</strong>
            </div>
            <div style={{ color: '#34d399', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span>Active Users:</span>
              <strong>{activeUsers[hoverIndex]}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Axis Date Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#64748b',
          marginTop: '0.5rem',
          padding: '0 0.5rem',
        }}
      >
        <span>{labels[0]}</span>
        {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
};

export default UserGrowthChart;
