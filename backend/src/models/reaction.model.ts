import { query, execute } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ReactionGroup } from '../types/chat.types';

export const ALLOWED_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥'] as const;
export type AllowedReaction = typeof ALLOWED_REACTIONS[number];

export class ReactionModel {
  /**
   * Validate if a string is one of the allowed emojis
   */
  public static isValidReaction(reaction: string): reaction is AllowedReaction {
    return ALLOWED_REACTIONS.includes(reaction as AllowedReaction);
  }

  /**
   * Toggle reaction:
   * - If same reaction exists -> remove it
   * - If different reaction exists -> replace it
   * - If no reaction exists -> add it
   */
  public static async toggleReaction(
    messageId: number,
    userId: number,
    reaction: string
  ): Promise<{ action: 'added' | 'removed' | 'updated'; currentReaction: string | null }> {
    const existingRows = await query<RowDataPacket[]>(
      'SELECT id, reaction FROM message_reactions WHERE message_id = ? AND user_id = ? LIMIT 1',
      [messageId, userId]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.reaction === reaction) {
        // Toggle off / remove
        await execute('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
        return { action: 'removed', currentReaction: null };
      } else {
        // Replace with new reaction
        await execute(
          'UPDATE message_reactions SET reaction = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [reaction, existing.id]
        );
        return { action: 'updated', currentReaction: reaction };
      }
    } else {
      // Add new reaction
      await execute(
        'INSERT INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)',
        [messageId, userId, reaction]
      );
      return { action: 'added', currentReaction: reaction };
    }
  }

  /**
   * Remove a reaction explicitly
   */
  public static async removeReaction(messageId: number, userId: number): Promise<boolean> {
    const res = await execute(
      'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );
    return res.affectedRows > 0;
  }

  /**
   * Fetch grouped reactions for a single message
   */
  public static async getMessageReactions(
    messageId: number,
    currentUserId: number
  ): Promise<ReactionGroup[]> {
    const map = await this.getReactionsForMessages([messageId], currentUserId);
    return map.get(messageId) || [];
  }

  /**
   * Batch fetch reactions for multiple messages (prevents N+1 queries)
   */
  public static async getReactionsForMessages(
    messageIds: number[],
    currentUserId: number
  ): Promise<Map<number, ReactionGroup[]>> {
    const resultMap = new Map<number, ReactionGroup[]>();
    if (!messageIds || messageIds.length === 0) return resultMap;

    const placeholders = messageIds.map(() => '?').join(',');
    const sql = `
      SELECT mr.message_id, mr.reaction, mr.user_id, p.first_name
      FROM message_reactions mr
      LEFT JOIN profiles p ON p.user_id = mr.user_id
      WHERE mr.message_id IN (${placeholders})
      ORDER BY mr.created_at ASC
    `;

    const rows = await query<RowDataPacket[]>(sql, messageIds);

    // Group by message_id, then by reaction emoji
    const tempMap = new Map<number, Map<string, ReactionGroup>>();

    for (const row of rows) {
      const msgId = Number(row.message_id);
      const reactionEmoji = String(row.reaction);
      const uId = Number(row.user_id);
      const firstName = row.first_name ? String(row.first_name) : undefined;

      if (!tempMap.has(msgId)) {
        tempMap.set(msgId, new Map<string, ReactionGroup>());
      }
      const msgReactions = tempMap.get(msgId)!;

      if (!msgReactions.has(reactionEmoji)) {
        msgReactions.set(reactionEmoji, {
          reaction: reactionEmoji,
          count: 0,
          users: [],
          hasReacted: false,
        });
      }

      const group = msgReactions.get(reactionEmoji)!;
      group.count += 1;
      group.users.push({ id: uId, firstName });
      if (uId === currentUserId) {
        group.hasReacted = true;
      }
    }

    // Convert to Map<number, ReactionGroup[]>
    for (const msgId of messageIds) {
      if (tempMap.has(msgId)) {
        resultMap.set(msgId, Array.from(tempMap.get(msgId)!.values()));
      } else {
        resultMap.set(msgId, []);
      }
    }

    return resultMap;
  }
}

export default ReactionModel;
