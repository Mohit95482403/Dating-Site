import React from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { AnalyticsInsight } from '../../../types/analytics';

interface KeyInsightsListProps {
  insights: AnalyticsInsight[];
}

export const KeyInsightsList: React.FC<KeyInsightsListProps> = ({ insights }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle size={15} className="text-emerald-400" />;
      case 'alert':
        return <AlertTriangle size={15} className="text-pink-400" />;
      case 'neutral':
      default:
        return <Info size={15} className="text-indigo-400" />;
    }
  };

  return (
    <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <Sparkles size={18} className="text-indigo-400" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          Executive Platform Insights
        </h3>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
        Deterministic algorithmic observations dynamically computed from real database aggregations.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {insights.map((ins) => (
          <div
            key={ins.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              background: '#090b14',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '9px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              color: '#cbd5e1',
              lineHeight: 1.45,
            }}
          >
            <div style={{ marginTop: '0.15rem', flexShrink: 0 }}>
              {getInsightIcon(ins.type)}
            </div>
            <div style={{ flex: 1 }}>{ins.text}</div>
            <span
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#64748b',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              {ins.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyInsightsList;
