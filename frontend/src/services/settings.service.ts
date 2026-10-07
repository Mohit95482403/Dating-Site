import { api } from './api';
import type {
  UserSettings,
  UpdateSettingsInput,
  AccountInfo,
  UpdateAccountInput,
  ChangePasswordInput,
  BlockedUserItem,
  ActiveSessionItem,
  DeleteAccountInput,
} from '../types/settings';
import type { ApiResponse } from '../types';

export class SettingsService {
  /**
   * Fetch current user settings
   */
  public static async getSettings(): Promise<UserSettings> {
    const res = await api.get<ApiResponse<UserSettings>>('/settings');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to load user settings');
    }
    return res.data.data;
  }

  /**
   * Update one or more user settings
   */
  public static async updateSettings(input: UpdateSettingsInput): Promise<UserSettings> {
    const res = await api.put<ApiResponse<UserSettings>>('/settings', input);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to update user settings');
    }
    return res.data.data;
  }

  /**
   * Fetch account information
   */
  public static async getAccountInfo(): Promise<AccountInfo> {
    const res = await api.get<ApiResponse<AccountInfo>>('/account');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to load account information');
    }
    return res.data.data;
  }

  /**
   * Update account information (name, username, DOB, email)
   */
  public static async updateAccount(input: UpdateAccountInput): Promise<AccountInfo> {
    const res = await api.put<ApiResponse<AccountInfo>>('/account', input);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to update account information');
    }
    return res.data.data;
  }

  /**
   * Change user password
   */
  public static async changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/change-password', input);
    return { message: res.data.message || 'Password changed successfully' };
  }

  /**
   * Fetch list of users blocked by authenticated user
   */
  public static async getBlockedUsers(): Promise<BlockedUserItem[]> {
    const res = await api.get<ApiResponse<BlockedUserItem[]>>('/blocks');
    return Array.isArray(res.data.data) ? res.data.data : ((res.data.data as any)?.blockedUsers || []);
  }

  /**
   * Unblock a user
   */
  public static async unblockUser(userId: number): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`/blocks/${userId}/unblock`);
    return { message: res.data.message || 'User unblocked successfully' };
  }

  /**
   * Block a user
   */
  public static async blockUser(userId: number, reason?: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`/blocks/${userId}`, { reason });
    return { message: res.data.message || 'User blocked successfully' };
  }

  /**
   * Fetch active sessions
   */
  public static async getSessions(): Promise<ActiveSessionItem[]> {
    const res = await api.get<ApiResponse<ActiveSessionItem[]>>('/sessions');
    return Array.isArray(res.data.data) ? res.data.data : ((res.data.data as any)?.sessions || []);
  }

  /**
   * Revoke all other active sessions except current
   */
  public static async logoutOtherSessions(): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>('/sessions/logout-others');
    return { message: res.data.message || 'All other devices have been logged out' };
  }

  /**
   * Permanently delete user account
   */
  public static async deleteAccount(input: DeleteAccountInput): Promise<{ message: string }> {
    const res = await api.delete<ApiResponse<{ message: string }>>('/account', {
      data: input,
    });
    return { message: res.data.message || 'Account successfully deleted' };
  }
}

export default SettingsService;
