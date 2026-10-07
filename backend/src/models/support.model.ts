import { query, execute, pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface SupportTicketItem {
  id: number;
  ticketNumber: string;
  userId: number;
  userEmail?: string;
  userName?: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  assignedTo: number | null;
  assignedToName?: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface SupportMessageItem {
  id: number;
  ticketId: number;
  senderId: number;
  senderRole: 'user' | 'admin' | 'moderator';
  senderName?: string;
  senderAvatar?: string | null;
  isInternalNote: boolean;
  message: string;
  attachments?: any;
  createdAt: string;
}

export class SupportModel {
  /**
   * Create a new support ticket and its initial message inside a transaction
   */
  public static async createTicket(params: {
    userId: number;
    subject: string;
    category: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    message: string;
  }): Promise<{ ticketId: number; ticketNumber: string }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Generate human-friendly ticket number: TKT-YYYYMMDD-XXXX
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const ticketNumber = `TKT-${datePart}-${randomSuffix}`;

      const [ticketResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO support_tickets (ticket_number, user_id, subject, category, priority, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [ticketNumber, params.userId, params.subject.trim(), params.category, params.priority || 'medium']
      );

      const ticketId = ticketResult.insertId;

      // Insert initial opening message
      await conn.execute(
        `INSERT INTO support_messages (ticket_id, sender_id, sender_role, is_internal_note, message)
         VALUES (?, ?, 'user', FALSE, ?)`,
        [ticketId, params.userId, params.message.trim()]
      );

      await conn.commit();
      return { ticketId, ticketNumber };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Fetch tickets created by a specific regular user
   */
  public static async getUserTickets(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM support_tickets WHERE user_id = ?',
      [userId]
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT 
        st.id, st.ticket_number, st.user_id, st.subject, st.category, st.priority, st.status,
        st.resolution_notes, st.created_at, st.updated_at,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id AND is_internal_note = FALSE) as message_count
       FROM support_tickets st
       WHERE st.user_id = ?
       ORDER BY st.updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      tickets: rows.map(this.mapTicket),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetch a single ticket by ID
   */
  public static async getTicketById(ticketId: number): Promise<SupportTicketItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT 
        st.id, st.ticket_number, st.user_id, st.subject, st.category, st.priority, st.status,
        st.assigned_to, st.resolution_notes, st.created_at, st.updated_at,
        u.email as user_email, p.first_name as user_name,
        ap.first_name as assigned_to_name
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.id
       LEFT JOIN profiles p ON st.user_id = p.user_id
       LEFT JOIN profiles ap ON st.assigned_to = ap.user_id
       WHERE st.id = ?
       LIMIT 1`,
      [ticketId]
    );

    if (!rows[0]) return null;
    return this.mapTicket(rows[0]);
  }

  /**
   * Fetch messages for a ticket (optionally including internal moderator notes)
   */
  public static async getTicketMessages(ticketId: number, includeInternalNotes = false): Promise<SupportMessageItem[]> {
    let sql = `
      SELECT 
        sm.id, sm.ticket_id, sm.sender_id, sm.sender_role, sm.is_internal_note, sm.message, sm.attachments, sm.created_at,
        p.first_name as sender_name,
        (SELECT file_url FROM photos WHERE user_id = sm.sender_id AND is_primary = TRUE LIMIT 1) as sender_avatar
      FROM support_messages sm
      LEFT JOIN profiles p ON sm.sender_id = p.user_id
      WHERE sm.ticket_id = ?
    `;

    if (!includeInternalNotes) {
      sql += ' AND sm.is_internal_note = FALSE';
    }

    sql += ' ORDER BY sm.created_at ASC';

    const rows = await query<RowDataPacket[]>(sql, [ticketId]);

    return rows.map((r) => ({
      id: Number(r.id),
      ticketId: Number(r.ticket_id),
      senderId: Number(r.sender_id),
      senderRole: r.sender_role,
      senderName: r.sender_name || (r.sender_role === 'admin' ? 'Support Representative' : 'User'),
      senderAvatar: r.sender_avatar || null,
      isInternalNote: Boolean(r.is_internal_note),
      message: r.message,
      attachments: r.attachments,
      createdAt: r.created_at,
    }));
  }

  /**
   * Add a reply or internal note to a ticket
   */
  public static async addMessage(params: {
    ticketId: number;
    senderId: number;
    senderRole: 'user' | 'admin' | 'moderator';
    message: string;
    isInternalNote?: boolean;
    attachments?: any;
  }): Promise<number> {
    const isInternal = Boolean(params.isInternalNote);
    const result = await execute(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, is_internal_note, message, attachments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.ticketId,
        params.senderId,
        params.senderRole,
        isInternal,
        params.message.trim(),
        params.attachments ? JSON.stringify(params.attachments) : null,
      ]
    );

    // Update ticket updated_at and status if user or staff replied
    if (!isInternal) {
      const newStatus = params.senderRole === 'user' ? 'waiting_for_user' : 'in_progress';
      await execute(
        'UPDATE support_tickets SET updated_at = NOW(), status = CASE WHEN status = "open" THEN ? ELSE status END WHERE id = ?',
        [newStatus, params.ticketId]
      );
    } else {
      await execute('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [params.ticketId]);
    }

    return result.insertId;
  }

  /**
   * Admin: List all tickets with filtering, search and pagination
   */
  public static async getAdminTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: number;
    search?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (params.status && params.status !== 'all') {
      whereClauses.push('st.status = ?');
      queryParams.push(params.status);
    }

    if (params.priority && params.priority !== 'all') {
      whereClauses.push('st.priority = ?');
      queryParams.push(params.priority);
    }

    if (params.category && params.category !== 'all') {
      whereClauses.push('st.category = ?');
      queryParams.push(params.category);
    }

    if (params.assignedTo) {
      whereClauses.push('st.assigned_to = ?');
      queryParams.push(params.assignedTo);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      whereClauses.push('(st.ticket_number LIKE ? OR st.subject LIKE ? OR u.email LIKE ? OR p.first_name LIKE ?)');
      queryParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN profiles p ON st.user_id = p.user_id
      ${whereSql}
    `;
    const countRows = await query<RowDataPacket[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    const ticketsSql = `
      SELECT 
        st.id, st.ticket_number, st.user_id, st.subject, st.category, st.priority, st.status,
        st.assigned_to, st.resolution_notes, st.created_at, st.updated_at,
        u.email as user_email, p.first_name as user_name,
        ap.first_name as assigned_to_name,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id) as message_count
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN profiles p ON st.user_id = p.user_id
      LEFT JOIN profiles ap ON st.assigned_to = ap.user_id
      ${whereSql}
      ORDER BY 
        CASE st.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END ASC,
        st.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query<RowDataPacket[]>(ticketsSql, [...queryParams, limit, offset]);

    return {
      tickets: rows.map(this.mapTicket),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update ticket status & resolution notes
   */
  public static async updateStatus(ticketId: number, status: string, resolutionNotes?: string) {
    await execute(
      'UPDATE support_tickets SET status = ?, resolution_notes = COALESCE(?, resolution_notes), updated_at = NOW() WHERE id = ?',
      [status, resolutionNotes || null, ticketId]
    );
  }

  /**
   * Assign ticket to an admin/moderator
   */
  public static async assignTicket(ticketId: number, assignedToId: number | null) {
    await execute(
      'UPDATE support_tickets SET assigned_to = ?, updated_at = NOW() WHERE id = ?',
      [assignedToId, ticketId]
    );
  }

  /**
   * Aggregate statistics for dashboard & support overview
   */
  public static async getSupportStats() {
    const [counts] = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'waiting_for_user' THEN 1 END) as waiting_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN priority = 'urgent' AND status NOT IN ('resolved', 'closed') THEN 1 END) as urgent_open_tickets,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets
      FROM support_tickets
    `);

    return {
      totalTickets: Number(counts?.total_tickets || 0),
      openTickets: Number(counts?.open_tickets || 0),
      inProgressTickets: Number(counts?.in_progress_tickets || 0),
      waitingTickets: Number(counts?.waiting_tickets || 0),
      resolvedTickets: Number(counts?.resolved_tickets || 0),
      closedTickets: Number(counts?.closed_tickets || 0),
      urgentTickets: Number(counts?.urgent_open_tickets || counts?.urgent_tickets || 0),
      urgentOpenTickets: Number(counts?.urgent_open_tickets || 0),
      avgResolutionHours: 0,
    };
  }

  private static mapTicket(r: RowDataPacket): SupportTicketItem {
    return {
      id: Number(r.id),
      ticketNumber: r.ticket_number,
      userId: Number(r.user_id),
      userEmail: r.user_email || undefined,
      userName: r.user_name || undefined,
      subject: r.subject,
      category: r.category,
      priority: r.priority,
      status: r.status,
      assignedTo: r.assigned_to ? Number(r.assigned_to) : null,
      assignedToName: r.assigned_to_name || null,
      resolutionNotes: r.resolution_notes || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      messageCount: r.message_count ? Number(r.message_count) : 0,
    };
  }
}

export default SupportModel;
