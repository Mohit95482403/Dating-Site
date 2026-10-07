// Connectly WebRTC Calling Domain Types

export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'ended'
  | 'missed'
  | 'busy'
  | 'failed';

export interface CallParticipant {
  id: number;
  firstName: string;
  lastName?: string | null;
  age?: number | null;
  photoUrl?: string | null;
}

export interface CallRecord {
  id: number;
  matchId: number;
  conversationId: number | null;
  callerId: number;
  receiverId: number;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  duration: number;
  caller?: CallParticipant;
  receiver?: CallParticipant;
  createdAt?: string;
  updatedAt?: string;
}

export interface InitiateCallPayload {
  targetUserId: number;
  callType: CallType;
  matchId?: number;
  conversationId?: number;
}

export interface CallSignalPayload {
  callId: number;
  targetUserId: number;
  senderId?: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';
