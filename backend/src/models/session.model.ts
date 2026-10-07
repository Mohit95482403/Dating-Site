import { query, execute } from '../config/database';
import { SessionRow } from '../types/user.types';
import { SessionInfo } from '../types/auth';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export class SessionModel {
  /**
   * Create a new user session with hashed refresh token
   */
  public static async createSession(
    userId: number,
    refreshTokenHash: string,
    ipAddress: string | null,
    userAgent: string | null,
    expiresAt: Date,
    conn?: PoolConnection
  ): Promise<number> {
    const formattedExpiresAt = expiresAt.toISOString().slice(0, 19).replace('T', ' ');
    const sql = `
      INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    if (conn) {
      const [res] = await conn.execute(sql, [
        userId,
        refreshTokenHash,
        ipAddress,
        userAgent,
        formattedExpiresAt,
      ]);
      return (res as any).insertId;
    }

    const res = await execute(sql, [
      userId,
      refreshTokenHash,
      ipAddress,
      userAgent,
      formattedExpiresAt,
    ]);
    return res.insertId;
  }

  /**
   * Find an active, non-revoked session by refresh token hash
   */
  public static async findActiveSessionByHash(refreshTokenHash: string): Promise<SessionRow | null> {
    const sql = `
      SELECT id, user_id, refresh_token_hash, ip_address, user_agent, expires_at, created_at, revoked_at
      FROM sessions
      WHERE refresh_token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [refreshTokenHash]);
    return (rows[0] as SessionRow) || null;
  }

  /**
   * Retrieve all active sessions for a user
   */
  public static async findActiveSessionsByUserId(userId: number): Promise<SessionInfo[]> {
    const sql = `
      SELECT id, ip_address, user_agent, created_at, expires_at
      FROM sessions
      WHERE user_id = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId]);
    return rows.map((r) => ({
      id: r.id,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));
  }

  /**
   * Revoke a single session belonging to a specific user
   */
  public static async revokeSession(sessionId: number, userId: number): Promise<boolean> {
    const sql = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE id = ? AND user_id = ? AND revoked_at IS NULL
    `;
    const res = await execute(sql, [sessionId, userId]);
    return res.affectedRows > 0;
  }

  /**
   * Revoke a session directly by its refresh token hash
   */
  public static async revokeSessionByHash(refreshTokenHash: string): Promise<boolean> {
    const sql = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE refresh_token_hash = ? AND revoked_at IS NULL
    `;
    const res = await execute(sql, [refreshTokenHash]);
    return res.affectedRows > 0;
  }

  /**
   * Revoke all active sessions for a user (Logout from all devices)
   */
  public static async revokeAllUserSessions(userId: number): Promise<number> {
    const sql = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE user_id = ? AND revoked_at IS NULL
    `;
    const res = await execute(sql, [userId]);
    return res.affectedRows;
  }

  /**
   * Revoke all other active sessions for a user, keeping current session active
   */
  public static async revokeOtherSessionsExceptHash(
    userId: number,
    currentRefreshTokenHash: string
  ): Promise<number> {
    const sql = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE user_id = ? 
        AND refresh_token_hash != ? 
        AND revoked_at IS NULL
    `;
    const res = await execute(sql, [userId, currentRefreshTokenHash]);
    return res.affectedRows;
  }

  /**
   * Revoke all other active sessions for a user, keeping specified session ID active
   */
  public static async revokeOtherSessionsExceptId(
    userId: number,
    keepSessionId: number
  ): Promise<number> {
    const sql = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE user_id = ? 
        AND id != ? 
        AND revoked_at IS NULL
    `;
    const res = await execute(sql, [userId, keepSessionId]);
    return res.affectedRows;
  }

  /**
   * Rotate a session with a new refresh token hash and expiration
   */
  public static async rotateSessionToken(
    sessionId: number,
    newHash: string,
    newExpiresAt: Date
  ): Promise<void> {
    const formattedExpiresAt = newExpiresAt.toISOString().slice(0, 19).replace('T', ' ');
    const sql = `
      UPDATE sessions
      SET refresh_token_hash = ?, expires_at = ?
      WHERE id = ?
    `;
    await execute(sql, [newHash, formattedExpiresAt, sessionId]);
  }
}

export default SessionModel;
