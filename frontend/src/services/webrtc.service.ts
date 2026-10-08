// Connectly WebRTC Service
// Manages RTCPeerConnection, MediaStreams, SDP Offer/Answer, and ICE Candidates

import type { CallType, WebRTCConnectionState } from '../types/call';

export interface WebRTCServiceCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onError?: (error: Error) => void;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: WebRTCServiceCallbacks = {};
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;

  constructor(callbacks: WebRTCServiceCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Set or update callbacks
   */
  public setCallbacks(callbacks: WebRTCServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get ICE server configuration
   */
  private getIceServers(): RTCConfiguration {
    const customStun = import.meta.env.VITE_STUN_SERVER;
    const stunServers = customStun
      ? [{ urls: customStun }]
      : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
        ];

    return {
      iceServers: stunServers,
      iceCandidatePoolSize: 10,
    };
  }

  /**
   * Acquire local user media stream with graceful permission handling
   */
  public async getLocalMedia(callType: CallType): Promise<MediaStream> {
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Your browser does not support audio/video calling. Please use a modern browser like Chrome, Firefox, Safari, or Edge.'
      );
    }

    // Stop existing local stream tracks if any
    this.stopLocalStream();

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === 'video'
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30, max: 60 },
            }
          : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const item = callType === 'video' ? 'Camera and microphone' : 'Microphone';
        throw new Error(
          `${item} permission was denied. Please allow permissions in your browser address bar settings to continue.`
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error(
          `No ${callType === 'video' ? 'camera or microphone' : 'microphone'} found on your device.`
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error(
          'Your camera or microphone is currently in use by another application. Please close other apps and try again.'
        );
      } else if (err.name === 'OverconstrainedError') {
        // Fallback with minimal constraints
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
          });
        } catch (fallbackErr: any) {
          throw new Error('Unable to access media devices: ' + (fallbackErr.message || fallbackErr.name));
        }
      } else {
        throw new Error('Unable to access media devices: ' + (err.message || err.name));
      }
    }

    // Verify acquired audio tracks
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('No microphone audio track found.');
    }
    audioTracks.forEach((t) => {
      t.enabled = true;
      console.log(`[WebRTC] Local audio track acquired: id=${t.id}, readyState=${t.readyState}, enabled=${t.enabled}`);
    });

    // Verify acquired video tracks for video calls
    if (callType === 'video') {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No camera video track found for video call.');
      }
      videoTracks.forEach((t) => {
        t.enabled = true;
        console.log(`[WebRTC] Local video track acquired: id=${t.id}, readyState=${t.readyState}, enabled=${t.enabled}`);
      });
    }

    return this.localStream;
  }

  /**
   * Initialize RTCPeerConnection and attach local media tracks
   */
  public initializePeerConnection(): RTCPeerConnection {
    this.closePeerConnection();

    const config = this.getIceServers();
    const pc = new RTCPeerConnection(config);
    this.peerConnection = pc;
    this.isRemoteDescriptionSet = false;
    this.iceCandidateQueue = [];

    // Setup dedicated remote stream container
    this.remoteStream = new MediaStream();

    // 1. Remote media tracks handler
    pc.ontrack = (event: RTCTrackEvent) => {
      console.log(
        `[WebRTC] ontrack: kind=${event.track.kind}, id=${event.track.id}, readyState=${event.track.readyState}`
      );

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track to remote stream container if not already present
      const alreadyHas = this.remoteStream.getTracks().some((t) => t.id === event.track.id);
      if (!alreadyHas) {
        this.remoteStream.addTrack(event.track);
        console.log(
          `[WebRTC] Added ${event.track.kind} track to remoteStream. Total remote tracks: ${this.remoteStream.getTracks().length}`
        );
      }

      const dispatchFreshRemoteStream = () => {
        if (this.callbacks.onRemoteStream && this.remoteStream) {
          // Wrap in a new MediaStream instance so React state recognizes the reference change
          // and triggers component re-render even if tracks arrive sequentially
          const freshSnapshot = new MediaStream(this.remoteStream.getTracks());
          console.log(
            `[WebRTC] Dispatching remote stream update to UI: audio=${freshSnapshot.getAudioTracks().length}, video=${freshSnapshot.getVideoTracks().length}`
          );
          this.callbacks.onRemoteStream(freshSnapshot);
        }
      };

      event.track.onunmute = () => {
        console.log(`[WebRTC] Remote track unmuted: kind=${event.track.kind}, id=${event.track.id}`);
        dispatchFreshRemoteStream();
      };

      event.track.onended = () => {
        console.log(`[WebRTC] Remote track ended: kind=${event.track.kind}, id=${event.track.id}`);
        dispatchFreshRemoteStream();
      };

      dispatchFreshRemoteStream();
    };

    // 2. Local ICE candidate generation handler
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        console.log('[WebRTC] Generated local ICE candidate:', event.candidate.protocol || 'candidate');
        this.callbacks.onIceCandidate(event.candidate);
      }
    };

    // 3. Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as WebRTCConnectionState;
      console.log(`[WebRTC] Connection state changed: ${state}`);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(state);
      }
    };

    // 4. ICE connection state handling
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state changed: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (this.callbacks.onConnectionStateChange) {
          this.callbacks.onConnectionStateChange('connected');
        }
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE connection failed, restarting ICE...');
        pc.restartIce();
      }
    };

    // 5. ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state: ${pc.iceGatheringState}`);
    };

    // 6. Attach existing local stream tracks
    this.attachLocalTracks();

    return pc;
  }

  /**
   * Ensure local tracks are attached to the PeerConnection
   */
  public attachLocalTracks(): void {
    if (!this.peerConnection || !this.localStream) return;
    const senders = this.peerConnection.getSenders();
    this.localStream.getTracks().forEach((track) => {
      const alreadyAttached = senders.some((s) => s.track && s.track.id === track.id);
      if (!alreadyAttached) {
        // Check if there is an empty sender for this kind from a remote offer
        const emptySender = senders.find((s) => !s.track);
        if (emptySender) {
          try {
            emptySender.replaceTrack(track);
            console.log(`[WebRTC] Replaced track on existing sender: kind=${track.kind}`);
            return;
          } catch {
            // fall back to addTrack
          }
        }
        try {
          this.peerConnection!.addTrack(track, this.localStream!);
          console.log(`[WebRTC] Attached track to PeerConnection: kind=${track.kind}, id=${track.id}`);
        } catch (err) {
          console.warn(`[WebRTC] Error attaching track ${track.kind}:`, err);
        }
      }
    });
  }

  /**
   * Ensure transceivers for existing tracks are set to sendrecv
   */
  private configureTransceiverDirections(): void {
    if (!this.peerConnection) return;
    this.peerConnection.getTransceivers().forEach((transceiver) => {
      const trackKind = transceiver.receiver.track?.kind;
      if (trackKind && this.localStream) {
        const localTrack = this.localStream.getTracks().find((t) => t.kind === trackKind && t.readyState === 'live');
        if (localTrack && (!transceiver.sender.track || transceiver.sender.track !== localTrack)) {
          try {
            transceiver.sender.replaceTrack(localTrack);
            console.log(`[WebRTC] Transceiver assigned local track: ${trackKind}`);
          } catch (e) {
            console.warn(`[WebRTC] replaceTrack warning for ${trackKind}:`, e);
          }
        }
      }
      if (transceiver.direction === 'recvonly' || transceiver.direction === 'inactive') {
        transceiver.direction = 'sendrecv';
      }
    });
  }

  /**
   * Create WebRTC SDP Offer (Caller)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.initializePeerConnection();
    }
    const pc = this.peerConnection!;

    this.attachLocalTracks();
    this.configureTransceiverDirections();

    console.log('[WebRTC] Creating SDP offer...');
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    console.log('[WebRTC] Setting local description (offer)...');
    await pc.setLocalDescription(offer);

    const hasVideoMedia = pc.localDescription?.sdp?.includes('m=video');
    console.log(`[WebRTC] SDP Offer initialized. Contains m=video: ${hasVideoMedia}`);

    return pc.localDescription!;
  }

  /**
   * Handle WebRTC SDP Offer and generate SDP Answer (Receiver)
   */
  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.initializePeerConnection();
    }
    const pc = this.peerConnection!;

    this.attachLocalTracks();

    console.log('[WebRTC] Setting remote description (offer)...');
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.isRemoteDescriptionSet = true;
    await this.processQueuedIceCandidates();

    // Re-verify local tracks are properly attached to the transceivers created by the offer
    this.attachLocalTracks();
    this.configureTransceiverDirections();

    console.log('[WebRTC] Creating SDP answer...');
    const answer = await pc.createAnswer();

    console.log('[WebRTC] Setting local description (answer)...');
    await pc.setLocalDescription(answer);

    const hasVideoMedia = pc.localDescription?.sdp?.includes('m=video');
    console.log(`[WebRTC] SDP Answer initialized. Contains m=video: ${hasVideoMedia}`);

    return pc.localDescription!;
  }

  /**
   * Handle WebRTC SDP Answer (Caller)
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn('[WebRTC] PeerConnection not initialized for answer');
      return;
    }
    const pc = this.peerConnection;

    if (pc.signalingState !== 'stable') {
      const hasVideoMedia = answer.sdp?.includes('m=video');
      console.log(`[WebRTC] Setting remote description (answer)... Contains m=video: ${hasVideoMedia}`);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.isRemoteDescriptionSet = true;
      await this.processQueuedIceCandidates();
      console.log('[WebRTC] Remote description (answer) successfully applied.');
    } else {
      console.log('[WebRTC] Signaling state already stable, skipping duplicate answer');
    }
  }

  /**
   * Add ICE candidate received from signaling
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate || (!candidate.candidate && candidate.candidate !== '')) {
      return;
    }

    if (!this.peerConnection || !this.isRemoteDescriptionSet || !this.peerConnection.remoteDescription) {
      // Buffer candidate until remote description is established
      this.iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Non-fatal ICE candidate insertion failure
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  /**
   * Flush buffered ICE candidates
   */
  private async processQueuedIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.isRemoteDescriptionSet) return;

    while (this.iceCandidateQueue.length > 0) {
      const cand = this.iceCandidateQueue.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('[WebRTC] Queued ICE candidate error:', err);
        }
      }
    }
  }

  /**
   * Mute / Unmute local audio track
   */
  public toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // true if muted
    }
    return false;
  }

  /**
   * Toggle local camera track
   */
  public toggleCamera(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // true if camera is off
    }
    return false;
  }

  /**
   * Stop all local stream tracks
   */
  public stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }
  }

  /**
   * Close RTCPeerConnection safely
   */
  public closePeerConnection(): void {
    if (this.peerConnection) {
      try {
        this.peerConnection.ontrack = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch {
        // ignore
      }
      this.peerConnection = null;
    }
    this.isRemoteDescriptionSet = false;
    this.iceCandidateQueue = [];
    this.remoteStream = null;
  }

  /**
   * Complete cleanup of all media and peer resources
   */
  public cleanup(): void {
    this.stopLocalStream();
    this.closePeerConnection();
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getConnectionState(): WebRTCConnectionState {
    return (this.peerConnection?.connectionState as WebRTCConnectionState) || 'closed';
  }
}

export default WebRTCService;
