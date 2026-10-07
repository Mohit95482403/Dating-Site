import { query, execute, pool } from '../config/database';
import { ConversationRow, ConversationItem } from '../types/chat.types';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { SocketUserRegistry } from '../sockets/socketEvents';

export class ConversationModel {
  /**
   * Get or create a conversation for a match idempotently
   */
  public static async getOrCreateForMatch(
    matchId: number,
    userA: number,
    userB: number,
    conn?: PoolConnection
  ): Promise<ConversationRow> {
    const findSql = `
      SELECT id, match_id, created_at, updated_at, last_message_at 
      FROM conversations 
      WHERE match_id = ? 
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(findSql, [matchId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(findSql, [matchId]);

    if (rows.length > 0) {
      const conv = rows[0] as ConversationRow;
      // Ensure members exist
      const memberSql = `
        INSERT IGNORE INTO conversation_members (conversation_id, user_id) 
        VALUES (?, ?), (?, ?)
      `;
      if (conn) {
        await conn.query(memberSql, [conv.id, userA, conv.id, userB]);
      } else {
        await execute(memberSql, [conv.id, userA, conv.id, userB]);
      }
      return conv;
    }

    // Insert conversation
    const insertConvSql = `
      INSERT INTO conversations (match_id) 
      VALUES (?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;
    let convId: number;

    if (conn) {
      const [res] = await conn.query<ResultSetHeader>(insertConvSql, [matchId]);
      convId = res.insertId;
      if (!convId) {
        // Handled race condition
        const [existing] = await conn.query<RowDataPacket[]>(findSql, [matchId]);
        convId = (existing[0] as ConversationRow).id;
      }
      await conn.query(
        'INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)',
        [convId, userA, convId, userB]
      );
    } else {
      const res = await execute(insertConvSql, [matchId]);
      convId = res.insertId;
      if (!convId) {
        const existing = await query<RowDataPacket[]>(findSql, [matchId]);
        convId = (existing[0] as ConversationRow).id;
      }
      await execute(
        'INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)',
        [convId, userA, convId, userB]
      );
    }

    const createdRows = conn
      ? ((await conn.query<RowDataPacket[]>(findSql, [matchId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(findSql, [matchId]);

    return createdRows[0] as ConversationRow;
  }

  /**
   * Verify if authenticated user has access to this conversation and check match status
   */
  public static async verifyUserAccess(
    conversationId: number,
    userId: number
  ): Promise<{
    allowed: boolean;
    reason?: 'unauthorized' | 'unmatched';
    partnerUserId?: number;
    matchId?: number;
    conversationId?: number;
  }> {
    const sql = `
      SELECT 
        c.id, 
        c.match_id, 
        m.status AS match_status, 
        m.user_one_id, 
        m.user_two_id,
        IF(m.user_one_id = ?, m.user_two_id, m.user_one_id) AS partner_user_id
      FROM conversations c
      INNER JOIN matches m ON m.id = c.match_id
      WHERE c.id = ? AND (m.user_one_id = ? OR m.user_two_id = ?)
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, conversationId, userId, userId]);
    if (!rows[0]) {
      return { allowed: false, reason: 'unauthorized' };
    }

    const row = rows[0];
    const partnerUserId = Number(row.partner_user_id);
    const matchId = Number(row.match_id);

    if (row.match_status !== 'active') {
      return { allowed: false, reason: 'unmatched', partnerUserId, matchId, conversationId };
    }

    return { allowed: true, partnerUserId, matchId, conversationId };
  }

  /**
   * Check if user is an authorized member of this conversation
   */
  public static async isMember(conversationId: number, userId: number): Promise<boolean> {
    const access = await this.verifyUserAccess(conversationId, userId);
    return access.allowed;
  }

  /**
   * Find all conversations for a user with partner profile, last message preview, and unread counts
   */
  public static async findUserConversations(userId: number): Promise<ConversationItem[]> {
    const sql = `
      SELECT 
        c.id AS conversation_id,
        c.match_id,
        c.created_at AS conv_created_at,
        c.updated_at AS conv_updated_at,
        c.last_message_at,
        u.id AS partner_id,
        u.last_seen_at AS partner_last_seen_at,
        p.first_name,
        p.last_name,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS partner_age,
        ph.id AS primary_photo_id,
        ph.file_url AS primary_photo_url,
        lm.id AS last_msg_id,
        lm.sender_id AS last_msg_sender_id,
        lm.message_text AS last_msg_text,
        lm.message_type AS last_msg_type,
        lm.created_at AS last_msg_created_at,
        (
          SELECT COUNT(*) 
          FROM messages msg
          LEFT JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
          WHERE msg.conversation_id = c.id 
            AND msg.sender_id != ? 
            AND msg.deleted_at IS NULL 
            AND (cm.last_read_message_id IS NULL OR msg.id > cm.last_read_message_id)
        ) AS unread_count
      FROM conversations c
      INNER JOIN matches m ON m.id = c.match_id
      INNER JOIN users u ON u.id = IF(m.user_one_id = ?, m.user_two_id, m.user_one_id)
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN photos ph ON ph.id = (
        SELECT id FROM photos 
        WHERE user_id = u.id 
        ORDER BY is_primary DESC, display_order ASC, id ASC 
        LIMIT 1
      )
      LEFT JOIN messages lm ON lm.id = (
        SELECT id FROM messages 
        WHERE conversation_id = c.id AND deleted_at IS NULL 
        ORDER BY id DESC LIMIT 1
      )
      WHERE (m.user_one_id = ? OR m.user_two_id = ?)
        AND m.status = 'active'
        AND u.status = 'active'
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `;

    const rows = await query<RowDataPacket[]>(sql, [userId, userId, userId, userId, userId]);

    return rows.map((row) => {
      const partnerId = Number(row.partner_id);
      const isOnline = SocketUserRegistry.isUserOnline(partnerId);

      const hasLastMsg = row.last_msg_id !== null && row.last_msg_id !== undefined;

      return {
        id: Number(row.conversation_id),
        conversationId: Number(row.conversation_id),
        matchId: Number(row.match_id),
        otherUser: {
          id: partnerId,
          firstName: String(row.first_name || 'Member'),
          lastName: row.last_name ? String(row.last_name) : null,
          age: row.partner_age !== null && row.partner_age !== undefined ? Number(row.partner_age) : null,
          primaryPhoto: row.primary_photo_id
            ? {
                id: Number(row.primary_photo_id),
                fileUrl: String(row.primary_photo_url),
              }
            : null,
          isOnline,
          lastSeenAt: row.partner_last_seen_at ? new Date(row.partner_last_seen_at).toISOString() : null,
        },
        lastMessage: hasLastMsg
          ? {
              id: Number(row.last_msg_id),
              senderId: Number(row.last_msg_sender_id),
              content: String(row.last_msg_text || ''),
              messageType: (row.last_msg_type as any) || 'text',
              createdAt: new Date(row.last_msg_created_at).toISOString(),
              isFromMe: Number(row.last_msg_sender_id) === userId,
            }
          : null,
        lastMessageTime: row.last_msg_created_at
          ? new Date(row.last_msg_created_at).toISOString()
          : row.last_message_at
          ? new Date(row.last_message_at).toISOString()
          : null,
        unreadCount: Number(row.unread_count || 0),
        createdAt: new Date(row.conv_created_at).toISOString(),
        updatedAt: new Date(row.conv_updated_at).toISOString(),
      };
    });
  }

  /**
   * Find details of a single conversation
   */
  public static async findConversationById(
    conversationId: number,
    userId: number
  ): Promise<ConversationItem | null> {
    const list = await this.findUserConversations(userId);
    return list.find((c) => c.conversationId === conversationId) || null;
  }

  /**
   * Mark conversation as read for the user
   */
  public static async markAsRead(conversationId: number, userId: number): Promise<boolean> {
    const maxMsgSql = `
      SELECT MAX(id) AS max_id 
      FROM messages 
      WHERE conversation_id = ? AND deleted_at IS NULL
    `;
    const rows = await query<RowDataPacket[]>(maxMsgSql, [conversationId]);
    const maxId = rows[0]?.max_id ? Number(rows[0].max_id) : null;

    if (maxId) {
      const updateSql = `
        INSERT INTO conversation_members (conversation_id, user_id, last_read_message_id) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), VALUES(last_read_message_id))
      `;
      await execute(updateSql, [conversationId, userId, maxId]);

      // Also update messages status to 'read'
      const { MessageModel } = await import('./message.model');
      await MessageModel.markMessagesRead(conversationId, userId);

      return true;
    }
    return false;
  }

  /**
   * Calculate total unread messages count for a user across all active conversations
   */
  public static async getTotalUnreadCount(userId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total_unread
      FROM messages msg
      INNER JOIN conversations c ON c.id = msg.conversation_id
      INNER JOIN matches m ON m.id = c.match_id
      LEFT JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
      WHERE (m.user_one_id = ? OR m.user_two_id = ?)
        AND m.status = 'active'
        AND msg.sender_id != ?
        AND msg.deleted_at IS NULL
        AND (cm.last_read_message_id IS NULL OR msg.id > cm.last_read_message_id)
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId, userId, userId, userId]);
    return Number(rows[0]?.total_unread || 0);
  }
}

export default ConversationModel;
