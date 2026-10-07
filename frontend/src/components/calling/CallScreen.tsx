// Connectly Active Call Screen
// Fullscreen / Modal interface for Video & Audio WebRTC calls

import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Volume2,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import './CallScreen.css';

export const CallScreen: React.FC = () => {
  const {
    callState,
    callType,
    partner,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isRemoteMuted,
    isRemoteCameraOff,
    callDuration,
    connectionState,
    toggleMute,
    toggleCamera,
    endCall,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState !== 'connected' && callState !== 'reconnecting') {
    return null;
  }

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const partnerAvatar =
    partner?.photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

  return (
    <div
      className="call-screen-overlay"
      role="region"
      aria-label={`Active ${callType} call with ${partner?.firstName || 'partner'}`}
    >
      {/* Top Floating Bar */}
      <div className="call-top-bar">
        <div className="call-top-info">
          <span className="call-partner-header-name">{partner?.firstName}</span>
          <span className="call-timer-badge">{formatTimer(callDuration)}</span>
        </div>

        <div className="call-status-indicator">
          <span
            className={`call-status-dot ${connectionState === 'connecting' || callState === 'reconnecting' ? 'reconnecting' : ''}`}
          />
          <span>{callState === 'reconnecting' ? 'Reconnecting...' : 'Connected'}</span>
        </div>
      </div>

      {/* Main Calling Content: Video vs Audio */}
      {callType === 'video' ? (
        <div className="call-video-container">
          {/* Remote Video Stream */}
          {remoteStream && !isRemoteCameraOff ? (
            <video
              ref={remoteVideoRef}
              className="remote-video-feed"
              autoPlay
              playsInline
            />
          ) : (
            <div className="remote-video-placeholder">
              <img
                src={partnerAvatar}
                alt={partner?.firstName || 'Partner'}
                className="remote-placeholder-avatar"
              />
              <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                {isRemoteCameraOff ? `${partner?.firstName}'s camera is off` : 'Connecting video...'}
              </span>
            </div>
          )}

          {/* Floating Local Selfie Video PIP */}
          <div className="local-pip-wrapper">
            {!isCameraOff ? (
              <video
                ref={localVideoRef}
                className="local-video-feed"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#181824',
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                }}
              >
                Camera Off
              </div>
            )}
            {isMuted && (
              <div className="local-pip-muted-tag">
                <MicOff size={10} />
                <span>Muted</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audio Call Screen */
        <div className="call-audio-container">
          <div className="audio-avatar-wrapper">
            <div className="call-pulse-ring" />
            <div className="call-pulse-ring" />
            <img
              src={partnerAvatar}
              alt={partner?.firstName || 'Partner'}
              className="audio-avatar-img"
            />
          </div>

          <h2 className="call-user-name" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            {partner?.firstName}
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#34d399',
              fontSize: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            <Volume2 size={16} />
            <span>Audio Call in Progress</span>
          </div>

          {isRemoteMuted && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.8rem',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                borderRadius: '9999px',
                fontSize: '0.8rem',
              }}
            >
              <MicOff size={12} />
              <span>{partner?.firstName} is muted</span>
            </div>
          )}

          {/* Hidden audio element for remote stream in audio calls */}
          {remoteStream && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ display: 'none' }}
            />
          )}
        </div>
      )}

      {/* Floating Bottom Controls Dock */}
      <div className="call-controls-dock" role="toolbar" aria-label="Call controls">
        {/* Mute Toggle */}
        <button
          type="button"
          className={`call-ctrl-btn ${isMuted ? 'active-off' : ''}`}
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Camera Toggle (Video Call Only) */}
        {callType === 'video' && (
          <button
            type="button"
            className={`call-ctrl-btn ${isCameraOff ? 'active-off' : ''}`}
            onClick={toggleCamera}
            aria-label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
          </button>
        )}

        {/* End Call Button */}
        <button
          type="button"
          className="call-ctrl-btn end-btn"
          onClick={endCall}
          aria-label="End call"
          title="End call"
        >
          <PhoneOff size={26} />
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
