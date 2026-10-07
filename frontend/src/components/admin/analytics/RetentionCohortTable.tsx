import React from 'react';
import { UserCheck2 } from 'lucide-react';
import type { RetentionCohortData } from '../../../types/analytics';

interface RetentionCohortTableProps {
  data: RetentionCohortData;
}

export const RetentionCohortTable: React.FC<RetentionCohortTableProps> = ({ data }) => {
  const {
    newUsersCount = 0,
    returnedDay1 = 0,
    day1Rate = 'N/A',
    returnedDay7 = 0,
    day7Rate = 'N/A',
    returnedDay30 = 0,
    day30Rate = 'N/A',
  } = data;

  const steps = [
    { label: 'New Signups in Cohort', count: newUsersCount, rate: '100%', color: '#6366f1' },
    { label: 'Active Day 1+', count: returnedDay1, rate: day1Rate, color: '#3b82f6' },
    { label: 'Active Day 7+', count: returnedDay7, rate: day7Rate, color: '#10b981' },
    { label: 'Active Day 30+', count: returnedDay30, rate: day30Rate, color: '#a855f7' },
  ];

  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <UserCheck2 size={18} className="text-blue-400" />
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
          User Retention Cohort Foundation
        </h4>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Tracks subsequent activity intervals for accounts registered during the selected date window.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '1rem' }}>
        {steps.map((st) => (
          <div
            key={st.label}
            style={{
              background: '#090b14',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: st.color,
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.35rem' }}>
              {st.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {st.count.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', color: st.color, marginTop: '0.35rem', fontWeight: 700 }}>
              Retention: {st.rate}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RetentionCohortTable;
