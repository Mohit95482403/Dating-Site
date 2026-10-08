import { Request, Response } from 'express';
import { CallService } from '../services/call.service';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AuthenticatedRequest } from '../types';

export class CallController {
  /**
   * POST /api/calls
   * Initiate a new audio/video call
   */
  public static initiateCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawCallerId = req.user?.id ?? req.user?.userId;
      const callerId = Number(rawCallerId);
      if (!Number.isInteger(callerId) || callerId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const rawTargetId =
        req.body?.targetUserId ??
        req.body?.receiverId ??
        req.body?.recipientId ??
        req.body?.userId;
      const targetUserId = Number(rawTargetId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        ApiResponse.error(res, 'Valid recipient user ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const callType = req.body?.callType;
      if (callType !== 'audio' && callType !== 'video') {
        ApiResponse.error(res, "callType must be either 'audio' or 'video'", [], HttpStatus.BAD_REQUEST);
        return;
      }

      const rawMatchId = req.body?.matchId;
      const parsedMatchId = rawMatchId != null ? Number(rawMatchId) : undefined;
      const matchId = parsedMatchId && Number.isInteger(parsedMatchId) && parsedMatchId > 0 ? parsedMatchId : undefined;

      const rawConvId = req.body?.conversationId;
      const parsedConvId = rawConvId != null ? Number(rawConvId) : undefined;
      const conversationId = parsedConvId && Number.isInteger(parsedConvId) && parsedConvId > 0 ? parsedConvId : undefined;

      const call = await CallService.initiateCall(callerId, {
        targetUserId,
        callType,
        matchId,
        conversationId,
      });

      ApiResponse.success(res, 'Call initiated successfully', call, HttpStatus.CREATED);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to initiate call', [], status);
    }
  };

  /**
   * POST /api/calls/:callId/accept
   * Accept an incoming call
   */
  public static acceptCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const receiverId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(receiverId) || receiverId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const callId = Number(req.params.callId);
      if (!Number.isInteger(callId) || callId <= 0) {
        ApiResponse.error(res, 'Valid call ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const call = await CallService.acceptCall(callId, receiverId);
      ApiResponse.success(res, 'Call accepted successfully', call, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to accept call', [], status);
    }
  };

  /**
   * POST /api/calls/:callId/reject
   * Reject an incoming call
   */
  public static rejectCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const receiverId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(receiverId) || receiverId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const callId = Number(req.params.callId);
      if (!Number.isInteger(callId) || callId <= 0) {
        ApiResponse.error(res, 'Valid call ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const call = await CallService.rejectCall(callId, receiverId);
      ApiResponse.success(res, 'Call rejected', call, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to reject call', [], status);
    }
  };

  /**
   * POST /api/calls/:callId/cancel
   * Cancel an outgoing ringing call
   */
  public static cancelCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const callerId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(callerId) || callerId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const callId = Number(req.params.callId);
      if (!Number.isInteger(callId) || callId <= 0) {
        ApiResponse.error(res, 'Valid call ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const call = await CallService.cancelCall(callId, callerId);
      ApiResponse.success(res, 'Call cancelled', call, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to cancel call', [], status);
    }
  };

  /**
   * POST /api/calls/:callId/end
   * End an active call
   */
  public static endCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const callId = Number(req.params.callId);
      if (!Number.isInteger(callId) || callId <= 0) {
        ApiResponse.error(res, 'Valid call ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const call = await CallService.endCall(callId, userId);
      ApiResponse.success(res, 'Call ended', call, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to end call', [], status);
    }
  };

  /**
   * GET /api/calls/:callId
   * Retrieve call details
   */
  public static getCallById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const callId = Number(req.params.callId);
      if (!Number.isInteger(callId) || callId <= 0) {
        ApiResponse.error(res, 'Valid call ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const call = await CallService.getCallById(callId, userId);
      ApiResponse.success(res, 'Call details retrieved', call, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve call details', [], status);
    }
  };

  /**
   * GET /api/calls
   * Retrieve user's call history
   */
  public static getUserCallHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const history = await CallService.getUserCallHistory(userId, limit, offset);
      ApiResponse.success(res, 'Call history retrieved', history, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve call history', [], status);
    }
  };

  /**
   * GET /api/calls/conversation/:conversationId
   * Retrieve call history within a conversation
   */
  public static getConversationCallHistory = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = Number(req.user?.id ?? req.user?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        ApiResponse.error(res, 'Authentication required with valid user ID', [], HttpStatus.UNAUTHORIZED);
        return;
      }

      const conversationId = Number(req.params.conversationId);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        ApiResponse.error(res, 'Valid conversation ID is required', [], HttpStatus.BAD_REQUEST);
        return;
      }

      const history = await CallService.getConversationCallHistory(conversationId, userId);
      ApiResponse.success(res, 'Conversation call history retrieved', history, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve conversation call history', [], status);
    }
  };
}

export default CallController;
