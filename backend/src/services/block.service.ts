import { execute } from '../config/database';

export class BlockService {
  public static async blockUser(blockerId: number, blockedUserId: number, reason?: string) {
    return await execute(
      'INSERT INTO blocks (blocker_id, blocked_user_id, reason) VALUES (?, ?, ?)',
      [blockerId, blockedUserId, reason || null]
    );
  }
}

export default BlockService;
