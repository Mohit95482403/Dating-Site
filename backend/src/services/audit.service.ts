import { Request } from 'express';
import { AuditModel } from '../models/audit.model';
import { query } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { logger } from '../utils/logger';

export type SecurityAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_REGISTERED'
  | 'PASSWORD_CHANGED'
  | 'TOKEN_REJECTED'
  | 'RATE_LIMIT_TRIGGERED'
  | 'UNAUTHORIZED_ACCESS'
  | 'ADMIN_ACTION'
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'REPORT_RESOLVED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'PAYMENT_WEBHOOK_RECEIVED'
  | 'SUSPICIOUS_ACTIVITY';

export interface AuditLogQueryFilters {
  page?: number;
  limit?: number;
  action?: string;
  userId?: number;
  search?: string;
}

export class AuditService {
  /**
   * Log a security event from an Express Request safely
   */
  public static async logSecurityEvent(
    action: SecurityAction | string,
    req: Request | null,
    userId: number | null = null,
    entityType: string = 'system',
    entityId: number | null = null,
    description: string | null = null
  ): Promise<void> {
    try {
      const ip = req
        ? (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || null
        : null;
      const userAgent = req ? (req.headers['user-agent'] as string) || null : null;
      const actorId = userId || (req && (req as any).user?.id) || null;

      // Sanitize description: ensure passwords or tokens are never leaked
      const sanitizedDesc = description
        ? description.replace(/(password|token|secret|jwt)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
        : null;

      await AuditModel.log(
        actorId,
        action,
        entityType,
        entityId,
        sanitizedDesc,
        ip,
        userAgent
      );
    } catch (err) {
      logger.error('[AuditService] Failed to record security event:', err);
    }
  }

  /**
   * Fetch recent security events with filtering for Admin Dashboard
   */
  public static async getSecurityEvents(filters: AuditLogQueryFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.action && filters.action !== 'all') {
      whereClauses.push('a.action = ?');
      params.push(filters.action);
    }

    if (filters.userId) {
      whereClauses.push('a.user_id = ?');
      params.push(filters.userId);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      whereClauses.push('(a.description LIKE ? OR a.action LIKE ? OR a.ip_address LIKE ? OR u.email LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    const logsSql = `
      SELECT 
        a.id,
        a.user_id,
        u.email as user_email,
        p.first_name as user_name,
        a.action,
        a.entity_type,
        a.entity_id,
        a.description,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN profiles p ON a.user_id = p.user_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query<RowDataPacket[]>(logsSql, [...params, limit, offset]);

    return {
      events: rows.map((r) => ({
        id: Number(r.id),
        userId: r.user_id ? Number(r.user_id) : null,
        userEmail: r.user_email || null,
        userName: r.user_name || null,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id ? Number(r.entity_id) : null,
        description: r.description,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export default AuditService;
