import React from 'react';
import { UserCog, ShieldCheck, AlertTriangle, Hammer } from 'lucide-react';

interface AdminWorkloadItem {
  adminId: number;
  email: string;
  username: string | null;
  reportsHandled: number;
  verificationsReviewed: number;
  moderationActions: number;
}

interface AdminWorkloadTableProps {
  workload: AdminWorkloadItem[];
}

export const AdminWorkloadTable: React.FC<AdminWorkloadTableProps> = ({ workload }) => {
  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <UserCog size={18} className="text-cyan-400" />
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Administrative Operational Workload
        </h4>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Operational triage volume executed across administrative staff in the active window.
      </p>

      {workload.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Administrator</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Reports Handled</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Verifications Reviewed</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Moderation Actions</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((admin) => (
                <tr key={admin.adminId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 600 }}>
                    <div>{admin.email}</div>
                    {admin.username && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{admin.username}</div>}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: '#cbd5e1' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertTriangle size={13} className="text-pink-400" />
                      {admin.reportsHandled}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: '#cbd5e1' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={13} className="text-emerald-400" />
                      {admin.verificationsReviewed}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', color: '#cbd5e1' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Hammer size={13} className="text-amber-400" />
                      {admin.moderationActions}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: '#64748b', fontSize: '0.82rem' }}>No administrative activity records found.</p>
      )}
    </div>
  );
};

export default AdminWorkloadTable;
