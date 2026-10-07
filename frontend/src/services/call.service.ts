import { api } from './api';
import type { ApiResponse } from '../types';
import type { CallRecord, InitiateCallPayload } from '../types/call';

export const callService = {
  /**
   * Initiate a new audio or video call
   */
  async initiateCall(payload: InitiateCallPayload): Promise<CallRecord> {
    const res = await api.post<ApiResponse<CallRecord>>('/calls', payload);
    return res.data.data!;
  },

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: number): Promise<CallRecord> {
    const res = await api.post<ApiResponse<CallRecord>>(`/calls/${callId}/accept`);
    return res.data.data!;
  },

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: number): Promise<CallRecord> {
    const res = await api.post<ApiResponse<CallRecord>>(`/calls/${callId}/reject`);
    return res.data.data!;
  },

  /**
   * Cancel an outgoing ringing call
   */
  async cancelCall(callId: number): Promise<CallRecord> {
    const res = await api.post<ApiResponse<CallRecord>>(`/calls/${callId}/cancel`);
    return res.data.data!;
  },

  /**
   * End an active call
   */
  async endCall(callId: number): Promise<CallRecord> {
    const res = await api.post<ApiResponse<CallRecord>>(`/calls/${callId}/end`);
    return res.data.data!;
  },

  /**
   * Get call details by ID
   */
  async getCallById(callId: number): Promise<CallRecord> {
    const res = await api.get<ApiResponse<CallRecord>>(`/calls/${callId}`);
    return res.data.data!;
  },

  /**
   * Get user's call history
   */
  async getUserCallHistory(limit = 30, offset = 0): Promise<CallRecord[]> {
    const res = await api.get<ApiResponse<CallRecord[]>>('/calls', {
      params: { limit, offset },
    });
    return res.data.data || [];
  },

  /**
   * Get call history for a conversation
   */
  async getConversationCallHistory(conversationId: number): Promise<CallRecord[]> {
    const res = await api.get<ApiResponse<CallRecord[]>>(`/calls/conversation/${conversationId}`);
    return res.data.data || [];
  },
};

export default callService;
