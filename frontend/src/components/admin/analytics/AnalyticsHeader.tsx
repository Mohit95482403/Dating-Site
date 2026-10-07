import React, { useState } from 'react';
import { Download, RefreshCw, Calendar, X } from 'lucide-react';
import type { AnalyticsDateRange, DateRangeFilter } from '../../../types/analytics';

interface AnalyticsHeaderProps {
  currentFilter: DateRangeFilter;
  onFilterChange: (newFilter: DateRangeFilter) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isExporting: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
}

const RANGES: Array<{ id: AnalyticsDateRange; label: string }> = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '6m', label: '6 Months' },
  { id: '12m', label: '12 Months' },
  { id: 'all', label: 'All Time' },
];

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  currentFilter,
  onFilterChange,
  onRefresh,
  onExportCsv,
  isExporting,
  isRefreshing,
  lastUpdated,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(
    currentFilter.startDate || new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState(
    currentFilter.endDate || new Date().toISOString().slice(0, 10)
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setCustomError('Please choose both start and end dates.');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      setCustomError('Start date must be before or equal to end date.');
      return;
    }
    setCustomError(null);
    setShowCustomModal(false);
    onFilterChange({
      range: 'custom',
      startDate: customStart,
      endDate: customEnd,
    });
  };

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Platform Analytics & Intelligence
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.15rem 0.6rem',
                borderRadius: '999px',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              Live
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            Comprehensive MySQL-derived telemetry for user growth, matchmaking funnel, communication velocity, and safety moderation.
          </p>
        </div>

        {/* Live indicator & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              background: '#0d0f18',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            Last updated: <strong style={{ color: '#cbd5e1' }}>{lastUpdated || 'Just now'}</strong>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            onClick={onExportCsv}
            disabled={isExporting}
            className="admin-btn admin-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
            title="Export real aggregate metrics to CSV"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Pill Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          background: '#090b12',
          padding: '0.35rem',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {RANGES.map((r) => {
          const isActive = currentFilter.range === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onFilterChange({ range: r.id })}
              style={{
                background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {r.label}
            </button>
          );
        })}

        <button
          onClick={() => setShowCustomModal(true)}
          style={{
            background: currentFilter.range === 'custom' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: currentFilter.range === 'custom' ? '#ffffff' : '#94a3b8',
            border: 'none',
            borderRadius: '7px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: currentFilter.range === 'custom' ? 600 : 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={13} />
          <span>
            {currentFilter.range === 'custom' && currentFilter.startDate && currentFilter.endDate
              ? `${currentFilter.startDate} → ${currentFilter.endDate}`
              : 'Custom Range'}
          </span>
        </button>
      </div>

      {/* Custom Range Dialog Modal */}
      {showCustomModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0e121d',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '100%',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} className="text-indigo-400" />
                Select Custom Date Range
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyCustom}>
              {customError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.82rem',
                    marginBottom: '1rem',
                  }}
                >
                  {customError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#06080e',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#06080e',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsHeader;
