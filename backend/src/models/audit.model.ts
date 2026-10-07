import { execute } from '../config/database';
import { PoolConnection } from 'mysql2/promise';
import { logger } from '../utils/logger';

export class AuditModel {
  /**
   * Record a security or administrative action in audit_logs
   */
  public static async log(
    userId: number | null,
    action: string,
    entityType: string,
    entityId: number | null = null,
    description: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    conn?: PoolConnection
  ): Promise<void> {
    try {
      const sql = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      if (conn) {
        await conn.execute(sql, [
          userId,
          action,
          entityType,
          entityId,
          description,
          ipAddress,
          userAgent,
        ]);
      } else {
        await execute(sql, [
          userId,
          action,
          entityType,
          entityId,
          description,
          ipAddress,
          userAgent,
        ]);
      }
    } catch (error) {
      logger.error('[AuditModel] Failed to write audit log:', error);
    }
  }
}

export default AuditModel;
