import { query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { ProfilePrompt, UserProfilePrompt } from '../types/profile.types';

export class PromptModel {
  /**
   * Fetch all available predefined profile prompts ordered by display order
   */
  public static async getAllPrompts(): Promise<ProfilePrompt[]> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, prompt_text, category, display_order FROM profile_prompts ORDER BY display_order ASC, id ASC'
    );
    return rows.map((r) => ({
      id: Number(r.id),
      promptText: String(r.prompt_text),
      category: String(r.category || 'general'),
      displayOrder: Number(r.display_order || 0),
    }));
  }

  /**
   * Fetch all answered prompts for a specific user
   */
  public static async getUserPrompts(userId: number): Promise<UserProfilePrompt[]> {
    const sql = `
      SELECT 
        upp.id, 
        upp.user_id, 
        upp.prompt_id, 
        upp.answer, 
        upp.created_at, 
        upp.updated_at,
        p.prompt_text, 
        p.category
      FROM user_profile_prompts upp
      INNER JOIN profile_prompts p ON upp.prompt_id = p.id
      WHERE upp.user_id = ?
      ORDER BY p.display_order ASC, upp.created_at ASC
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId]);
    return rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      promptId: Number(r.prompt_id),
      promptText: String(r.prompt_text),
      category: String(r.category || 'general'),
      answer: String(r.answer),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  /**
   * Add or update an answered prompt for a user
   */
  public static async saveUserPrompt(
    userId: number,
    promptId: number,
    answer: string
  ): Promise<number> {
    const sql = `
      INSERT INTO user_profile_prompts (user_id, prompt_id, answer)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE answer = VALUES(answer)
    `;
    const result = await execute(sql, [userId, promptId, answer]);
    return result.insertId;
  }

  /**
   * Delete an answered prompt by user ID and prompt ID
   */
  public static async deleteUserPrompt(
    userId: number,
    promptId: number
  ): Promise<boolean> {
    const sql = 'DELETE FROM user_profile_prompts WHERE user_id = ? AND prompt_id = ?';
    const result = await execute(sql, [userId, promptId]);
    return result.affectedRows > 0;
  }

  /**
   * Check if a prompt exists
   */
  public static async findPromptById(promptId: number): Promise<ProfilePrompt | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, prompt_text, category, display_order FROM profile_prompts WHERE id = ? LIMIT 1',
      [promptId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: Number(r.id),
      promptText: String(r.prompt_text),
      category: String(r.category || 'general'),
      displayOrder: Number(r.display_order || 0),
    };
  }
}

export default PromptModel;
