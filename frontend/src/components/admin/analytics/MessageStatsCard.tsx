import React from 'react';
import { Bell, Smile, MessagesSquare } from 'lucide-react';
import type { MessageAnalyticsData } from '../../../types/analytics';

interface MessageStatsCardProps {
  data: MessageAnalyticsData;
}

export const MessageStatsCard: React.FC<MessageStatsCardProps> = ({ data }) => {
  const {
    messagesToday = 0,
    messagesThisWeek = 0,
    averageMessagesPerActiveUser = 'N/A',
    totalConversations = 0,
    activeConversations = 0,
    conversationsWithMessages = 0,
    totalReactions = 0,
    mostUsedReaction = 'None',
    reactionBreakdown = [],
    notificationsTotal = 0,
    notificationsRead = 0,
    notificationsUnread = 0,
    notificationReadRate = 'N/A',
  } = data;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
      {/* 1. Message & Conversation Velocity */}
      <div className="admin-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <MessagesSquare size={18} className="text-emerald-400" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Chat & Conversation Throughput
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Messages Today:</span>
            <strong style={{ color: '#ffffff' }}>{messagesToday.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Messages This Week:</span>
            <strong style={{ color: '#ffffff' }}>{messagesThisWeek.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Avg Messages / Active User:</span>
            <strong style={{ color: '#34d399' }}>{averageMessagesPerActiveUser}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Active Conversations:</span>
            <strong style={{ color: '#ffffff' }}>{activeConversations.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Threads with ≥1 Message:</span>
            <strong style={{ color: '#cbd5e1' }}>{conversationsWithMessages.toLocaleString()} / {totalConversations}</strong>
          </div>
        </div>
      </div>

      {/* 2. Reaction Activity */}
      <div className="admin-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smile size={18} className="text-amber-400" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Message Reactions Distribution
            </h4>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: '#0a0d17', padding: '0.2rem 0.5rem', borderRadius: '5px' }}>
            Total: <strong style={{ color: '#ffffff' }}>{totalReactions}</strong>
          </span>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Top Reaction:</span>
          <span style={{ fontSize: '1.2rem', padding: '0.1rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
            {mostUsedReaction !== 'None' ? mostUsedReaction : '—'}
          </span>
        </div>

        {reactionBreakdown.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reactionBreakdown.slice(0, 4).map((r) => {
              const maxR = Math.max(1, ...reactionBreakdown.map((x) => x.count));
              const pct = Math.round((r.count / maxR) * 100);
              return (
                <div key={r.reaction}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{r.reaction}</span>
                    <span style={{ color: '#94a3b8' }}>{r.count}</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0d17', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.82rem' }}>No reaction activity recorded in this period.</p>
        )}
      </div>

      {/* 3. Notification Telemetry */}
      <div className="admin-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <Bell size={18} className="text-indigo-400" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Notification Delivery & Read Rate
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Notifications Created:</span>
            <strong style={{ color: '#ffffff' }}>{notificationsTotal.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Read by Members:</span>
            <strong style={{ color: '#818cf8' }}>{notificationsRead.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Unread Backlog:</span>
            <strong style={{ color: '#cbd5e1' }}>{notificationsUnread.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Read Rate:</span>
            <strong style={{ color: '#6366f1', fontSize: '0.92rem' }}>{notificationReadRate}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageStatsCard;
