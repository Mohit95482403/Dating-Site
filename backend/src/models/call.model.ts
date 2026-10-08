import { pool, query, execute } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CallRecord, CallStatus, CallType, CallParticipant } from '../types/call.types';

export class CallModel {
  /**
   * Helper to map row data to rich CallRecord structure
   */
  private static mapRow(row: RowDataPacket, currentUserId?: number): CallRecord {
    const caller: CallParticipant = {
      id: Number(row.caller_id),
      firstName: String(row.caller_first_name || 'Member'),
      lastName: row.caller_last_name ? String(row.caller_last_name) : null,
      username: row.caller_username ? String(row.caller_username) : null,
      avatarUrl: row.caller_avatar_url ? String(row.caller_avatar_url) : null,
      age: row.caller_dob ? CallModel.calculateAge(new Date(row.caller_dob)) : null,
      isVerified: Boolean(row.caller_is_verified),
    };

    const receiver: CallParticipant = {
      id: Number(row.receiver_id),
      firstName: String(row.receiver_first_name || 'Member'),
      lastName: row.receiver_last_name ? String(row.receiver_last_name) : null,
      username: row.receiver_username ? String(row.receiver_username) : null,
      avatarUrl: row.receiver_avatar_url ? String(row.receiver_avatar_url) : null,
      age: row.receiver_dob ? CallModel.calculateAge(new Date(row.receiver_dob)) : null,
      isVerified: Boolean(row.receiver_is_verified),
    };

    const isInitiator = currentUserId ? Number(row.caller_id) === currentUserId : undefined;
    const otherUser = currentUserId ? (isInitiator ? receiver : caller) : undefined;

    return {
      id: Number(row.id),
      matchId: Number(row.match_id),
      conversationId: row.conversation_id ? Number(row.conversation_id) : null,
      callerId: Number(row.caller_id),
      receiverId: Number(row.receiver_id),
      callType: row.call_type as CallType,
      status: row.status as CallStatus,
      startedAt: new Date(row.started_at).toISOString(),
      answeredAt: row.answered_at ? new Date(row.answered_at).toISOString() : null,
      endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
      duration: Number(row.duration || 0),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      caller,
      receiver,
      otherUser,
      isInitiator,
    };
  }

  private static calculateAge(dob: Date): number {
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }

  private static baseSelectSql(): string {
    return `
      SELECT 
        c.id, c.match_id, c.conversation_id, c.caller_id, c.receiver_id,
        c.call_type, c.status, c.started_at, c.answered_at, c.ended_at,
        c.duration, c.created_at, c.updated_at,
        u1.username AS caller_username,
        p1.first_name AS caller_first_name,
        p1.last_name AS caller_last_name,
        p1.date_of_birth AS caller_dob,
        p1.is_verified AS caller_is_verified,
        ph1.file_url AS caller_avatar_url,
        u2.username AS receiver_username,
        p2.first_name AS receiver_first_name,
        p2.last_name AS receiver_last_name,
        p2.date_of_birth AS receiver_dob,
        p2.is_verified AS receiver_is_verified,
        ph2.file_url AS receiver_avatar_url
      FROM calls c
      JOIN users u1 ON c.caller_id = u1.id
      LEFT JOIN profiles p1 ON c.caller_id = p1.user_id
      LEFT JOIN photos ph1 ON c.caller_id = ph1.user_id AND ph1.is_primary = 1
      JOIN users u2 ON c.receiver_id = u2.id
      LEFT JOIN profiles p2 ON c.receiver_id = p2.user_id
      LEFT JOIN photos ph2 ON c.receiver_id = ph2.user_id AND ph2.is_primary = 1
    `;
  }

  /**
   * Create a new call record with status 'ringing'
   */
  public static async createCall(params: {
    matchId: number;
    conversationId?: number | null;
    callerId: number;
    receiverId: number;
    callType: CallType;
  }): Promise<number> {
    const { matchId, conversationId = null, callerId, receiverId, callType } = params;

    if (!Number.isInteger(matchId) || !Number.isInteger(callerId) || !Number.isInteger(receiverId) || matchId <= 0 || callerId <= 0 || receiverId <= 0) {
      throw new Error('Valid integer matchId, callerId, and receiverId required');
    }

    const res = await execute(
      `INSERT INTO calls (match_id, conversation_id, caller_id, receiver_id, call_type, status, started_at)
       VALUES (?, ?, ?, ?, ?, 'ringing', CURRENT_TIMESTAMP)`,
      [matchId, conversationId && Number.isInteger(conversationId) && conversationId > 0 ? conversationId : null, callerId, receiverId, callType]
    );

    return res.insertId;
  }

  /**
   * Find call by primary ID
   */
  public static async findById(callId: number, currentUserId?: number): Promise<CallRecord | null> {
    if (!Number.isInteger(callId) || callId <= 0) {
      return null;
    }
    const sql = `${this.baseSelectSql()} WHERE c.id = ? LIMIT 1`;
    const rows = await query<RowDataPacket[]>(sql, [callId]);
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0], currentUserId);
  }

  /**
   * Find any currently active call ('ringing' or 'accepted') involving a user
   */
  public static async findActiveCallForUser(userId: number): Promise<CallRecord | null> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const sql = `
      ${this.baseSelectSql()} 
      WHERE (c.caller_id = ? OR c.receiver_id = ?) 
        AND c.status IN ('ringing', 'accepted')
      ORDER BY c.id DESC
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, userId]);
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0], userId);
  }

  /**
   * Update call status and timestamps safely
   */
  public static async updateStatus(
    callId: number,
    status: CallStatus,
    extra?: { answeredAt?: Date; endedAt?: Date; duration?: number }
  ): Promise<boolean> {
    if (!Number.isInteger(callId) || callId <= 0) {
      return false;
    }

    if (status === 'accepted' && extra?.answeredAt === undefined) {
      const sql = `UPDATE calls SET status = 'accepted', answered_at = CURRENT_TIMESTAMP() WHERE id = ?`;
      const res = await execute(sql, [callId]);
      return res.affectedRows > 0;
    }

    if (status === 'ended' && extra?.duration === undefined) {
      const sql = `
        UPDATE calls 
        SET status = 'ended', 
            ended_at = CURRENT_TIMESTAMP(), 
            duration = IF(answered_at IS NOT NULL, GREATEST(0, TIMESTAMPDIFF(SECOND, answered_at, CURRENT_TIMESTAMP())), 0)
        WHERE id = ?
      `;
      const res = await execute(sql, [callId]);
      return res.affectedRows > 0;
    }

    const fields: string[] = ['status = ?'];
    const params: any[] = [status];

    if (extra?.answeredAt) {
      fields.push('answered_at = ?');
      params.push(extra.answeredAt);
    }
    if (extra?.endedAt) {
      fields.push('ended_at = ?');
      params.push(extra.endedAt);
    }
    if (extra?.duration !== undefined) {
      fields.push('duration = ?');
      params.push(extra.duration);
    }

    params.push(callId);
    const sql = `UPDATE calls SET ${fields.join(', ')} WHERE id = ?`;
    const res = await execute(sql, params);
    return res.affectedRows > 0;
  }

  /**
   * Get user call history with pagination
   */
  public static async getCallsForUser(
    userId: number,
    limit = 30,
    offset = 0
  ): Promise<CallRecord[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return [];
    }
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const sql = `
      ${this.baseSelectSql()}
      WHERE c.caller_id = ? OR c.receiver_id = ?
      ORDER BY c.started_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, userId, safeLimit, safeOffset]);
    return rows.map((r) => this.mapRow(r, userId));
  }

  /**
   * Get call history for a conversation
   */
  public static async getCallsForConversation(
    conversationId: number,
    limit = 20,
    currentUserId?: number
  ): Promise<CallRecord[]> {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return [];
    }
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const sql = `
      ${this.baseSelectSql()}
      WHERE c.conversation_id = ?
      ORDER BY c.started_at DESC
      LIMIT ?
    `;
    const rows = await query<RowDataPacket[]>(sql, [conversationId, safeLimit]);
    return rows.map((r) => this.mapRow(r, currentUserId));
  }

  /**
   * Mark all calls that have been ringing longer than seconds as 'missed'
   */
  public static async markExpiredRingingCalls(timeoutSeconds = 35): Promise<CallRecord[]> {
    const findSql = `
      ${this.baseSelectSql()}
      WHERE c.status = 'ringing'
        AND c.started_at < NOW() - INTERVAL ? SECOND
    `;
    const rows = await query<RowDataPacket[]>(findSql, [timeoutSeconds]);
    if (!rows || rows.length === 0) return [];

    const expiredCalls = rows.map((r) => this.mapRow(r));
    const ids = expiredCalls.map((c) => c.id);

    await query(
      `UPDATE calls SET status = 'missed', ended_at = CURRENT_TIMESTAMP WHERE id IN (?)`,
      [ids]
    );

    return expiredCalls;
  }
}

export default CallModel;
