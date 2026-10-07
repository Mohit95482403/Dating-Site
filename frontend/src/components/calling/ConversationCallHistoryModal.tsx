// Connectly Conversation Call History Modal
// Displays real call records for a specific conversation from MySQL

import React, { useEffect, useState } from 'react';
import { Phone, Video, PhoneOff, PhoneMissed, Clock, X, Loader2 } from 'lucide-react';
import { callService } from '../../services/call.service';
import type { CallRecord } from '../../types/call';
import './CallScreen.css';

interface ConversationCallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  partnerName: string;
}

export const ConversationCallHistoryModal: React.FC<ConversationCallHistoryModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  partnerName,
}) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && conversationId) {
      setLoading(true);
      setError(null);
      callService
        .getConversationCallHistory(conversationId)
        .then((records) => {
          setCalls(records);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to load call history');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 0) {
        return `Today, ${timeStr}`;
      } else if (diffDays === 1) {
        return `Yesterday, ${timeStr}`;
      } else if (diffDays < 7) {
        return `${date.toLocaleDateString([], { weekday: 'short' })}, ${timeStr}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  const renderStatus = (call: CallRecord) => {
    switch (call.status) {
      case 'accepted':
      case 'ended':
        return (
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {formatDuration(call.duration)}
          </span>
        );
      case 'missed':
        return (
          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PhoneMissed size={12} /> Missed
          </span>
        );
      case 'rejected':
        return (
          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PhoneOff size={12} /> Declined
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Cancelled
          </span>
        );
      case 'busy':
        return (
          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Busy
          </span>
        );
      default:
        return <span>{call.status}</span>;
    }
  };

  return (
    <div className="call-modal-overlay" role="dialog" aria-modal="true" aria-label="Call history">
      <div
        className="call-card"
        style={{
          maxWidth: '460px',
          padding: '1.75rem',
          alignItems: 'stretch',
          textAlign: 'left',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
              Call History
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
              With {partnerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
            aria-label="Close call history"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading call records...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </div>
          ) : calls.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#6b7280' }}>
              <Phone size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', margin: 0, color: '#9ca3af' }}>No calls yet</p>
              <span style={{ fontSize: '0.8rem' }}>
                Calls between you and {partnerName} will appear here.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {calls.map((call) => (
                <div
                  key={call.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background:
                          call.callType === 'video'
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'rgba(52, 211, 153, 0.15)',
                        color: call.callType === 'video' ? '#38bdf8' : '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {call.callType === 'video' ? <Video size={18} /> : <Phone size={18} />}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>{call.callType === 'video' ? 'Video call' : 'Audio call'}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          · {renderStatus(call)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                        {formatDate(call.startedAt || call.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationCallHistoryModal;
