import { apiClient } from '../../../services/api';
import type {
  Notification,
  NotificationPreference,
  NotificationUnreadCount,
} from '@fitcore/types';

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  category?: string;
  unreadOnly?: boolean;
  priority?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedNotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserPreferencesResponse {
  preferences: NotificationPreference[];
  marketingConsentActive: boolean;
}

export const notificationService = {
  async getNotifications(
    params?: QueryNotificationsParams,
  ): Promise<PaginatedNotificationsResponse> {
    const res = await apiClient.get<PaginatedNotificationsResponse>(
      '/notifications',
      { params },
    );
    return res.data;
  },

  async getUnreadCount(): Promise<NotificationUnreadCount> {
    const res = await apiClient.get<NotificationUnreadCount>(
      '/notifications/unread-count',
    );
    return res.data;
  },

  async getNotificationById(id: string): Promise<Notification> {
    const res = await apiClient.get<Notification>(`/notifications/${id}`);
    return res.data;
  },

  async markAsRead(id: string, read: boolean = true): Promise<Notification> {
    const res = await apiClient.patch<Notification>(
      `/notifications/${id}/read`,
      { read },
    );
    return res.data;
  },

  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const res = await apiClient.patch<{ updatedCount: number }>(
      '/notifications/read-all',
    );
    return res.data;
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `/notifications/${id}`,
    );
    return res.data;
  },

  async getPreferences(): Promise<UserPreferencesResponse> {
    const res = await apiClient.get<UserPreferencesResponse>(
      '/notification-preferences',
    );
    return res.data;
  },

  async updatePreference(dto: {
    category: string;
    channel: string;
    enabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  }): Promise<NotificationPreference> {
    const res = await apiClient.put<NotificationPreference>(
      '/notification-preferences',
      dto,
    );
    return res.data;
  },

  async registerPushDevice(dto: {
    deviceId: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    pushToken: string;
    appVersion?: string;
    deviceName?: string;
  }) {
    const res = await apiClient.post('/push-devices', dto);
    return res.data;
  },

  async revokePushDevice(deviceId: string) {
    const res = await apiClient.delete(`/push-devices/${deviceId}`);
    return res.data;
  },
};
