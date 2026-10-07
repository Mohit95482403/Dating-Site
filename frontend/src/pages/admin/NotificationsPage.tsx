import React, { useState } from 'react';
import { Send, Bell, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

export const AdminNotificationsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'active' | 'verified'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDelivered, setLastDelivered] = useState<{ title: string; count: number } | null>(null);

  const toast = useToast();

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Both title and message content are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminService.broadcastAnnouncement({
        title: title.trim(),
        message: message.trim(),
        audience,
      });

      toast.success(`Announcement broadcast successfully delivered to ${res.deliveredCount} users!`);
      setLastDelivered({ title: title.trim(), count: res.deliveredCount });
      setTitle('');
      setMessage('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to dispatch broadcast announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
          System Announcement Dispatcher
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Send global platform broadcasts and administrative notifications to user activity centers in real time.
        </p>
      </div>

      <div className="admin-card">
        <form onSubmit={handleBroadcast}>
          <div className="admin-input-group">
            <label className="admin-input-label">Target Audience Segment *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setAudience('active')}
                className={`admin-btn ${audience === 'active' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.75rem' }}
              >
                <Users size={16} />
                <span>Active Users</span>
              </button>

              <button
                type="button"
                onClick={() => setAudience('verified')}
                className={`admin-btn ${audience === 'verified' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.75rem' }}
              >
                <ShieldCheck size={16} />
                <span>Verified Only</span>
              </button>

              <button
                type="button"
                onClick={() => setAudience('all')}
                className={`admin-btn ${audience === 'all' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.75rem' }}
              >
                <Bell size={16} />
                <span>All Accounts</span>
              </button>
            </div>
          </div>

          <div className="admin-input-group" style={{ marginTop: '1.25rem' }}>
            <label className="admin-input-label">Announcement Title *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g., Scheduled Platform Maintenance or Safety Policy Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              required
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
              {title.length}/200 characters
            </span>
          </div>

          <div className="admin-input-group">
            <label className="admin-input-label">Announcement Content *</label>
            <textarea
              className="admin-textarea"
              style={{ minHeight: '130px' }}
              placeholder="Draft your administrative announcement text..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              required
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
              {message.length}/2000 characters
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Delivers via Socket.IO to online members and persists in database notifications.
            </span>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Delivering...' : 'Broadcast Announcement'}</span>
            </button>
          </div>
        </form>
      </div>

      {lastDelivered && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#34d399',
          fontSize: '0.88rem'
        }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Recent Delivery:</strong> "{lastDelivered.title}" was successfully delivered to {lastDelivered.count} members.
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPage;
