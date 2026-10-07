import { SettingsModel, PlatformSettingItem, FeatureFlagItem } from '../models/settings.model';
import { AuditService } from './audit.service';
import { AppError } from '../utils/AppError';
import { getIO } from '../sockets/socket';

export class SettingsService {
  private static settingsCache = new Map<string, any>();
  private static cacheExpiry = 0;

  /**
   * Fetch all settings with fast in-memory caching
   */
  public static async getAllSettings(includePrivate = false): Promise<PlatformSettingItem[]> {
    return await SettingsModel.getSettings(includePrivate);
  }

  /**
   * Fetch a setting value by key with 60s cache
   */
  public static async getSettingValue<T = any>(key: string, defaultValue: T): Promise<T> {
    const now = Date.now();
    if (this.settingsCache.has(key) && now < this.cacheExpiry) {
      return this.settingsCache.get(key);
    }

    const val = await SettingsModel.getValue<T>(key, defaultValue);
    this.settingsCache.set(key, val);
    this.cacheExpiry = now + 60000;
    return val;
  }

  /**
   * Update setting with strict type validation & audit logging
   */
  public static async updateSetting(key: string, value: string, adminId: number): Promise<PlatformSettingItem> {
    const current = await SettingsModel.getSetting(key);
    if (!current) {
      throw AppError.notFound(`Platform setting "${key}" does not exist.`);
    }

    // Type validation
    if (current.type === 'boolean') {
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase().trim())) {
        throw AppError.badRequest(`Setting "${key}" requires a boolean value ('true' or 'false').`);
      }
    } else if (current.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        throw AppError.badRequest(`Setting "${key}" requires a valid numeric value.`);
      }
    } else if (current.type === 'json') {
      try {
        JSON.parse(value);
      } catch {
        throw AppError.badRequest(`Setting "${key}" requires valid JSON formatting.`);
      }
    }

    await SettingsModel.updateSetting(key, value.trim(), adminId);
    this.settingsCache.delete(key);

    await AuditService.logSecurityEvent(
      'PLATFORM_SETTING_CHANGED',
      null,
      adminId,
      'platform_setting',
      current.id,
      `Setting "${key}" changed from "${current.value}" to "${value.trim()}"`
    );

    // If maintenance mode toggled, broadcast to admin and all connected sockets
    if (key === 'maintenance_mode') {
      try {
        const io = getIO();
        io.emit('system:maintenance_mode', {
          active: value.trim() === 'true',
          timestamp: new Date().toISOString(),
        });
      } catch {}
    }

    const updated = await SettingsModel.getSetting(key);
    return updated!;
  }

  /**
   * Check if platform is currently in maintenance mode
   */
  public static async isMaintenanceMode(): Promise<boolean> {
    return await this.getSettingValue<boolean>('maintenance_mode', false);
  }

  /**
   * Fetch all feature flags
   */
  public static async getFeatureFlags(): Promise<FeatureFlagItem[]> {
    return await SettingsModel.getFeatureFlags();
  }

  /**
   * Check if a specific feature flag is currently enabled
   */
  public static async isFeatureEnabled(key: string): Promise<boolean> {
    const flags = await SettingsModel.getFeatureFlags();
    const flag = flags.find((f) => f.key === key);
    return flag ? flag.isEnabled : true;
  }

  /**
   * Toggle a feature flag with audit logging
   */
  public static async toggleFeatureFlag(key: string, isEnabled: boolean, adminId: number): Promise<void> {
    const flags = await SettingsModel.getFeatureFlags();
    const flag = flags.find((f) => f.key === key);
    if (!flag) {
      throw AppError.notFound(`Feature flag "${key}" does not exist.`);
    }

    await SettingsModel.toggleFeatureFlag(key, isEnabled, adminId);

    await AuditService.logSecurityEvent(
      'FEATURE_FLAG_TOGGLED',
      null,
      adminId,
      'feature_flag',
      flag.id,
      `Feature flag "${key}" turned ${isEnabled ? 'ON' : 'OFF'}`
    );

    try {
      const io = getIO();
      io.emit('system:feature_flag_updated', {
        key,
        isEnabled,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  /**
   * Update feature flag rollout / description
   */
  public static async updateFeatureFlag(
    key: string,
    data: { name?: string; description?: string; isEnabled?: boolean; rolloutPercentage?: number },
    adminId: number
  ): Promise<void> {
    if (data.rolloutPercentage !== undefined) {
      if (data.rolloutPercentage < 0 || data.rolloutPercentage > 100) {
        throw AppError.badRequest('Rollout percentage must be between 0 and 100.');
      }
    }

    await SettingsModel.updateFeatureFlag(key, data, adminId);

    await AuditService.logSecurityEvent(
      'FEATURE_FLAG_UPDATED',
      null,
      adminId,
      'feature_flag',
      null,
      `Feature flag "${key}" updated (rollout: ${data.rolloutPercentage ?? 'unchanged'}%)`
    );
  }
}

export default SettingsService;
