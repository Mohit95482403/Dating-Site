import { CallModel } from '../models/call.model';
import { MatchModel } from '../models/match.model';
import { BlockModel } from '../models/block.model';
import { ConversationModel } from '../models/conversation.model';
import { NotificationService } from './notification.service';
import { UserModel } from '../models/user.model';
import { AbuseRiskService } from './abuseRisk.service';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/httpStatus';
import {
  CallRecord,
  CallType,
  InitiateCallInput,
} from '../types/call.types';
import { logger } from '../utils/logger';
import { SocketUserRegistry } from '../sockets/socketEvents';

// Lazy-loaded or dynamically referenced socket emitters
let socketEmitters: any = null;
const getSocketEmitters = () => {
  if (!socketEmitters) {
    socketEmitters = require('../sockets/socket');
  }
  return socketEmitters;
};

// Map of active ringing call timer timeouts (callId -> NodeJS.Timeout)
const ringingTimers = new Map<number, NodeJS.Timeout>();

export interface ActiveCallSession {
  callId: number;
  callerId: number;
  receiverId: number;
  callType: CallType;
  status: 'ringing' | 'accepted';
  startedAt: number;
  acceptedAt?: number;
}

export class CallService {
  // In-memory active call sessions for authoritative state & instant busy detection
  private static activeSessionsByCallId = new Map<number, ActiveCallSession>();
  private static userActiveCallMap = new Map<number, number>(); // userId -> callId
  private static targetLocks = new Map<number, Promise<void>>(); // Serialized target call locks
  private static periodicCleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Serialize concurrent call initiation attempts to the same target user (Race condition protection)
   */
  public static async withTargetLock<T>(targetUserId: number, fn: () => Promise<T>): Promise<T> {
    const prevLock = this.targetLocks.get(targetUserId) || Promise.resolve();
    let releaseCurrent: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    this.targetLocks.set(targetUserId, prevLock.then(() => currentLock));

    try {
      await prevLock;
      return await fn();
    } finally {
      releaseCurrent!();
      if (this.targetLocks.get(targetUserId) === prevLock.then(() => currentLock)) {
        this.targetLocks.delete(targetUserId);
      }
    }
  }

  /**
   * Register an in-memory active call session
   */
  public static registerActiveSession(session: ActiveCallSession): void {
    this.activeSessionsByCallId.set(session.callId, session);
    this.userActiveCallMap.set(session.callerId, session.callId);
    this.userActiveCallMap.set(session.receiverId, session.callId);
  }

  /**
   * Update active call session status ('ringing' -> 'accepted')
   */
  public static updateSessionStatus(callId: number, status: 'ringing' | 'accepted'): void {
    const session = this.activeSessionsByCallId.get(callId);
    if (session) {
      session.status = status;
      if (status === 'accepted') {
        session.acceptedAt = Date.now();
      }
    }
  }

  /**
   * Clear an active call session idempotently
   */
  public static clearActiveSession(callId: number): void {
    const session = this.activeSessionsByCallId.get(callId);
    if (session) {
      if (this.userActiveCallMap.get(session.callerId) === callId) {
        this.userActiveCallMap.delete(session.callerId);
      }
      if (this.userActiveCallMap.get(session.receiverId) === callId) {
        this.userActiveCallMap.delete(session.receiverId);
      }
      this.activeSessionsByCallId.delete(callId);
    }
    this.clearRingingTimeout(callId);
  }

  /**
   * Get active session involving a specific user
   */
  public static getActiveSessionForUser(userId: number): ActiveCallSession | null {
    const callId = this.userActiveCallMap.get(userId);
    if (!callId) return null;
    return this.activeSessionsByCallId.get(callId) || null;
  }

  /**
   * Authoritative Busy Check for Target User
   * USER B IS BUSY ONLY IF USER B CURRENTLY HAS A REAL ACTIVE CALL.
   */
  public static async checkUserBusyState(
    targetUserId: number,
    callerId: number
  ): Promise<{
    isBusy: boolean;
    targetCallState: 'AVAILABLE' | 'RINGING' | 'ACTIVE';
    activeCallId?: number;
    reason: string;
  }> {
    // 1. Check in-memory active call session
    const memoryCallId = this.userActiveCallMap.get(targetUserId);
    if (memoryCallId) {
      const session = this.activeSessionsByCallId.get(memoryCallId);
      if (!session) {
        this.userActiveCallMap.delete(targetUserId);
      } else {
        // If the caller is the exact same caller retrying or re-initiating
        if (session.callerId === callerId) {
          // Cancel/supersede the previous attempt between User A and User B
          this.clearActiveSession(memoryCallId);
          await CallModel.updateStatus(memoryCallId, 'cancelled', { endedAt: new Date() }).catch(() => {});
        } else if (session.status === 'ringing') {
          // Ringing session from another caller
          // Check if ringing timed out (>35s)
          if (Date.now() - session.startedAt > 35000) {
            this.clearActiveSession(memoryCallId);
            await CallModel.updateStatus(memoryCallId, 'missed', { endedAt: new Date() }).catch(() => {});
          } else {
            // Is that caller still online?
            const otherCallerOnline = SocketUserRegistry.isUserOnline(session.callerId);
            if (!otherCallerOnline) {
              // The other caller disconnected, ringing call abandoned
              this.clearActiveSession(memoryCallId);
              await CallModel.updateStatus(memoryCallId, 'cancelled', { endedAt: new Date() }).catch(() => {});
            } else {
              // Genuinely receiving an incoming call right now from someone else
              return {
                isBusy: true,
                targetCallState: 'RINGING',
                activeCallId: memoryCallId,
                reason: `Target is currently receiving an incoming call from user ${session.callerId}`,
              };
            }
          }
        } else if (session.status === 'accepted') {
          // Verify both users are alive on sockets
          const targetOnline = SocketUserRegistry.isUserOnline(targetUserId);
          const partnerId = session.callerId === targetUserId ? session.receiverId : session.callerId;
          const partnerOnline = SocketUserRegistry.isUserOnline(partnerId);

          if (!targetOnline || !partnerOnline) {
            // One or both disconnected unexpectedly, clean up
            this.clearActiveSession(memoryCallId);
            await CallModel.updateStatus(memoryCallId, 'ended', { endedAt: new Date() }).catch(() => {});
          } else {
            return {
              isBusy: true,
              targetCallState: 'ACTIVE',
              activeCallId: memoryCallId,
              reason: `Target is currently connected in an active call with user ${partnerId}`,
            };
          }
        }
      }
    }

    // 2. Validate database records (handles calls across restarts or prior sessions)
    const dbCall = await CallModel.findActiveCallForUser(targetUserId, callerId);
    if (!dbCall) {
      return {
        isBusy: false,
        targetCallState: 'AVAILABLE',
        reason: 'Target has no active call records',
      };
    }

    // If call was with this same caller, auto-cancel
    if (dbCall.callerId === callerId) {
      await CallModel.updateStatus(dbCall.id, 'cancelled', { endedAt: new Date() }).catch(() => {});
      return {
        isBusy: false,
        targetCallState: 'AVAILABLE',
        reason: 'Previous call between same users superseded',
      };
    }

    // If call is ringing
    if (dbCall.status === 'ringing') {
      const ageMs = Date.now() - new Date(dbCall.startedAt).getTime();
      if (ageMs > 35000) {
        await CallModel.updateStatus(dbCall.id, 'missed', { endedAt: new Date() }).catch(() => {});
        return {
          isBusy: false,
          targetCallState: 'AVAILABLE',
          reason: 'Previous ringing call expired (>35s)',
        };
      }
      const otherCallerOnline = SocketUserRegistry.isUserOnline(dbCall.callerId);
      if (!otherCallerOnline) {
        await CallModel.updateStatus(dbCall.id, 'cancelled', { endedAt: new Date() }).catch(() => {});
        return {
          isBusy: false,
          targetCallState: 'AVAILABLE',
          reason: 'Prior ringing caller disconnected',
        };
      }
      // Target is currently ringing from another user
      this.registerActiveSession({
        callId: dbCall.id,
        callerId: dbCall.callerId,
        receiverId: dbCall.receiverId,
        callType: dbCall.callType,
        status: 'ringing',
        startedAt: new Date(dbCall.startedAt).getTime(),
      });
      return {
        isBusy: true,
        targetCallState: 'RINGING',
        activeCallId: dbCall.id,
        reason: `Target is currently receiving an incoming call from user ${dbCall.callerId}`,
      };
    }

    // If call is accepted
    if (dbCall.status === 'accepted') {
      const targetOnline = SocketUserRegistry.isUserOnline(targetUserId);
      const partnerId = dbCall.callerId === targetUserId ? dbCall.receiverId : dbCall.callerId;
      const partnerOnline = SocketUserRegistry.isUserOnline(partnerId);

      if (!targetOnline || !partnerOnline) {
        // Abandoned call in DB
        await CallModel.updateStatus(dbCall.id, 'ended', { endedAt: new Date() }).catch(() => {});
        return {
          isBusy: false,
          targetCallState: 'AVAILABLE',
          reason: 'Stale accepted call cleaned up (participants offline)',
        };
      }

      // Verified active connected call
      this.registerActiveSession({
        callId: dbCall.id,
        callerId: dbCall.callerId,
        receiverId: dbCall.receiverId,
        callType: dbCall.callType,
        status: 'accepted',
        startedAt: new Date(dbCall.startedAt).getTime(),
      });
      return {
        isBusy: true,
        targetCallState: 'ACTIVE',
        activeCallId: dbCall.id,
        reason: `Target is currently in an active call with user ${partnerId}`,
      };
    }

    return {
      isBusy: false,
      targetCallState: 'AVAILABLE',
      reason: 'Target is available',
    };
  }

  /**
   * Initiate a new audio or video call between matched members
   */
  public static async initiateCall(
    callerId: number,
    input: InitiateCallInput
  ): Promise<CallRecord> {
    const { targetUserId, callType } = input;

    // 1. Basic validation
    if (!Number.isInteger(callerId) || callerId <= 0) {
      throw new AppError('Valid caller ID is required', HttpStatus.UNAUTHORIZED);
    }

    const receiverId = Number(targetUserId);
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      throw new AppError('Valid recipient user ID is required', HttpStatus.BAD_REQUEST);
    }

    if (callerId === receiverId) {
      throw new AppError('You cannot call your own account', HttpStatus.BAD_REQUEST);
    }

    if (callType !== 'audio' && callType !== 'video') {
      throw new AppError("callType must be either 'audio' or 'video'", HttpStatus.BAD_REQUEST);
    }

    // 2. Verify target user exists and is active
    const targetUser = await UserModel.findById(receiverId);
    if (!targetUser) {
      throw new AppError('Target user does not exist', HttpStatus.NOT_FOUND);
    }
    if (targetUser.status !== 'active') {
      throw new AppError('Target user is currently unavailable', HttpStatus.FORBIDDEN);
    }

    // Check account restrictions
    await AbuseRiskService.assertCanCall(callerId);

    // 3. Verify neither user has blocked the other
    const isBlocked = await BlockModel.isBlocked(callerId, receiverId);
    if (isBlocked) {
      throw new AppError('You cannot call this user', HttpStatus.FORBIDDEN);
    }

    // 4. Verify an active match exists between both users
    const match = await MatchModel.findMatchBetween(callerId, receiverId);
    if (!match || match.status !== 'active') {
      throw new AppError('You can only call users you have actively matched with', HttpStatus.FORBIDDEN);
    }

    // Wrap in targetLock to atomically evaluate call state and prevent simultaneous call race conditions
    return await this.withTargetLock(receiverId, async () => {
      // 5. Authoritative Busy Check for Target User (Receiver)
      // Check in-memory session and validated database state
      const busyCheck = await this.checkUserBusyState(receiverId, callerId);

      // Structured logging per Section 16 requirements:
      const targetSocketIds = SocketUserRegistry.getUserSockets(receiverId);
      logger.info(`[CALL] caller: ${callerId}`);
      logger.info(`[CALL] target: ${receiverId}`);
      logger.info(`[CALL] targetCallState: ${busyCheck.targetCallState}`);
      logger.info(`[CALL] targetActiveCallId: ${busyCheck.activeCallId ?? 'none'}`);
      logger.info(`[CALL] targetSocketId: ${targetSocketIds.join(',') || 'none'}`);
      logger.info(`[CALL] busyDecision: ${busyCheck.isBusy ? 'REJECT_BUSY' : 'ALLOW_CALL'}`);
      logger.info(`[CALL] reason: ${busyCheck.reason}`);

      if (busyCheck.isBusy) {
        // Create a busy record so call history reflects the attempt
        const busyCallId = await CallModel.createCall({
          matchId: match.id,
          conversationId: input.conversationId || null,
          callerId,
          receiverId,
          callType,
        });
        await CallModel.updateStatus(busyCallId, 'busy', { endedAt: new Date() });
        const busyCall = await CallModel.findById(busyCallId, callerId);

        // Notify caller of busy status
        const { emitCallBusy } = getSocketEmitters();
        if (emitCallBusy) {
          emitCallBusy(callerId, busyCall);
        }

        throw new AppError('This member is currently on another call', HttpStatus.CONFLICT);
      }

      // 6. Check if caller has any prior active/ringing call hanging
      const callerActiveSession = this.getActiveSessionForUser(callerId);
      if (callerActiveSession) {
        await this.endCall(callerActiveSession.callId, callerId).catch(() => {});
        this.clearActiveSession(callerActiveSession.callId);
      } else {
        const dbCallerCall = await CallModel.findActiveCallForUser(callerId);
        if (dbCallerCall) {
          await this.endCall(dbCallerCall.id, callerId).catch(() => {});
        }
      }

      // 7. Resolve conversation ID
      let conversationId = input.conversationId || null;
      if (!conversationId) {
        const conv = await ConversationModel.getOrCreateForMatch(match.id, callerId, receiverId);
        if (conv) {
          conversationId = conv.id;
        }
      }

      // 8. Create call in MySQL with status 'ringing'
      const callId = await CallModel.createCall({
        matchId: match.id,
        conversationId,
        callerId,
        receiverId,
        callType,
      });

      const callRecord = await CallModel.findById(callId, callerId);
      if (!callRecord) {
        throw new AppError('Failed to initialize call record', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Register session in memory
      this.registerActiveSession({
        callId,
        callerId,
        receiverId,
        callType,
        status: 'ringing',
        startedAt: Date.now(),
      });

      // 9. Dispatch real-time 'call:incoming' event to receiver via Socket.IO
      const { emitCallIncoming } = getSocketEmitters();
      if (emitCallIncoming) {
        emitCallIncoming(receiverId, callRecord);
      }

      // 10. Start server-side ringing timeout (35 seconds)
      this.scheduleRingingTimeout(callId, callerId, receiverId);

      logger.info(`[CallService] Call ${callId} (${callType}) initiated by user ${callerId} -> user ${receiverId}`);
      return callRecord;
    });
  }

  /**
   * Receiver accepts the incoming call
   */
  public static async acceptCall(callId: number, receiverId: number): Promise<CallRecord> {
    if (!Number.isInteger(callId) || callId <= 0) {
      throw new AppError('Valid call ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      throw new AppError('Valid receiver ID is required', HttpStatus.BAD_REQUEST);
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      throw new AppError('Call not found', HttpStatus.NOT_FOUND);
    }

    if (call.receiverId !== receiverId) {
      throw new AppError('You are not authorized to accept this call', HttpStatus.FORBIDDEN);
    }

    if (call.status !== 'ringing') {
      throw new AppError(`Cannot accept call with status '${call.status}'`, HttpStatus.BAD_REQUEST);
    }

    // Cancel ringing timeout
    this.clearRingingTimeout(callId);

    // Update in-memory session status
    this.updateSessionStatus(callId, 'accepted');

    await CallModel.updateStatus(callId, 'accepted');

    const updatedCall = await CallModel.findById(callId, receiverId);
    if (!updatedCall) {
      throw new AppError('Failed to retrieve updated call record', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Emit Socket.IO 'call:accepted' event to caller and call room
    const { emitCallAccepted } = getSocketEmitters();
    if (emitCallAccepted) {
      emitCallAccepted(callId, call.callerId, updatedCall);
    }

    logger.info(`[CallService] Call ${callId} accepted by user ${receiverId}`);
    return updatedCall;
  }

  /**
   * Receiver rejects the incoming call
   */
  public static async rejectCall(callId: number, receiverId: number): Promise<CallRecord> {
    if (!Number.isInteger(callId) || callId <= 0) {
      throw new AppError('Valid call ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      throw new AppError('Valid receiver ID is required', HttpStatus.BAD_REQUEST);
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      throw new AppError('Call not found', HttpStatus.NOT_FOUND);
    }

    if (call.receiverId !== receiverId) {
      throw new AppError('You are not authorized to reject this call', HttpStatus.FORBIDDEN);
    }

    if (call.status !== 'ringing') {
      throw new AppError(`Cannot reject call with status '${call.status}'`, HttpStatus.BAD_REQUEST);
    }

    this.clearActiveSession(callId);

    const endedAt = new Date();
    await CallModel.updateStatus(callId, 'rejected', { endedAt });

    const updatedCall = await CallModel.findById(callId, receiverId);

    // Emit Socket.IO 'call:rejected' event to caller
    const { emitCallRejected } = getSocketEmitters();
    if (emitCallRejected) {
      emitCallRejected(callId, call.callerId);
    }

    logger.info(`[CallService] Call ${callId} rejected by user ${receiverId}`);
    return updatedCall!;
  }

  /**
   * Caller cancels the call while still ringing
   */
  public static async cancelCall(callId: number, callerId: number): Promise<CallRecord> {
    if (!Number.isInteger(callId) || callId <= 0) {
      throw new AppError('Valid call ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(callerId) || callerId <= 0) {
      throw new AppError('Valid caller ID is required', HttpStatus.BAD_REQUEST);
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      throw new AppError('Call not found', HttpStatus.NOT_FOUND);
    }

    if (call.callerId !== callerId) {
      throw new AppError('You are not authorized to cancel this call', HttpStatus.FORBIDDEN);
    }

    if (call.status !== 'ringing') {
      throw new AppError(`Cannot cancel call with status '${call.status}'`, HttpStatus.BAD_REQUEST);
    }

    this.clearActiveSession(callId);

    const endedAt = new Date();
    await CallModel.updateStatus(callId, 'cancelled', { endedAt });

    const updatedCall = await CallModel.findById(callId, callerId);

    // Emit Socket.IO 'call:cancelled' event to receiver
    const { emitCallCancelled } = getSocketEmitters();
    if (emitCallCancelled) {
      emitCallCancelled(call.receiverId, callId);
    }

    logger.info(`[CallService] Call ${callId} cancelled by caller ${callerId}`);
    return updatedCall!;
  }

  /**
   * End an active call (either participant can terminate)
   */
  public static async endCall(callId: number, userId: number): Promise<CallRecord> {
    if (!Number.isInteger(callId) || callId <= 0) {
      throw new AppError('Valid call ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Valid user ID is required', HttpStatus.BAD_REQUEST);
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      throw new AppError('Call not found', HttpStatus.NOT_FOUND);
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new AppError('You are not a participant in this call', HttpStatus.FORBIDDEN);
    }

    this.clearActiveSession(callId);

    // If already in a terminal state, return current record
    if (['ended', 'cancelled', 'rejected', 'missed', 'failed', 'busy'].includes(call.status)) {
      return call;
    }

    await CallModel.updateStatus(callId, 'ended');

    const updatedCall = await CallModel.findById(callId, userId);

    // Emit Socket.IO 'call:ended' to both participants
    const { emitCallEnded } = getSocketEmitters();
    if (emitCallEnded) {
      emitCallEnded(callId, call.callerId, call.receiverId, updatedCall);
    }

    logger.info(`[CallService] Call ${callId} ended by user ${userId}. Duration: ${updatedCall?.duration || 0}s`);
    return updatedCall!;
  }

  /**
   * Handle user socket disconnect: cleanly terminates any active/ringing calls
   * so users are NEVER left permanently marked busy.
   */
  public static async handleUserDisconnect(userId: number): Promise<void> {
    const session = this.getActiveSessionForUser(userId);
    if (!session) {
      // Check database just in case there is a lingering call
      const dbCall = await CallModel.findActiveCallForUser(userId);
      if (dbCall) {
        if (dbCall.status === 'ringing') {
          if (dbCall.callerId === userId) {
            await this.cancelCall(dbCall.id, userId).catch(() => {});
          } else {
            this.clearRingingTimeout(dbCall.id);
            await CallModel.updateStatus(dbCall.id, 'missed', { endedAt: new Date() });
            const { emitCallMissed } = getSocketEmitters();
            emitCallMissed?.(dbCall.id, dbCall.callerId, dbCall.receiverId, dbCall);
          }
        } else if (dbCall.status === 'accepted') {
          await this.endCall(dbCall.id, userId).catch(() => {});
        }
      }
      return;
    }

    const { callId, callerId, receiverId, status } = session;
    this.clearActiveSession(callId);

    try {
      if (status === 'ringing') {
        if (userId === callerId) {
          // Caller disconnected while ringing -> cancel call
          await CallModel.updateStatus(callId, 'cancelled', { endedAt: new Date() });
          const { emitCallCancelled } = getSocketEmitters();
          emitCallCancelled?.(receiverId, callId);
          logger.info(`[CallService] Call ${callId} auto-cancelled due to caller ${userId} disconnect`);
        } else {
          // Callee disconnected while ringing -> mark missed
          await CallModel.updateStatus(callId, 'missed', { endedAt: new Date() });
          const updated = await CallModel.findById(callId);
          const { emitCallMissed } = getSocketEmitters();
          emitCallMissed?.(callId, callerId, receiverId, updated);
          logger.info(`[CallService] Call ${callId} auto-marked missed due to receiver ${userId} disconnect`);
        }
      } else if (status === 'accepted') {
        // Participant disconnected during active call -> terminate
        await CallModel.updateStatus(callId, 'ended', { endedAt: new Date() });
        const updated = await CallModel.findById(callId);
        const { emitCallEnded } = getSocketEmitters();
        emitCallEnded?.(callId, callerId, receiverId, updated);
        logger.info(`[CallService] Call ${callId} auto-ended due to participant ${userId} disconnect`);
      }
    } catch (err) {
      logger.warn(`[CallService] Error handling disconnect for call ${callId}:`, err);
    }
  }

  /**
   * Handle user leaving the WebRTC call room
   */
  public static async handleUserLeaveRoom(callId: number, userId: number): Promise<void> {
    const session = this.activeSessionsByCallId.get(callId);
    if (session && session.status === 'accepted') {
      logger.info(`[CallService] User ${userId} left call room for call ${callId}. Ending call.`);
      await this.endCall(callId, userId).catch(() => {});
    }
  }

  /**
   * Handle callee signaling they are busy (e.g. from client state)
   */
  public static async handleCalleeBusy(callId: number, calleeId: number): Promise<void> {
    const call = await CallModel.findById(callId);
    if (!call || call.status !== 'ringing') return;

    this.clearActiveSession(callId);
    await CallModel.updateStatus(callId, 'busy', { endedAt: new Date() });
    const updated = await CallModel.findById(callId);

    const { emitCallBusy } = getSocketEmitters();
    emitCallBusy?.(call.callerId, updated);
    logger.info(`[CallService] Call ${callId} marked busy by callee ${calleeId}`);
  }

  /**
   * Startup cleanup to ensure no orphaned calls survive server restarts
   */
  public static async cleanupStaleCallsOnStartup(): Promise<void> {
    try {
      const res = await CallModel.cleanupStaleCallsOnStartup();
      this.activeSessionsByCallId.clear();
      this.userActiveCallMap.clear();
      logger.info(`[CallService] Startup cleanup: cleared ${res.missedCount} ringing calls and ${res.endedCount} accepted calls.`);
    } catch (err) {
      logger.warn('[CallService] Error in startup stale calls cleanup:', err);
    }
  }

  /**
   * Periodic background sweep for abandoned or expired calls (every 30 seconds)
   */
  public static startPeriodicCleanup(): void {
    if (this.periodicCleanupTimer) return;
    this.periodicCleanupTimer = setInterval(async () => {
      try {
        await CallModel.cleanStaleCalls();

        // Prune any in-memory sessions that expired
        const now = Date.now();
        for (const [callId, session] of this.activeSessionsByCallId.entries()) {
          if (session.status === 'ringing' && now - session.startedAt > 35000) {
            this.clearActiveSession(callId);
          } else if (session.status === 'accepted') {
            const callerOnline = SocketUserRegistry.isUserOnline(session.callerId);
            const receiverOnline = SocketUserRegistry.isUserOnline(session.receiverId);
            if (!callerOnline || !receiverOnline) {
              this.clearActiveSession(callId);
            }
          }
        }
      } catch (err) {
        logger.warn('[CallService] Error in periodic cleanup sweep:', err);
      }
    }, 30000); // 30 seconds
  }

  public static stopPeriodicCleanup(): void {
    if (this.periodicCleanupTimer) {
      clearInterval(this.periodicCleanupTimer);
      this.periodicCleanupTimer = null;
    }
  }

  /**
   * Retrieve single call details by ID
   */
  public static async getCallById(callId: number, userId: number): Promise<CallRecord> {
    if (!Number.isInteger(callId) || callId <= 0) {
      throw new AppError('Valid call ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Valid user ID is required', HttpStatus.BAD_REQUEST);
    }

    const call = await CallModel.findById(callId, userId);
    if (!call) {
      throw new AppError('Call record not found', HttpStatus.NOT_FOUND);
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new AppError('You do not have permission to view this call', HttpStatus.FORBIDDEN);
    }

    return call;
  }

  /**
   * Get user call history with pagination
   */
  public static async getUserCallHistory(
    userId: number,
    limit = 30,
    offset = 0
  ): Promise<CallRecord[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return [];
    }
    return CallModel.getCallsForUser(userId, limit, offset);
  }

  /**
   * Get call logs for a specific conversation
   */
  public static async getConversationCallHistory(
    conversationId: number,
    userId: number
  ): Promise<CallRecord[]> {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      throw new AppError('Valid conversation ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Valid user ID is required', HttpStatus.BAD_REQUEST);
    }

    // Verify membership in conversation
    const isMember = await ConversationModel.isMember(conversationId, userId);
    if (!isMember) {
      throw new AppError('You do not have permission to view this conversation history', HttpStatus.FORBIDDEN);
    }

    return CallModel.getCallsForConversation(conversationId, 20, userId);
  }

  /**
   * Helper: Schedule 35s server-side timeout to mark ringing call as missed
   */
  private static scheduleRingingTimeout(callId: number, callerId: number, receiverId: number): void {
    this.clearRingingTimeout(callId);

    const timer = setTimeout(async () => {
      try {
        const call = await CallModel.findById(callId);
        if (call && call.status === 'ringing') {
          // Clear active session
          this.clearActiveSession(callId);

          await CallModel.updateStatus(callId, 'missed', { endedAt: new Date() });
          const updatedCall = await CallModel.findById(callId);

          const { emitCallMissed } = getSocketEmitters();
          if (emitCallMissed) {
            emitCallMissed(callId, callerId, receiverId, updatedCall);
          }

          // Create persistent missed call notification for receiver
          try {
            const callerUser = await UserModel.findById(callerId);
            const callerName = call.caller?.firstName || callerUser?.email?.split('@')[0] || 'A matched connection';
            await NotificationService.createNotification({
              userId: receiverId,
              actorId: callerId,
              type: 'CALL_MISSED',
              title: `Missed ${call.callType === 'video' ? 'Video' : 'Audio'} Call`,
              message: `You missed a ${call.callType} call from ${callerName}.`,
              referenceType: 'call',
              referenceId: callId,
            });
          } catch (notifErr) {
            logger.warn(`[CallService] Failed to create missed call notification for call ${callId}:`, notifErr);
          }

          logger.info(`[CallService] Call ${callId} automatically marked as missed after 35s ringing timeout`);
        }
      } catch (err) {
        logger.error(`[CallService] Error in ringing timeout for call ${callId}:`, err);
      } finally {
        ringingTimers.delete(callId);
      }
    }, 35000); // 35 seconds

    ringingTimers.set(callId, timer);
  }

  /**
   * Helper: Clear ringing timeout
   */
  public static clearRingingTimeout(callId: number): void {
    const timer = ringingTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      ringingTimers.delete(callId);
    }
  }
}

export default CallService;
