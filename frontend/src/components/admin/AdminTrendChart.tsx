import React, { useState } from 'react';
import { TrendingUp, Users, Heart, MessageSquare, AlertTriangle } from 'lucide-react';

interface AdminTrendChartProps {
  labels: string[];
  userGrowth: number[];
  matchGrowth: number[];
  messageGrowth: number[];
  reportGrowth: number[];
}

export const AdminTrendChart: React.FC<AdminTrendChartProps> = ({
  labels,
  userGrowth,
  matchGrowth,
  messageGrowth,
  reportGrowth,
}) => {
  const [activeSeries, setActiveSeries] = useState<'users' | 'matches' | 'messages' | 'reports'>('users');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const seriesConfig = {
    users: {
      name: 'New Users',
      color: '#6366f1',
      gradientId: 'gradUsers',
      icon: Users,
      data: userGrowth,
    },
    matches: {
      name: 'New Matches',
      color: '#ec4899',
      gradientId: 'gradMatches',
      icon: Heart,
      data: matchGrowth,
    },
    messages: {
      name: 'Messages Sent',
      color: '#3b82f6',
      gradientId: 'gradMessages',
      icon: MessageSquare,
      data: messageGrowth,
    },
    reports: {
      name: 'Reports Filed',
      color: '#f59e0b',
      gradientId: 'gradReports',
      icon: AlertTriangle,
      data: reportGrowth,
    },
  };

  const current = seriesConfig[activeSeries];
  const data = current.data.length > 0 ? current.data : [0];
  const maxVal = Math.max(...data, 5);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Compute points
  const points = data.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartW;
    const y = height - paddingY - (val / maxVal) * chartH;
    return { x, y, val, label: labels[idx] || `Day ${idx + 1}` };
  });

  // Build SVG path
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['users', 'matches', 'messages', 'reports'] as const).map((key) => {
            const conf = seriesConfig[key];
            const Icon = conf.icon;
            const isSel = activeSeries === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveSeries(key);
                  setHoverIndex(null);
                }}
                className={`admin-btn ${isSel ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                style={isSel ? { background: conf.color, borderColor: conf.color } : {}}
              >
                <Icon size={14} />
                <span>{conf.name}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={15} style={{ color: current.color }} />
          <span>Metric: <strong>{current.name}</strong></span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={current.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={current.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={current.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - paddingY - pct * chartH;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {Math.round(pct * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          {areaPath && <path d={areaPath} fill={`url(#${current.gradientId})`} />}

          {/* Trend Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={current.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points & Hover Targets */}
          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible wider target */}
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? '6' : '3.5'}
                fill={hoverIndex === idx ? '#ffffff' : current.color}
                stroke={current.color}
                strokeWidth="2"
                style={{ transition: 'all 0.15s ease' }}
              />
            </g>
          ))}

          {/* X Axis Labels */}
          {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 7)) === 0 || i === points.length - 1).map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
            >
              {p.label}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '15px',
              background: '#0d0f18',
              border: `1px solid ${current.color}`,
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <span style={{ color: '#94a3b8' }}>{points[hoverIndex].label}:</span>
            <span style={{ fontWeight: 700, color: current.color }}>
              {points[hoverIndex].val} {current.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrendChart;
