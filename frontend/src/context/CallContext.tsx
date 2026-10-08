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

  // Persistent mutable refs to eliminate stale closures in WebRTC callbacks and socket listeners
  const activeCallRef = useRef<CallRecord | null>(null);
  const socketRef = useRef<any>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const callTypeRef = useRef<CallType>('audio');
  const callStateRef = useRef<CallUIState>('idle');
  const hasCreatedOfferRef = useRef<boolean>(false);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId ? Number(currentUserId) : null;
  }, [currentUserId]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Cleanup helper
  const cleanupCall = useCallback(() => {
    hasCreatedOfferRef.current = false;
    activeCallRef.current = null;
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

  // Clean up on tab close / reload / navigation unload
  useEffect(() => {
    const handleUnload = () => {
      const currentCall = activeCallRef.current;
      if (currentCall && currentCall.id) {
        try {
          socketRef.current?.emit('call:leave', { callId: currentCall.id });
        } catch {
          // ignore
        }
      }
      cleanupCall();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [cleanupCall]);

  // Initialize WebRTC instance on demand with fresh ref access
  const getOrCreateWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService({
        onRemoteStream: (stream) => {
          console.log('[CallContext] Received remote media stream');
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          console.log('[CallContext] WebRTC connection state changed to:', state);
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
          const call = activeCallRef.current;
          const sock = socketRef.current;
          const myId = currentUserIdRef.current;
          if (sock && call && call.id) {
            const targetId =
              call.callerId === myId
                ? call.receiverId
                : call.callerId;
            console.log(`[WebRTC] Emitting call:ice-candidate for call ${call.id} to target ${targetId}`);
            sock.emit('call:ice-candidate', {
              callId: call.id,
              targetUserId: targetId,
              candidate: candidate.toJSON(),
            });
          }
        },
        onError: (err) => {
          console.error('[WebRTC] WebRTC service error:', err);
          setErrorMessage(err.message);
        },
      });
    }
    return webrtcRef.current;
  }, [cleanupCall, showToast]);

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

      if (callStateRef.current !== 'idle') {
        showToast('You are already on a call.', 'warning');
        return;
      }

      setErrorMessage(null);
      setCallType(type);
      callTypeRef.current = type;
      setPartner(partnerInfo);
      setCallState('calling');
      hasCreatedOfferRef.current = false;

      try {
        const webrtc = getOrCreateWebRTC();

        // 1. Acquire local camera / microphone media
        console.log('[WebRTC] Acquiring local media for outgoing call...');
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

        activeCallRef.current = callRecord;
        setActiveCall(callRecord);

        // 4. Join Socket.IO call room
        if (socketRef.current && callRecord?.id) {
          socketRef.current.emit('call:join', { callId: callRecord.id });
        }
      } catch (err: any) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message || 'Failed to initiate call';
        console.error('[CallContext] Error starting call:', err);
        setErrorMessage(msg);
        if (status === 409) {
          showToast('This member is currently on another call.', 'warning');
        } else {
          showToast(msg, 'error');
        }
        cleanupCall();
      }
    },
    [getOrCreateWebRTC, cleanupCall, showToast]
  );

  /**
   * Accept Incoming Call
   */
  const acceptCall = useCallback(async (): Promise<void> => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;

    const callId = Number(currentCall.id);
    if (!Number.isInteger(callId) || callId <= 0) {
      showToast('Unable to accept call: invalid call ID.', 'error');
      cleanupCall();
      return;
    }

    setErrorMessage(null);
    try {
      const webrtc = getOrCreateWebRTC();

      const targetCallType: CallType =
        activeCallRef.current?.callType === 'video' ||
        (activeCallRef.current as any)?.call_type === 'video' ||
        callTypeRef.current === 'video'
          ? 'video'
          : 'audio';

      setCallType(targetCallType);
      callTypeRef.current = targetCallType;

      // 1. Acquire local media (ensure video is acquired for video call)
      console.log(`[WebRTC] Receiver acquiring local media for incoming ${targetCallType} call...`);
      const stream = await webrtc.getLocalMedia(targetCallType);
      setLocalStream(stream);

      // 2. Initialize PeerConnection and attach local tracks
      webrtc.initializePeerConnection();

      // 3. Join Socket room
      if (socketRef.current) {
        socketRef.current.emit('call:join', { callId });
      }

      // 4. Confirm acceptance with Backend
      const updated = await callService.acceptCall(callId);
      activeCallRef.current = updated;
      setActiveCall(updated);
      setCallState('connected');
      startDurationTimer();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to accept call';
      console.error('[CallContext] Error accepting call:', err);
      setErrorMessage(msg);
      showToast(msg, 'error');
      cleanupCall();
    }
  }, [getOrCreateWebRTC, startDurationTimer, cleanupCall, showToast]);

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
          isCameraEnabled: !isCameraOff,
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
          isCameraEnabled: !cameraOff,
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
      if (callStateRef.current !== 'idle') {
        socketRef.current?.emit('call:busy', { callId: incomingCallId, callerId });
        return;
      }

      const rawCallType =
        data?.callType ||
        data?.call_type ||
        (data?.call && (data.call.callType || data.call.call_type)) ||
        data?.type ||
        'audio';
      const resolvedCallType: CallType = rawCallType === 'video' ? 'video' : 'audio';

      const incomingRecord: CallRecord = {
        id: incomingCallId,
        matchId: Number(data?.matchId || 0),
        conversationId: data?.conversationId ? Number(data.conversationId) : null,
        callerId,
        receiverId: currentUserIdRef.current ?? 0,
        callType: resolvedCallType,
        status: 'ringing',
        startedAt: data?.startedAt || new Date().toISOString(),
        answeredAt: null,
        endedAt: null,
        duration: 0,
        caller: safeCaller,
      };

      activeCallRef.current = incomingRecord;
      setActiveCall(incomingRecord);
      setCallType(resolvedCallType);
      callTypeRef.current = resolvedCallType;
      setPartner(safeCaller);
      setCallState('incoming');
    };

    // 2. Call Accepted (Received by caller)
    const handleCallAccepted = async (data: any) => {
      console.log('[WebRTC] Received call:accepted event:', data);
      const callRecord = (data?.call || data) as CallRecord;
      const callId = Number(data?.callId || callRecord?.id || activeCallRef.current?.id);
      const targetUserId = Number(
        callRecord?.receiverId ||
        activeCallRef.current?.receiverId ||
        (activeCallRef.current?.callerId === currentUserIdRef.current
          ? activeCallRef.current?.receiverId
          : activeCallRef.current?.callerId)
      );

      const rawCallType =
        callRecord?.callType ||
        (callRecord as any)?.call_type ||
        callTypeRef.current;
      if (rawCallType === 'video') {
        setCallType('video');
        callTypeRef.current = 'video';
      }

      activeCallRef.current = callRecord;
      setActiveCall(callRecord);
      setCallState('connected');
      startDurationTimer();

      if (hasCreatedOfferRef.current) {
        console.log('[WebRTC] Offer already initiated for call', callId, '- skipping duplicate');
        return;
      }
      hasCreatedOfferRef.current = true;

      // Caller creates and transmits WebRTC SDP Offer
      try {
        console.log(`[WebRTC] Caller creating offer for callId: ${callId}, targetUserId: ${targetUserId}`);
        const webrtc = getOrCreateWebRTC();
        const offer = await webrtc.createOffer();
        console.log('[WebRTC] Offer created successfully, emitting call:offer');
        socketRef.current?.emit('call:offer', {
          callId,
          targetUserId,
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
      showToast('This member is currently on another call.', 'warning');
      cleanupCall();
    };

    // 8. WebRTC SDP Offer (Received by callee)
    const handleCallOffer = async (payload: CallSignalPayload) => {
      // Guard against self-signaling loopback
      if (payload?.senderId && payload.senderId === currentUserIdRef.current) {
        console.log('[WebRTC] Ignoring self-emitted call:offer');
        return;
      }

      console.log('[WebRTC] Received call:offer from senderId:', payload?.senderId);
      try {
        const webrtc = getOrCreateWebRTC();

        const isVideoOffer =
          Boolean(payload?.sdp?.sdp?.includes('m=video')) ||
          callTypeRef.current === 'video' ||
          activeCallRef.current?.callType === 'video';

        if (isVideoOffer) {
          callTypeRef.current = 'video';
          setCallType('video');
        }

        // Ensure receiver has local tracks acquired and attached before generating answer
        const existingLocalStream = webrtc.getLocalStream();
        const hasVideo = existingLocalStream && existingLocalStream.getVideoTracks().length > 0;
        if (isVideoOffer && (!existingLocalStream || !hasVideo)) {
          console.log('[WebRTC] Acquiring local video media for incoming video offer before answer...');
          const stream = await webrtc.getLocalMedia('video');
          setLocalStream(stream);
        } else if (!existingLocalStream) {
          console.log('[WebRTC] Acquiring local media for incoming offer before answer...');
          const stream = await webrtc.getLocalMedia(callTypeRef.current);
          setLocalStream(stream);
        }

        if (payload?.sdp) {
          console.log('[WebRTC] Receiver setting remote offer and creating answer');
          const answer = await webrtc.handleOffer(payload.sdp);
          console.log('[WebRTC] Answer created successfully, emitting call:answer');
          socketRef.current?.emit('call:answer', {
            callId: payload.callId,
            targetUserId: payload.senderId,
            sdp: answer,
          });
        }
      } catch (err: any) {
        console.error('[CallContext] Error handling SDP offer:', err);
        showToast('WebRTC negotiation failed', 'error');
        cleanupCall();
      }
    };

    // 9. WebRTC SDP Answer (Received by caller)
    const handleCallAnswer = async (payload: CallSignalPayload) => {
      // Guard against self-signaling loopback
      if (payload?.senderId && payload.senderId === currentUserIdRef.current) {
        console.log('[WebRTC] Ignoring self-emitted call:answer');
        return;
      }

      console.log('[WebRTC] Caller received call:answer');
      try {
        if (webrtcRef.current && payload?.sdp) {
          console.log('[WebRTC] Caller setting remote answer');
          await webrtcRef.current.handleAnswer(payload.sdp);
          console.log('[WebRTC] Caller remote description set successfully');
        }
      } catch (err: any) {
        console.error('[CallContext] Error handling SDP answer:', err);
        showToast('WebRTC negotiation failed', 'error');
        cleanupCall();
      }
    };

    // 10. WebRTC ICE Candidate
    const handleCallIceCandidate = async (payload: CallSignalPayload) => {
      // Guard against self-signaling loopback
      if (payload?.senderId && payload.senderId === currentUserIdRef.current) {
        return;
      }

      try {
        if (webrtcRef.current && payload?.candidate) {
          await webrtcRef.current.addIceCandidate(payload.candidate);
        }
      } catch (err) {
        console.warn('[CallContext] Error adding ICE candidate:', err);
      }
    };

    // 11. Remote Media State (Mute/Video toggle)
    const handleMediaState = (payload: { isMuted?: boolean; isVideoOff?: boolean; isCameraEnabled?: boolean }) => {
      if (payload.isMuted !== undefined) setIsRemoteMuted(payload.isMuted);
      if (payload.isVideoOff !== undefined) {
        setIsRemoteCameraOff(payload.isVideoOff);
      } else if (payload.isCameraEnabled !== undefined) {
        setIsRemoteCameraOff(!payload.isCameraEnabled);
      }
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
