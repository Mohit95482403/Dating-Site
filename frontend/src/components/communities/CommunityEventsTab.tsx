import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, Plus, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import type { CommunityItem, CommunityEventItem, RsvpStatus } from '../../types/community';
import { CommunityService } from '../../services/community.service';
import { EventModal } from './EventModal';
import { useSocket } from '../../hooks/useSocket';

interface CommunityEventsTabProps {
  community: CommunityItem;
}

export const CommunityEventsTab: React.FC<CommunityEventsTabProps> = ({ community }) => {
  const { socket } = useSocket();
  const [events, setEvents] = useState<CommunityEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const membership = community.userMembership;
  const isMember = membership?.status === 'active';
  const role = membership?.role;

  const canCreateEvent =
    isMember &&
    (community.eventCreationPermission === 'all_members' ||
      ((community.eventCreationPermission === 'moderators_only' ||
        community.eventCreationPermission === 'admins_only') &&
        (role === 'owner' || role === 'admin' || (community.eventCreationPermission === 'moderators_only' && role === 'moderator'))));

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await CommunityService.getEvents(community.id);
      setEvents(res.events || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load community events.');
    } finally {
      setIsLoading(false);
    }
  }, [community.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleEventCreated = (data: any) => {
      if (data?.communityId === community.id && data?.event) {
        setEvents((prev) => [data.event, ...prev]);
      }
    };

    const handleRsvpUpdated = (data: any) => {
      if (data?.eventId) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === data.eventId
              ? {
                  ...ev,
                  attendeesCount: data.attendeesCount ?? ev.attendeesCount,
                }
              : ev
          )
        );
      }
    };

    socket.on('community:event_created', handleEventCreated);
    socket.on('community:rsvp_updated', handleRsvpUpdated);

    return () => {
      socket.off('community:event_created', handleEventCreated);
      socket.off('community:rsvp_updated', handleRsvpUpdated);
    };
  }, [socket, community.id]);

  const handleRsvp = async (eventId: number, status: RsvpStatus) => {
    try {
      setActionLoadingId(eventId);
      await CommunityService.rsvpEvent(eventId, status);
      // Update local state
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;
          const wasGoing = ev.userRsvp === 'going';
          const isNowGoing = status === 'going';
          let diff = 0;
          if (!wasGoing && isNowGoing) diff = 1;
          if (wasGoing && !isNowGoing) diff = -1;

          return {
            ...ev,
            userRsvp: status,
            attendeesCount: Math.max(0, ev.attendeesCount + diff),
          };
        })
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update RSVP.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRsvp = async (eventId: number) => {
    try {
      setActionLoadingId(eventId);
      await CommunityService.cancelRsvp(eventId);
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;
          const wasGoing = ev.userRsvp === 'going';
          return {
            ...ev,
            userRsvp: null,
            attendeesCount: wasGoing ? Math.max(0, ev.attendeesCount - 1) : ev.attendeesCount,
          };
        })
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel RSVP.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  return (
    <div className="community-events-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
          Upcoming Meetups & Events ({events.length})
        </h3>
        {canCreateEvent && (
          <button className="btn-primary-gradient" onClick={() => setIsEventModalOpen(true)}>
            <Plus size={16} />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          <p>Loading community events...</p>
        </div>
      ) : error ? (
        <div className="community-sidebar-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div
          className="community-sidebar-card"
          style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}
        >
          <Calendar size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.1rem' }}>No events scheduled</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {canCreateEvent
              ? 'Organize a meetup, hike, workshop, or video hangout for the community!'
              : 'Check back soon for upcoming community events and meetups.'}
          </p>
        </div>
      ) : (
        <div className="community-events-grid">
          {events.map((event) => {
            const { day, month } = formatDate(event.eventDate);
            const isFull = event.maxAttendees ? event.attendeesCount >= event.maxAttendees : false;

            return (
              <div key={event.id} className="event-card">
                <div className="event-card-header">
                  <div className="event-date-badge">
                    <div className="event-date-day">{day}</div>
                    <div className="event-date-month">{month}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: event.locationType === 'online' ? '#38bdf8' : '#34d399',
                      }}
                    >
                      {event.locationType === 'online' ? 'Online Hangout' : 'In Person'}
                    </span>
                  </div>
                </div>

                <div className="event-card-body">
                  <h4 className="event-card-title">{event.title}</h4>
                  <div className="event-card-meta">
                    {event.startTime && (
                      <div className="event-card-meta-item">
                        <Clock size={14} />
                        <span>{event.startTime.slice(0, 5)}</span>
                      </div>
                    )}
                    {event.locationName && (
                      <div className="event-card-meta-item">
                        <MapPin size={14} />
                        <span>{event.locationName}</span>
                      </div>
                    )}
                    <div className="event-card-meta-item">
                      <Users size={14} />
                      <span>
                        {event.attendeesCount} Going
                        {event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#cbd5e1',
                      margin: 0,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {event.description}
                  </p>
                </div>

                <div className="event-card-footer">
                  {event.userRsvp ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        className="btn-outline-glass"
                        style={{
                          flex: 1,
                          color: '#10b981',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          justifyContent: 'center',
                        }}
                        disabled
                      >
                        <Check size={14} />
                        <span style={{ textTransform: 'capitalize' }}>{event.userRsvp}</span>
                      </button>
                      <button
                        className="btn-outline-glass"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleCancelRsvp(event.id)}
                        disabled={actionLoadingId === event.id}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        className="btn-primary-gradient"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleRsvp(event.id, 'going')}
                        disabled={actionLoadingId === event.id || isFull}
                      >
                        {isFull ? 'Event Full' : 'RSVP Going'}
                      </button>
                      <button
                        className="btn-outline-glass"
                        onClick={() => handleRsvp(event.id, 'interested')}
                        disabled={actionLoadingId === event.id}
                      >
                        Interested
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventModal
        communityId={community.id}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={loadEvents}
      />
    </div>
  );
};
