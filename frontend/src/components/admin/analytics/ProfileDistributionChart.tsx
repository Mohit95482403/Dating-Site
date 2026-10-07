import React from 'react';
import { UserCheck, Image, ShieldCheck } from 'lucide-react';
import type { ProfileAnalyticsData } from '../../../types/analytics';

interface ProfileDistributionChartProps {
  data: ProfileAnalyticsData;
}

export const ProfileDistributionChart: React.FC<ProfileDistributionChartProps> = ({ data }) => {
  const {
    completed = 0,
    incomplete = 0,
    avgCompletionPercentage = 0,
    completionDistribution = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0,
    },
    withPhoto = 0,
    withoutPhoto = 0,
    avgPhotosPerProfile = 0,
    verifiedCount = 0,
  } = data;

  const totalProfiles = completed + incomplete || 1;
  const totalPhotoProfiles = withPhoto + withoutPhoto || 1;
  const maxBucket = Math.max(1, ...Object.values(completionDistribution));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
      {/* 1. Profile Completion Distribution */}
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <UserCheck size={18} className="text-indigo-400" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Profile Completion Distribution
              </h4>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
              Calculated dynamically from real profile metadata & media.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>
              {avgCompletionPercentage}%
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Avg Completion</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {Object.entries(completionDistribution).map(([bucket, count]) => {
            const pct = Math.round((count / maxBucket) * 100);
            const totalPct = Math.round((count / totalProfiles) * 100);
            return (
              <div key={bucket}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{bucket}</span>
                  <span style={{ color: '#94a3b8' }}>
                    {count} users ({totalPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: '#0a0d17', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Photo & Media Portfolio Health */}
      <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Image size={18} className="text-emerald-400" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Photo & Media Portfolio Quality
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Profiles with Photos</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>
                  {withPhoto} ({Math.round((withPhoto / totalPhotoProfiles) * 100)}%)
                </span>
              </div>
              <div style={{ height: '8px', background: '#0a0d17', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.round((withPhoto / totalPhotoProfiles) * 100)}%`,
                    height: '100%',
                    background: '#10b981',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Profiles without Photos</span>
                <span style={{ color: '#cbd5e1', fontWeight: 700 }}>
                  {withoutPhoto} ({Math.round((withoutPhoto / totalPhotoProfiles) * 100)}%)
                </span>
              </div>
              <div style={{ height: '8px', background: '#0a0d17', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.round((withoutPhoto / totalPhotoProfiles) * 100)}%`,
                    height: '100%',
                    background: '#475569',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ background: '#090b14', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Avg Photos / User</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{avgPhotosPerProfile}</div>
          </div>
          <div style={{ background: '#090b14', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <ShieldCheck size={12} className="text-emerald-400" />
              Verified Users
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{verifiedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDistributionChart;
