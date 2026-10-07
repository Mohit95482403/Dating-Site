import { query, execute } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { UserSettings, UpdateSettingsInput } from '../types/settings.types';

export interface PlatformSettingItem {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedBy: number | null;
  updatedByName?: string | null;
  updatedAt: string;
}

export interface FeatureFlagItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  updatedBy: number | null;
  updatedByName?: string | null;
  updatedAt: string;
}

export class SettingsModel {
  /**
   * Fetch all platform settings (filtered by public status if requested)
   */
  public static async getSettings(includePrivate = false): Promise<PlatformSettingItem[]> {
    let sql = `
      SELECT 
        ps.id, ps.setting_key, ps.setting_value, ps.setting_type, ps.category, ps.description, ps.is_public,
        ps.updated_by, ps.updated_at,
        p.first_name as updated_by_name
      FROM platform_settings ps
      LEFT JOIN profiles p ON ps.updated_by = p.user_id
    `;

    if (!includePrivate) {
      sql += ' WHERE ps.is_public = TRUE';
    }

    sql += ' ORDER BY ps.category ASC, ps.setting_key ASC';

    const rows = await query<RowDataPacket[]>(sql);

    return rows.map((r) => ({
      id: Number(r.id),
      key: r.setting_key,
      value: r.setting_value,
      type: r.setting_type,
      category: r.category,
      description: r.description || null,
      isPublic: Boolean(r.is_public),
      updatedBy: r.updated_by ? Number(r.updated_by) : null,
      updatedByName: r.updated_by_name || null,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Fetch single setting by key
   */
  public static async getSetting(key: string): Promise<PlatformSettingItem | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, setting_key, setting_value, setting_type, category, description, is_public, updated_by, updated_at FROM platform_settings WHERE setting_key = ? LIMIT 1',
      [key]
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: Number(r.id),
      key: r.setting_key,
      value: r.setting_value,
      type: r.setting_type,
      category: r.category,
      description: r.description || null,
      isPublic: Boolean(r.is_public),
      updatedBy: r.updated_by ? Number(r.updated_by) : null,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Get typed setting value directly
   */
  public static async getValue<T = any>(key: string, defaultValue: T): Promise<T> {
    const item = await this.getSetting(key);
    if (!item) return defaultValue;

    try {
      if (item.type === 'boolean') {
        return (item.value === 'true' || item.value === '1') as unknown as T;
      }
      if (item.type === 'number') {
        const num = Number(item.value);
        return (isNaN(num) ? defaultValue : num) as unknown as T;
      }
      if (item.type === 'json') {
        return JSON.parse(item.value) as T;
      }
      return item.value as unknown as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Update setting value
   */
  public static async updateSetting(key: string, value: string, adminId: number | null): Promise<void> {
    await execute(
      'UPDATE platform_settings SET setting_value = ?, updated_by = ?, updated_at = NOW() WHERE setting_key = ?',
      [value, adminId, key]
    );
  }

  /**
   * Fetch feature flags
   */
  public static async getFeatureFlags(): Promise<FeatureFlagItem[]> {
    const rows = await query<RowDataPacket[]>(`
      SELECT 
        ff.id, ff.flag_key, ff.name, ff.description, ff.is_enabled, ff.rollout_percentage,
        ff.updated_by, ff.updated_at,
        p.first_name as updated_by_name
      FROM feature_flags ff
      LEFT JOIN profiles p ON ff.updated_by = p.user_id
      ORDER BY ff.flag_key ASC
    `);

    return rows.map((r) => ({
      id: Number(r.id),
      key: r.flag_key,
      name: r.name,
      description: r.description || null,
      isEnabled: Boolean(r.is_enabled),
      rolloutPercentage: Number(r.rollout_percentage || 100),
      updatedBy: r.updated_by ? Number(r.updated_by) : null,
      updatedByName: r.updated_by_name || null,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Check if a specific feature flag is active
   */
  public static async isFeatureEnabled(key: string, userId?: number): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      'SELECT is_enabled, rollout_percentage FROM feature_flags WHERE flag_key = ? LIMIT 1',
      [key]
    );
    if (!rows[0]) return true; // Default to true if not flagged

    const enabled = Boolean(rows[0].is_enabled);
    if (!enabled) return false;

    const percentage = Number(rows[0].rollout_percentage || 100);
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Deterministic user rollout hashing if userId provided
    if (userId) {
      const hashBucket = (userId * 2654435761) % 100;
      return hashBucket < percentage;
    }

    return true;
  }

  /**
   * Toggle a feature flag
   */
  public static async toggleFeatureFlag(key: string, isEnabled: boolean, adminId: number | null): Promise<void> {
    await execute(
      'UPDATE feature_flags SET is_enabled = ?, updated_by = ?, updated_at = NOW() WHERE flag_key = ?',
      [isEnabled, adminId, key]
    );
  }

  /**
   * Update feature flag details (rollout, description, name)
   */
  public static async updateFeatureFlag(
    key: string,
    data: { name?: string; description?: string; isEnabled?: boolean; rolloutPercentage?: number },
    adminId: number | null
  ): Promise<void> {
    await execute(
      `UPDATE feature_flags SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        is_enabled = COALESCE(?, is_enabled),
        rollout_percentage = COALESCE(?, rollout_percentage),
        updated_by = ?,
        updated_at = NOW()
       WHERE flag_key = ?`,
      [
        data.name || null,
        data.description || null,
        data.isEnabled !== undefined ? data.isEnabled : null,
        data.rolloutPercentage !== undefined ? data.rolloutPercentage : null,
        adminId,
        key,
      ]
    );
  }

  // ==========================================
  // USER SETTINGS METHODS (Day 15 & Day 25)
  // ==========================================

  /**
   * Find user preferences by user ID
   */
  public static async findByUserId(userId: number): Promise<UserSettings | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM user_settings WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!rows[0]) {
      return await this.createDefault(userId);
    }
    const r = rows[0];
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      profileVisibility: r.profile_visibility || 'public',
      showOnlineStatus: Boolean(r.show_online_status),
      showLastSeen: Boolean(r.show_last_seen),
      showReadReceipts: Boolean(r.show_read_receipts),
      showTypingIndicator: Boolean(r.show_typing_indicator),
      showInDiscovery: Boolean(r.show_in_discovery),
      useLocationForDiscovery: Boolean(r.use_location_for_discovery),
      notifyMatches: Boolean(r.notify_matches),
      notifyMessages: Boolean(r.notify_messages),
      notifyLikes: Boolean(r.notify_likes),
      notifySuperLikes: Boolean(r.notify_super_likes),
      notifyReactions: Boolean(r.notify_reactions),
      notifySystem: Boolean(r.notify_system),
      locationVisibility: r.location_visibility || 'approximate',
      messagePermissions: r.message_permissions || 'matches_only',
      callPermissions: r.call_permissions || 'matches_only',
      aiDataProcessing: Boolean(r.ai_data_processing),
      searchVisibility: Boolean(r.search_visibility),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Create default user settings row
   */
  public static async createDefault(userId: number): Promise<UserSettings> {
    await execute(
      `INSERT INTO user_settings (user_id) VALUES (?) ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [userId]
    );
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM user_settings WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const r = rows[0];
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      profileVisibility: r.profile_visibility || 'public',
      showOnlineStatus: Boolean(r.show_online_status),
      showLastSeen: Boolean(r.show_last_seen),
      showReadReceipts: Boolean(r.show_read_receipts),
      showTypingIndicator: Boolean(r.show_typing_indicator),
      showInDiscovery: Boolean(r.show_in_discovery),
      useLocationForDiscovery: Boolean(r.use_location_for_discovery),
      notifyMatches: Boolean(r.notify_matches),
      notifyMessages: Boolean(r.notify_messages),
      notifyLikes: Boolean(r.notify_likes),
      notifySuperLikes: Boolean(r.notify_super_likes),
      notifyReactions: Boolean(r.notify_reactions),
      notifySystem: Boolean(r.notify_system),
      locationVisibility: r.location_visibility || 'approximate',
      messagePermissions: r.message_permissions || 'matches_only',
      callPermissions: r.call_permissions || 'matches_only',
      aiDataProcessing: Boolean(r.ai_data_processing),
      searchVisibility: Boolean(r.search_visibility),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Update user settings
   */
  public static async update(userId: number, input: UpdateSettingsInput): Promise<UserSettings> {
    await this.findByUserId(userId);
    const fieldMap: Record<string, string> = {
      profileVisibility: 'profile_visibility',
      showOnlineStatus: 'show_online_status',
      showLastSeen: 'show_last_seen',
      showReadReceipts: 'show_read_receipts',
      showTypingIndicator: 'show_typing_indicator',
      showInDiscovery: 'show_in_discovery',
      useLocationForDiscovery: 'use_location_for_discovery',
      notifyMatches: 'notify_matches',
      notifyMessages: 'notify_messages',
      notifyLikes: 'notify_likes',
      notifySuperLikes: 'notify_super_likes',
      notifyReactions: 'notify_reactions',
      notifySystem: 'notify_system',
      locationVisibility: 'location_visibility',
      messagePermissions: 'message_permissions',
      callPermissions: 'call_permissions',
      aiDataProcessing: 'ai_data_processing',
      searchVisibility: 'search_visibility',
    };

    const sets: string[] = [];
    const vals: any[] = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if ((input as any)[key] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push((input as any)[key]);
      }
    }

    if (sets.length > 0) {
      vals.push(userId);
      await execute(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`, vals);
    }

    return (await this.findByUserId(userId))!;
  }
}

export default SettingsModel;
