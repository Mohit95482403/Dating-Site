import React from 'react';
import { Table, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { OverviewKpis } from '../../../types/analytics';

interface AnalyticsDetailTableProps {
  kpis: OverviewKpis;
  comparisonLabel: string;
}

export const AnalyticsDetailTable: React.FC<AnalyticsDetailTableProps> = ({ kpis, comparisonLabel }) => {
  const rows = [
    { name: 'Total Platform Registered Users', kpi: kpis.totalUsers },
    { name: 'New User Registrations', kpi: kpis.newUsers },
    { name: 'Active Users (Logged In / Active)', kpi: kpis.activeUsers },
    { name: 'Discovery Likes Sent', kpi: kpis.totalLikes },
    { name: 'Super Likes Expressed', kpi: kpis.totalSuperLikes },
    { name: 'Mutual Matches Generated', kpi: kpis.totalMatches },
    { name: 'Real-time Chat Messages Exchanged', kpi: kpis.totalMessages },
    { name: 'Safety Reports Filed (Pending Review)', kpi: kpis.pendingReports },
    { name: 'Safety Reports Addressed & Resolved', kpi: kpis.resolvedReports },
    { name: 'Pending Verification Applications', kpi: kpis.pendingVerification },
    { name: 'Verified Profile Community Members', kpi: kpis.verifiedUsers },
  ];

  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <Table size={18} className="text-indigo-400" />
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Comprehensive Period Comparison Audit
        </h4>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Audited comparison metrics between current window and {comparisonLabel}.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Metric</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Current Window</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Previous Window</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Variance / Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isUp = r.kpi.direction === 'up';
              const isDown = r.kpi.direction === 'down';
              const isNa = r.kpi.direction === 'na';

              const color = isUp ? '#10b981' : isDown ? '#f43f5e' : '#94a3b8';

              return (
                <tr key={r.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1', fontWeight: 500 }}>
                    {r.name}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ffffff', fontWeight: 700 }}>
                    {r.kpi.value.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>
                    {r.kpi.previousValue !== null ? r.kpi.previousValue.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {isUp && <ArrowUpRight size={13} />}
                      {isDown && <ArrowDownRight size={13} />}
                      {!isUp && !isDown && !isNa && <Minus size={13} />}
                      {r.kpi.formattedChange}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsDetailTable;
