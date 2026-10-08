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

export class CallService {
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

    // 5. Check if target user is currently busy on an active call
    const activeTargetCall = await CallModel.findActiveCallForUser(receiverId);
    if (activeTargetCall) {
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

    // 6. Check if caller is already in an active call
    const activeCallerCall = await CallModel.findActiveCallForUser(callerId);
    if (activeCallerCall) {
      // Auto-end prior call if still hanging
      await this.endCall(activeCallerCall.id, callerId);
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

    // 9. Dispatch real-time 'call:incoming' event to receiver via Socket.IO
    const { emitCallIncoming } = getSocketEmitters();
    if (emitCallIncoming) {
      emitCallIncoming(receiverId, callRecord);
    }

    // 10. Start server-side ringing timeout (35 seconds)
    this.scheduleRingingTimeout(callId, callerId, receiverId);

    logger.info(`[CallService] Call ${callId} (${callType}) initiated by user ${callerId} -> user ${receiverId}`);
    return callRecord;
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

    this.clearRingingTimeout(callId);

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

    this.clearRingingTimeout(callId);

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

    this.clearRingingTimeout(callId);

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
