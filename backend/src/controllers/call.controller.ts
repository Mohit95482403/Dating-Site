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
      const callerId = Number(req.user?.userId || req.user?.id);
      const { targetUserId, callType, matchId, conversationId } = req.body;

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
      const receiverId = Number(req.user?.userId || req.user?.id);
      const callId = Number(req.params.callId);

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
      const receiverId = Number(req.user?.userId || req.user?.id);
      const callId = Number(req.params.callId);

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
      const callerId = Number(req.user?.userId || req.user?.id);
      const callId = Number(req.params.callId);

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
      const userId = Number(req.user?.userId || req.user?.id);
      const callId = Number(req.params.callId);

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
      const userId = Number(req.user?.userId || req.user?.id);
      const callId = Number(req.params.callId);

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
      const userId = Number(req.user?.userId || req.user?.id);
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
      const userId = Number(req.user?.userId || req.user?.id);
      const conversationId = Number(req.params.conversationId);

      const history = await CallService.getConversationCallHistory(conversationId, userId);
      ApiResponse.success(res, 'Conversation call history retrieved', history, HttpStatus.OK);
    } catch (err: any) {
      const status = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      ApiResponse.error(res, err.message || 'Failed to retrieve conversation call history', [], status);
    }
  };
}

export default CallController;
