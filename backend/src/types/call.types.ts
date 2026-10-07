export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'ended'
  | 'missed'
  | 'failed'
  | 'busy';

export interface CallParticipant {
  id: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  age?: number | null;
  isVerified?: boolean;
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
  duration: number; // Duration in seconds
  createdAt: string;
  updatedAt: string;
  caller?: CallParticipant;
  receiver?: CallParticipant;
  otherUser?: CallParticipant;
  isInitiator?: boolean;
}

export interface InitiateCallInput {
  targetUserId: number;
  callType: CallType;
  matchId?: number;
  conversationId?: number;
}

export interface CallSignalPayload {
  callId: number;
  targetUserId?: number;
  sdp?: any;
  candidate?: any;
  mediaState?: {
    isMuted?: boolean;
    isCameraEnabled?: boolean;
  };
}
