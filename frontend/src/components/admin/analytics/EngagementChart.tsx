import React, { useState } from 'react';
import { Activity, Check } from 'lucide-react';
import type { EngagementData } from '../../../types/analytics';

interface EngagementChartProps {
  data: EngagementData;
}

export const EngagementChart: React.FC<EngagementChartProps> = ({ data }) => {
  const [visibleSeries, setVisibleSeries] = useState({
    likes: true,
    superLikes: true,
    matches: true,
    messages: true,
    reactions: false,
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { labels = [], likes = [], superLikes = [], matches = [], messages = [], reactions = [] } = data;

  const toggleMetric = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasData =
    labels.length > 0 &&
    (likes.some((v) => v > 0) ||
      superLikes.some((v) => v > 0) ||
      matches.some((v) => v > 0) ||
      messages.some((v) => v > 0) ||
      reactions.some((v) => v > 0));

  if (!hasData) {
    return (
      <div className="admin-card" style={{ height: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Activity size={36} style={{ color: '#475569', marginBottom: '0.75rem' }} />
        <h4 style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.25rem' }}>Platform Engagement Velocity</h4>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Not enough data for this period.</p>
      </div>
    );
  }

  // Calculate maximum among visible series
  const activeValues: number[] = [];
  if (visibleSeries.likes) activeValues.push(...likes);
  if (visibleSeries.superLikes) activeValues.push(...superLikes);
  if (visibleSeries.matches) activeValues.push(...matches);
  if (visibleSeries.messages) activeValues.push(...messages);
  if (visibleSeries.reactions) activeValues.push(...reactions);

  const maxVal = Math.max(1, ...activeValues);
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

  const createSvgPath = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    return coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  };

  const seriesMeta = [
    { key: 'likes' as const, label: 'Likes', color: '#ec4899', values: likes },
    { key: 'superLikes' as const, label: 'Super Likes', color: '#38bdf8', values: superLikes },
    { key: 'matches' as const, label: 'Matches', color: '#a855f7', values: matches },
    { key: 'messages' as const, label: 'Messages', color: '#10b981', values: messages },
    { key: 'reactions' as const, label: 'Reactions', color: '#f59e0b', values: reactions },
  ];

  return (
    <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      {/* Header and Toggle Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Activity size={18} className="text-pink-400" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Multi-Metric Engagement Trends
            </h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
            Toggle series below to isolate specific interaction behaviors.
          </p>
        </div>

        {/* Series Toggle Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {seriesMeta.map((s) => {
            const isVisible = visibleSeries[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleMetric(s.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: `1px solid ${isVisible ? s.color : 'rgba(255,255,255,0.08)'}`,
                  background: isVisible ? `${s.color}22` : '#0d101a',
                  color: isVisible ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isVisible ? s.color : 'transparent',
                    border: `1px solid ${isVisible ? s.color : '#64748b'}`,
                  }}
                >
                  {isVisible && <Check size={10} color="#ffffff" />}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Multi-Line Chart Container */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto', overflowY: 'hidden' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '280px', display: 'block' }}
        >
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.12)" />

          {/* Render lines for active series */}
          {seriesMeta.map((s) => {
            if (!visibleSeries[s.key]) return null;
            const coords = getCoordinates(s.values);
            const path = createSvgPath(coords);
            return (
              <g key={`series-${s.key}`}>
                <path d={path} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                {coords.map((pt, i) => (
                  <circle
                    key={`pt-${s.key}-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoverIndex === i ? 4.5 : 3}
                    fill={s.color}
                    stroke="#0e121d"
                    strokeWidth="1.5"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* Hover guideline */}
          {hoverIndex !== null && stepX > 0 && (
            <line
              x1={paddingX + hoverIndex * stepX}
              y1={paddingY}
              x2={paddingX + hoverIndex * stepX}
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
              padding: '0.6rem 0.85rem',
              fontSize: '0.78rem',
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '150px',
            }}
          >
            <div style={{ color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>{labels[hoverIndex]}</div>
            {seriesMeta.map((s) => {
              if (!visibleSeries[s.key]) return null;
              return (
                <div key={`tip-${s.key}`} style={{ display: 'flex', justifyContent: 'space-between', color: s.color, marginBottom: '0.15rem' }}>
                  <span>{s.label}:</span>
                  <strong>{s.values[hoverIndex] || 0}</strong>
                </div>
              );
            })}
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

export default EngagementChart;
