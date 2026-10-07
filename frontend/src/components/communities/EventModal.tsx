import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateEventInput, EventLocationType } from '../../types/community';
import { CommunityService } from '../../services/community.service';

interface EventModalProps {
  communityId: number;
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  communityId,
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [locationType, setLocationType] = useState<EventLocationType>('in_person');
  const [locationName, setLocationName] = useState('');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [maxAttendees, setMaxAttendees] = useState<number | undefined>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !eventDate) {
      setError('Please provide a title, description, and event date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim(),
        eventDate,
        startTime,
        endTime,
        locationType,
        locationName: locationName.trim() || undefined,
        onlineMeetingUrl: onlineMeetingUrl.trim() || undefined,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      };

      await CommunityService.createEvent(communityId, payload);
      onEventCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div className="community-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="community-modal-title">
          <span>Create Community Event / Meetup</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '14px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group-custom">
            <label>Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunset Photography Workshop, Tech Hackathon"
              required
            />
          </div>

          <div className="form-group-custom">
            <label>Description *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will members experience? What should they bring?"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group-custom">
              <label>Event Date *</label>
              <input
                type="date"
                value={eventDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group-custom">
              <label>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-group-custom">
              <label>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group-custom">
            <label>Format</label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as EventLocationType)}
            >
              <option value="in_person">In-Person Meetup</option>
              <option value="online">Online / Virtual Meeting</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {locationType !== 'online' && (
            <div className="form-group-custom">
              <label>Location (City / Region) *</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Bandra West, Mumbai or Pune Central"
              />
            </div>
          )}

          {locationType !== 'in_person' && (
            <div className="form-group-custom">
              <label>Virtual Meeting Link (optional)</label>
              <input
                type="url"
                value={onlineMeetingUrl}
                onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xyz or Zoom link"
              />
            </div>
          )}

          <div className="form-group-custom">
            <label>Attendee Limit (Capacity)</label>
            <input
              type="number"
              min={2}
              max={500}
              value={maxAttendees || ''}
              onChange={(e) => setMaxAttendees(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Leave blank for unlimited"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn-outline-glass" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Event...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
