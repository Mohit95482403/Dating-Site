import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  AlertTriangle,
  LifeBuoy,
  CreditCard,
  Settings,
  Flag,
  Activity,
  ArrowRight,
  X,
  Shield,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { GlobalSearchResult } from '../../types/admin';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or prop
          const event = new CustomEvent('open-admin-command-palette');
          window.dispatchEvent(event);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const data = await adminService.globalSearch(query.trim());
        setResults(data);
      } catch {
        // Search error gracefully ignored
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.reports.length > 0 ||
      results.tickets.length > 0 ||
      results.transactions.length > 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(5, 7, 13, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#131722',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '0.75rem',
          }}
        >
          <Search size={20} color="#818cf8" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Connectly Admin: users, reports, tickets, payments, settings..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
          <span
            style={{
              fontSize: '0.7rem',
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results / Navigation Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#818cf8', fontSize: '0.88rem' }}>
              Searching platform records...
            </div>
          )}

          {!isLoading && query.trim().length >= 2 && !hasResults && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>No results matching "{query}"</p>
              <span style={{ fontSize: '0.78rem' }}>Try searching by user ID, email, ticket number, or reason</span>
            </div>
          )}

          {/* Quick Shortcuts (When search is empty) */}
          {!query && (
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                Quick Platform Operations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/support')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <LifeBuoy size={18} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Support Desk</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Manage user inquiries</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/settings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Settings size={18} color="#fbbf24" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Platform Settings</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Maintenance &amp; limits</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/features')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Flag size={18} color="#ec4899" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Feature Flags</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Toggle live capabilities</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/system-health')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Activity size={18} color="#34d399" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>System Health</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Telemetry &amp; subsystem telemetry</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Active Search Results */}
          {hasResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.4rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={13} /> Users ({results.users.length})
                  </div>
                  {results.users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleNavigate('/admin/users')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'rgba(255, 255, 255, 0.02)',
                        marginBottom: '0.25rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                          {u.first_name ? u.first_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                            {u.first_name || 'User'} {u.last_name || ''}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                            {u.email}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: u.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: u.status === 'active' ? '#4ade80' : '#f87171', textTransform: 'uppercase' }}>
                          {u.status}
                        </span>
                        <ArrowRight size={14} color="#64748b" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reports */}
              {results.reports.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.4rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={13} color="#f59e0b" /> Reports ({results.reports.length})
                  </div>
                  {results.reports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleNavigate('/admin/reports')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'rgba(255, 255, 255, 0.02)',
                        marginBottom: '0.25rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                          Report #{r.id}: {r.reason}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Target: {r.reported_name || 'Member'} • By: {r.reporter_email || 'Reporter'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', textTransform: 'uppercase' }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Support Tickets */}
              {results.tickets.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.4rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LifeBuoy size={13} color="#38bdf8" /> Support Tickets ({results.tickets.length})
                  </div>
                  {results.tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleNavigate('/admin/support')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'rgba(255, 255, 255, 0.02)',
                        marginBottom: '0.25rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                          {t.ticket_number}: {t.subject}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          User: {t.user_email || 'Unknown'} • Category: {t.category}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', textTransform: 'uppercase' }}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions */}
              {results.transactions.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.4rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={13} color="#a855f7" /> Payments ({results.transactions.length})
                  </div>
                  {results.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => handleNavigate('/admin/subscriptions')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'rgba(255, 255, 255, 0.02)',
                        marginBottom: '0.25rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                          {tx.currency} {tx.amount.toLocaleString()} — #{tx.provider_payment_id || tx.id}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          User: {tx.user_email || 'Member'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: tx.status === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: tx.status === 'success' ? '#4ade80' : '#f43f5e', textTransform: 'uppercase' }}>
                        {tx.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={14} color="#818cf8" />
            <span>Connectly Admin Command Gateway</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCommandPalette;
