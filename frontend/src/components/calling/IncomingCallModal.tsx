// Connectly Incoming Call Modal
// Displays caller avatar, caller name, call type badge, and Accept / Decline actions

import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import './CallScreen.css';

export const IncomingCallModal: React.FC = () => {
  const { callState, partner, callType, acceptCall, rejectCall } = useCall();

  if (callState !== 'incoming' || !partner) {
    return null;
  }

  const avatarUrl =
    partner.photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  return (
    <div className="call-modal-overlay" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="call-card">
        {/* Pulsing Concentric Rings */}
        <div className="call-avatar-wrapper">
          <div className="call-pulse-ring" />
          <div className="call-pulse-ring" />
          <div className="call-pulse-ring" />
          <img src={avatarUrl} alt={partner.firstName} className="call-avatar-img" />
        </div>

        {/* Caller Info */}
        <h2 className="call-user-name">{partner.firstName}</h2>
        <div className={`call-badge ${callType}`}>
          {callType === 'video' ? <Video size={14} /> : <Phone size={14} />}
          <span>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call...</span>
        </div>

        {/* Accept & Reject Action Buttons */}
        <div className="call-actions-row">
          {/* Decline */}
          <div className="call-action-btn">
            <button
              type="button"
              className="call-btn-circle decline"
              onClick={rejectCall}
              aria-label="Decline incoming call"
            >
              <PhoneOff size={26} />
            </button>
            <span>Decline</span>
          </div>

          {/* Accept */}
          <div className="call-action-btn">
            <button
              type="button"
              className="call-btn-circle accept"
              onClick={acceptCall}
              aria-label="Accept incoming call"
            >
              {callType === 'video' ? <Video size={26} /> : <Phone size={26} />}
            </button>
            <span>Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
