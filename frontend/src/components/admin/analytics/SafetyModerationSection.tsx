import React from 'react';
import { AlertTriangle, ShieldCheck, Clock, Hammer } from 'lucide-react';
import type { SafetyAnalyticsData, VerificationAnalyticsData } from '../../../types/analytics';

interface SafetyModerationSectionProps {
  safety: SafetyAnalyticsData;
  verification: VerificationAnalyticsData;
}

export const SafetyModerationSection: React.FC<SafetyModerationSectionProps> = ({ safety, verification }) => {
  const {
    totalReports = 0,
    pending = 0,
    underReview = 0,
    resolved = 0,
    dismissed = 0,
    reportCategories = {},
    moderationActionsBreakdown = {},
  } = safety;

  const {
    totalRequests: verifTotal = 0,
    pending: verifPending = 0,
    approved: verifApproved = 0,
    rejected: verifRejected = 0,
    successRate: verifSuccessRate = 'N/A',
    averageReviewTime = 'Insufficient data',
  } = verification;

  const maxCatCount = Math.max(1, ...Object.values(reportCategories));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Split: Reports Status & Verification Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* 1. Reports Status Triage */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} className="text-pink-400" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Safety Reports Resolution
              </h4>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Total: <strong style={{ color: '#ffffff' }}>{totalReports}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#090b14', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>{pending}</div>
            </div>
            <div style={{ background: '#090b14', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase' }}>Under Review</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>{underReview}</div>
            </div>
            <div style={{ background: '#090b14', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>{resolved}</div>
            </div>
            <div style={{ background: '#090b14', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Dismissed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>{dismissed}</div>
            </div>
          </div>
        </div>

        {/* 2. Verification Processing Velocity */}
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} className="text-emerald-400" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Verification Review Velocity
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Requests: <strong style={{ color: '#ffffff' }}>{verifTotal}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Approval Success Rate:</span>
                <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>{verifSuccessRate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Approved / Rejected:</span>
                <strong style={{ color: '#ffffff' }}>{verifApproved} / {verifRejected}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Awaiting Inspector Review:</span>
                <strong style={{ color: '#fbbf24' }}>{verifPending}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} className="text-indigo-400" />
                  Avg Turnaround Time:
                </span>
                <strong style={{ color: '#818cf8', fontWeight: 700 }}>{averageReviewTime}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', height: '6px', background: '#0a0d17', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: verifSuccessRate !== 'N/A' ? verifSuccessRate : '0%',
                height: '100%',
                background: '#10b981',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Split: Report Categories & Moderation Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* 3. Report Categories Distribution */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.1rem' }}>
            Reported Infraction Categories
          </h4>

          {Object.keys(reportCategories).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(reportCategories).map(([cat, count]) => {
                const pct = Math.round((count / maxCatCount) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: '#94a3b8' }}>{count}</span>
                    </div>
                    <div style={{ height: '6px', background: '#0a0d17', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#ec4899', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.82rem' }}>No incident categories reported in this timeframe.</p>
          )}
        </div>

        {/* 4. Moderation Enforcement Actions */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
            <Hammer size={18} className="text-amber-400" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Moderation Enforcement Actions
            </h4>
          </div>

          {Object.keys(moderationActionsBreakdown).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(moderationActionsBreakdown).map(([action, count]) => (
                <div
                  key={action}
                  style={{
                    background: '#090b14',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    {action.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.82rem' }}>No disciplinary moderation actions recorded in this window.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyModerationSection;
