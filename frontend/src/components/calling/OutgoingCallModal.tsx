// Connectly Outgoing Call Modal
// Displays ringing animation, partner avatar, call type badge, and Cancel Call action

import React from 'react';
import { PhoneOff, Video, Phone } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { getMediaUrl } from '../../utils/media';
import './CallScreen.css';

export const OutgoingCallModal: React.FC = () => {
  const { callState, partner, callType, cancelCall } = useCall();

  if (callState !== 'calling' || !partner) {
    return null;
  }

  const avatarUrl =
    getMediaUrl((partner as any).avatarUrl || partner.photoUrl) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  return (
    <div className="call-modal-overlay" role="dialog" aria-modal="true" aria-label="Outgoing call">
      <div className="call-card">
        {/* Pulsing Concentric Rings */}
        <div className="call-avatar-wrapper">
          <div className="call-pulse-ring" />
          <div className="call-pulse-ring" />
          <div className="call-pulse-ring" />
          <img src={avatarUrl} alt={partner.firstName} className="call-avatar-img" />
        </div>

        {/* Partner Info */}
        <h2 className="call-user-name">{partner.firstName}</h2>
        <div className={`call-badge ${callType}`}>
          {callType === 'video' ? <Video size={14} /> : <Phone size={14} />}
          <span>Calling...</span>
        </div>

        {/* Cancel Call Button */}
        <div className="call-actions-row">
          <div className="call-action-btn">
            <button
              type="button"
              className="call-btn-circle cancel"
              onClick={cancelCall}
              aria-label="Cancel outgoing call"
            >
              <PhoneOff size={26} />
            </button>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutgoingCallModal;
