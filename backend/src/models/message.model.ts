import { query, execute } from '../config/database';
import { MessageRow, MessageItem, MessagesPaginationResponse, MessageStatus } from '../types/chat.types';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import ReactionModel from './reaction.model';

export class MessageModel {
  /**
   * Find a single message by ID
   */
  public static async findById(id: number, currentUserId?: number): Promise<MessageItem | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, conversation_id, sender_id, message_type, message_text, media_url, reply_to_message_id, status, created_at, updated_at, deleted_at 
       FROM messages 
       WHERE id = ? AND deleted_at IS NULL 
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;

    const row = rows[0] as MessageRow;
    const reactions = currentUserId !== undefined
      ? await ReactionModel.getMessageReactions(id, currentUserId)
      : [];

    return {
      id: Number(row.id),
      conversationId: Number(row.conversation_id),
      senderId: Number(row.sender_id),
      content: String(row.message_text || ''),
      messageType: row.message_type,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      isFromMe: currentUserId !== undefined ? Number(row.sender_id) === currentUserId : false,
      reactions,
    };
  }

  /**
   * Find raw message row for internal checks
   */
  public static async findRawById(id: number): Promise<{ id: number; conversationId: number; senderId: number; status: MessageStatus } | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, conversation_id, sender_id, status FROM messages WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    return {
      id: Number(rows[0].id),
      conversationId: Number(rows[0].conversation_id),
      senderId: Number(rows[0].sender_id),
      status: rows[0].status as MessageStatus,
    };
  }

  /**
   * Create a message in MySQL, update conversation last_message_at, and sender last_read_message_id
   */
  public static async createMessage(
    conversationId: number,
    senderId: number,
    text: string,
    messageType: string = 'text',
    conn?: PoolConnection
  ): Promise<number> {
    const trimmed = text.trim();
    const insertSql = `
      INSERT INTO messages (conversation_id, sender_id, message_text, message_type, status) 
      VALUES (?, ?, ?, ?, 'sent')
    `;
    const params = [conversationId, senderId, trimmed, messageType];

    let messageId: number;

    if (conn) {
      const [res] = await conn.query<ResultSetHeader>(insertSql, params);
      messageId = res.insertId;

      // Update conversation last_message_at
      await conn.query(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      // Auto mark as read for sender
      await conn.query(
        `INSERT INTO conversation_members (conversation_id, user_id, last_read_message_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), VALUES(last_read_message_id))`,
        [conversationId, senderId, messageId]
      );
    } else {
      const res = await execute(insertSql, params);
      messageId = res.insertId;

      await execute(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      await execute(
        `INSERT INTO conversation_members (conversation_id, user_id, last_read_message_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), VALUES(last_read_message_id))`,
        [conversationId, senderId, messageId]
      );
    }

    return messageId;
  }

  /**
   * Mark messages as delivered
   */
  public static async markMessagesDelivered(messageIds: number[]): Promise<number[]> {
    if (!messageIds || messageIds.length === 0) return [];
    const placeholders = messageIds.map(() => '?').join(',');
    await execute(
      `UPDATE messages SET status = 'delivered' WHERE id IN (${placeholders}) AND status = 'sent'`,
      messageIds
    );
    return messageIds;
  }

  /**
   * Mark incoming messages in a conversation as read by the recipient
   */
  public static async markMessagesRead(
    conversationId: number,
    readerUserId: number
  ): Promise<number[]> {
    // Select all unread incoming messages sent by the other user
    const rows = await query<RowDataPacket[]>(
      `SELECT id FROM messages 
       WHERE conversation_id = ? AND sender_id != ? AND status IN ('sent', 'delivered') AND deleted_at IS NULL`,
      [conversationId, readerUserId]
    );

    const ids = rows.map((r) => Number(r.id));
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await execute(
        `UPDATE messages SET status = 'read' WHERE id IN (${placeholders})`,
        ids
      );
    }
    return ids;
  }

  /**
   * Find paginated messages for a conversation with cursor support and attached reactions
   */
  public static async findByConversation(
    conversationId: number,
    currentUserId: number,
    options: { limit?: number; cursor?: number; before?: number }
  ): Promise<MessagesPaginationResponse> {
    const limit = Math.min(Math.max(options.limit || 30, 1), 100);
    const beforeId = options.before || options.cursor;

    let sql = `
      SELECT id, conversation_id, sender_id, message_type, message_text, media_url, reply_to_message_id, status, created_at, updated_at
      FROM messages
      WHERE conversation_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [conversationId];

    if (beforeId && !isNaN(beforeId) && beforeId > 0) {
      sql += ' AND id < ?';
      params.push(beforeId);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = await query<RowDataPacket[]>(sql, params);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = items.length > 0 ? Number(items[items.length - 1].id) : null;

    // Convert to oldest -> newest chronological order for UI display
    const chronologicalRows = [...items].reverse();
    const messageIds = chronologicalRows.map((r) => Number(r.id));

    // Batch load reactions for all messages in one efficient query
    const reactionsMap = await ReactionModel.getReactionsForMessages(messageIds, currentUserId);

    const messages: MessageItem[] = chronologicalRows.map((r) => {
      const id = Number(r.id);
      return {
        id,
        conversationId: Number(r.conversation_id),
        senderId: Number(r.sender_id),
        content: String(r.message_text || ''),
        messageType: r.message_type,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        isFromMe: Number(r.sender_id) === currentUserId,
        reactions: reactionsMap.get(id) || [],
      };
    });

    return {
      messages,
      hasMore,
      nextCursor: hasMore ? nextCursor : null,
    };
  }
}

export default MessageModel;
