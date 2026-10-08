// Connectly Real-time WebRTC Call Context & Provider
// Manages call lifecycles, WebRTC peer connection, Socket.IO signaling, and UI state

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import { callService } from '../services/call.service';
import { WebRTCService } from '../services/webrtc.service';
import type {
  CallRecord,
  CallType,
  CallParticipant,
  WebRTCConnectionState,
  CallSignalPayload,
} from '../types/call';
import { useToast } from './ToastContext';

export type CallUIState =
  | 'idle'
  | 'calling' // Outgoing ringing
  | 'incoming' // Incoming ringing
  | 'connected' // Active call
  | 'reconnecting'
  | 'ended';

interface CallContextValue {
  callState: CallUIState;
  activeCall: CallRecord | null;
  callType: CallType;
  partner: CallParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isRemoteMuted: boolean;
  isRemoteCameraOff: boolean;
  callDuration: number;
  connectionState: WebRTCConnectionState;
  errorMessage: string | null;
  startCall: (
    targetUserId: number,
    type: CallType,
    partnerInfo: CallParticipant,
    matchId?: number,
    conversationId?: number
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  clearError: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [callState, setCallState] = useState<CallUIState>('idle');
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [callType, setCallType] = useState<CallType>('audio');
  const [partner, setPartner] = useState<CallParticipant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('closed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webrtcRef = useRef<WebRTCService | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = user?.id || (user as any)?.userId;

  // Cleanup helper
  const cleanupCall = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setActiveCall(null);
    setPartner(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsRemoteMuted(false);
    setIsRemoteCameraOff(false);
    setCallDuration(0);
    setConnectionState('closed');
  }, []);

  // Initialize WebRTC instance on demand
  const getOrCreateWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService({
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') {
            setCallState('connected');
          } else if (state === 'disconnected') {
            setCallState('reconnecting');
          } else if (state === 'failed') {
            showToast('Call connection failed. Disconnecting...', 'error');
            cleanupCall();
          }
        },
        onIceCandidate: (candidate) => {
          if (socket && activeCall) {
            const targetId =
              activeCall.callerId === currentUserId
                ? activeCall.receiverId
                : activeCall.callerId;
            socket.emit('call:ice-candidate', {
              callId: activeCall.id,
              targetUserId: targetId,
              candidate: candidate.toJSON(),
            });
          }
        },
        onError: (err) => {
          setErrorMessage(err.message);
        },
      });
    }
    return webrtcRef.current;
  }, [socket, activeCall, currentUserId, cleanupCall, showToast]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  /**
   * Start Outgoing Call
   */
  const startCall = useCallback(
    async (
      targetUserId: number,
      type: CallType,
      partnerInfo: CallParticipant,
      matchId?: number,
      conversationId?: number
    ): Promise<void> => {
      const validTargetUserId = Number(targetUserId);
      if (!Number.isInteger(validTargetUserId) || validTargetUserId <= 0) {
        showToast('Unable to start call. Invalid recipient ID.', 'error');
        return;
      }

      if (callState !== 'idle') {
        showToast('You are already on a call.', 'warning');
        return;
      }

      setErrorMessage(null);
      setCallType(type);
      setPartner(partnerInfo);
      setCallState('calling');

      try {
        const webrtc = getOrCreateWebRTC();

        // 1. Acquire local camera / microphone media
        const stream = await webrtc.getLocalMedia(type);
        setLocalStream(stream);

        // 2. Initialize PeerConnection
        webrtc.initializePeerConnection();

        // 3. Create call record via Backend API
        const safeMatchId = matchId && Number.isInteger(Number(matchId)) ? Number(matchId) : undefined;
        const safeConvId = conversationId && Number.isInteger(Number(conversationId)) ? Number(conversationId) : undefined;

        const callRecord = await callService.initiateCall({
          targetUserId: validTargetUserId,
          callType: type,
          matchId: safeMatchId,
          conversationId: safeConvId,
        });

        setActiveCall(callRecord);

        // 4. Join Socket.IO call room
        if (socket && callRecord?.id) {
          socket.emit('call:join', { callId: callRecord.id });
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to initiate call';
        setErrorMessage(msg);
        showToast(msg, 'error');
        cleanupCall();
      }
    },
    [callState, getOrCreateWebRTC, socket, cleanupCall, showToast]
  );

  /**
   * Accept Incoming Call
   */
  const acceptCall = useCallback(async (): Promise<void> => {
    if (!activeCall) return;

    const callId = Number(activeCall.id);
    if (!Number.isInteger(callId) || callId <= 0) {
      showToast('Unable to accept call: invalid call ID.', 'error');
      cleanupCall();
      return;
    }

    setErrorMessage(null);
    try {
      const webrtc = getOrCreateWebRTC();

      // 1. Acquire local media
      const stream = await webrtc.getLocalMedia(callType);
      setLocalStream(stream);

      // 2. Initialize PeerConnection
      webrtc.initializePeerConnection();

      // 3. Join Socket room
      if (socket) {
        socket.emit('call:join', { callId });
      }

      // 4. Confirm acceptance with Backend
      const updated = await callService.acceptCall(callId);
      setActiveCall(updated);
      setCallState('connected');
      startDurationTimer();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to accept call';
      setErrorMessage(msg);
      showToast(msg, 'error');
      cleanupCall();
    }
  }, [activeCall, callType, getOrCreateWebRTC, socket, startDurationTimer, cleanupCall, showToast]);

  /**
   * Reject Incoming Call
   */
  const rejectCall = useCallback(async (): Promise<void> => {
    if (!activeCall) return;
    const callId = Number(activeCall.id);
    if (!Number.isInteger(callId) || callId <= 0) {
      cleanupCall();
      return;
    }
    try {
      await callService.rejectCall(callId);
    } catch {
      // ignore
    } finally {
      cleanupCall();
    }
  }, [activeCall, cleanupCall]);

  /**
   * Cancel Outgoing Call while ringing
   */
  const cancelCall = useCallback(async (): Promise<void> => {
    if (!activeCall) {
      cleanupCall();
      return;
    }
    const callId = Number(activeCall.id);
    if (!Number.isInteger(callId) || callId <= 0) {
      cleanupCall();
      return;
    }
    try {
      await callService.cancelCall(callId);
    } catch {
      // ignore
    } finally {
      cleanupCall();
    }
  }, [activeCall, cleanupCall]);

  /**
   * End Active Call
   */
  const endCall = useCallback(async (): Promise<void> => {
    if (!activeCall) {
      cleanupCall();
      return;
    }
    const callId = Number(activeCall.id);
    if (!Number.isInteger(callId) || callId <= 0) {
      cleanupCall();
      return;
    }
    try {
      await callService.endCall(callId);
    } catch {
      // ignore
    } finally {
      cleanupCall();
    }
  }, [activeCall, cleanupCall]);

  /**
   * Toggle Mute Microphone
   */
  const toggleMute = useCallback(() => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
      if (socket && activeCall) {
        const targetId =
          activeCall.callerId === currentUserId
            ? activeCall.receiverId
            : activeCall.callerId;
        socket.emit('call:media-state', {
          callId: activeCall.id,
          targetUserId: targetId,
          isMuted: muted,
          isVideoOff: isCameraOff,
        });
      }
    }
  }, [socket, activeCall, currentUserId, isCameraOff]);

  /**
   * Toggle Camera
   */
  const toggleCamera = useCallback(() => {
    if (webrtcRef.current && callType === 'video') {
      const cameraOff = webrtcRef.current.toggleCamera();
      setIsCameraOff(cameraOff);
      if (socket && activeCall) {
        const targetId =
          activeCall.callerId === currentUserId
            ? activeCall.receiverId
            : activeCall.callerId;
        socket.emit('call:media-state', {
          callId: activeCall.id,
          targetUserId: targetId,
          isMuted,
          isVideoOff: cameraOff,
        });
      }
    }
  }, [callType, socket, activeCall, currentUserId, isMuted]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Socket.IO event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    // 1. Incoming Call
    const handleCallIncoming = (data: any) => {
      const incomingCallId = Number(data?.callId || data?.id);
      if (!Number.isInteger(incomingCallId) || incomingCallId <= 0) {
        console.error('[CallContext] Invalid incoming call payload:', data);
        return;
      }

      const callerId = Number(data?.callerId || data?.caller?.id);
      const safeCaller: CallParticipant = data?.caller || {
        id: callerId,
        firstName: 'Caller',
      };

      // If receiver is already in a call, reject or ignore
      if (callState !== 'idle') {
        socket.emit('call:busy', { callId: incomingCallId, callerId });
        return;
      }

      setActiveCall({
        id: incomingCallId,
        matchId: Number(data?.matchId || 0),
        conversationId: data?.conversationId ? Number(data.conversationId) : null,
        callerId,
        receiverId: currentUserId ?? 0,
        callType: data?.callType || 'audio',
        status: 'ringing',
        startedAt: data?.startedAt || new Date().toISOString(),
        answeredAt: null,
        endedAt: null,
        duration: 0,
        caller: safeCaller,
      });
      setCallType(data?.callType || 'audio');
      setPartner(safeCaller);
      setCallState('incoming');
    };

    // 2. Call Accepted (Received by caller)
    const handleCallAccepted = async (data: { callId: number; call: CallRecord }) => {
      setActiveCall(data.call);
      setCallState('connected');
      startDurationTimer();

      // Caller creates and transmits WebRTC SDP Offer
      try {
        const webrtc = getOrCreateWebRTC();
        const offer = await webrtc.createOffer();
        socket.emit('call:offer', {
          callId: data.callId,
          targetUserId: data.call.receiverId,
          sdp: offer,
        });
      } catch (err: any) {
        console.error('[CallContext] Error creating SDP offer:', err);
        showToast('WebRTC negotiation failed', 'error');
        cleanupCall();
      }
    };

    // 3. Call Rejected
    const handleCallRejected = () => {
      showToast('Call was declined.', 'info');
      cleanupCall();
    };

    // 4. Call Cancelled
    const handleCallCancelled = () => {
      showToast('Call was cancelled by the caller.', 'info');
      cleanupCall();
    };

    // 5. Call Ended
    const handleCallEnded = () => {
      showToast('Call ended.', 'info');
      cleanupCall();
    };

    // 6. Call Missed
    const handleCallMissed = () => {
      showToast('Call was unanswered.', 'info');
      cleanupCall();
    };

    // 7. Call Busy
    const handleCallBusy = () => {
      showToast('The person you are calling is currently on another call.', 'warning');
      cleanupCall();
    };

    // 8. WebRTC SDP Offer (Received by callee)
    const handleCallOffer = async (payload: CallSignalPayload) => {
      try {
        const webrtc = getOrCreateWebRTC();
        if (payload.sdp) {
          const answer = await webrtc.handleOffer(payload.sdp);
          socket.emit('call:answer', {
            callId: payload.callId,
            targetUserId: payload.senderId,
            sdp: answer,
          });
        }
      } catch (err: any) {
        console.error('[CallContext] Error handling SDP offer:', err);
      }
    };

    // 9. WebRTC SDP Answer (Received by caller)
    const handleCallAnswer = async (payload: CallSignalPayload) => {
      try {
        if (webrtcRef.current && payload.sdp) {
          await webrtcRef.current.handleAnswer(payload.sdp);
        }
      } catch (err: any) {
        console.error('[CallContext] Error handling SDP answer:', err);
      }
    };

    // 10. WebRTC ICE Candidate
    const handleCallIceCandidate = async (payload: CallSignalPayload) => {
      try {
        if (webrtcRef.current && payload.candidate) {
          await webrtcRef.current.addIceCandidate(payload.candidate);
        }
      } catch (err: any) {
        console.error('[CallContext] Error adding ICE candidate:', err);
      }
    };

    // 11. Remote Media State (Mute/Video toggle)
    const handleMediaState = (payload: { isMuted?: boolean; isVideoOff?: boolean }) => {
      if (payload.isMuted !== undefined) setIsRemoteMuted(payload.isMuted);
      if (payload.isVideoOff !== undefined) setIsRemoteCameraOff(payload.isVideoOff);
    };

    socket.on('call:incoming', handleCallIncoming);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:missed', handleCallMissed);
    socket.on('call:busy', handleCallBusy);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleCallIceCandidate);
    socket.on('call:media-state', handleMediaState);

    return () => {
      socket.off('call:incoming', handleCallIncoming);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:missed', handleCallMissed);
      socket.off('call:busy', handleCallBusy);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleCallIceCandidate);
      socket.off('call:media-state', handleMediaState);
    };
  }, [
    socket,
    callState,
    currentUserId,
    getOrCreateWebRTC,
    startDurationTimer,
    cleanupCall,
    showToast,
  ]);

  const contextValue = React.useMemo<CallContextValue>(
    () => ({
      callState,
      activeCall,
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
      errorMessage,
      startCall,
      acceptCall,
      rejectCall,
      cancelCall,
      endCall,
      toggleMute,
      toggleCamera,
      clearError,
    }),
    [
      callState,
      activeCall,
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
      errorMessage,
      startCall,
      acceptCall,
      rejectCall,
      cancelCall,
      endCall,
      toggleMute,
      toggleCamera,
      clearError,
    ]
  );

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextValue => {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return ctx;
};

export default CallContext;
