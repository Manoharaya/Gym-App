import type { NotificationItem, NotificationPreferences } from '@fitcore/types';
import { apiClient } from '../api';
import { logger } from '../logging';

/**
 * FitCore Notification Service Abstraction
 * Channels: Push, In-App, SMS, Email
 */
export class NotificationService {
  public async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    logger.info('Registering push notification device token');
    await apiClient.post('/notifications/device', { token, platform });
  }

  public async getNotifications(): Promise<NotificationItem[]> {
    logger.debug('Fetching notification feed');
    const response = await apiClient.get<NotificationItem[]>('/notifications');
    return response.data;
  }

  public async markAsRead(notificationId: string): Promise<void> {
    logger.debug(`Marking notification read: ${notificationId}`);
    await apiClient.patch(`/notifications/${notificationId}/read`);
  }

  public async getPreferences(): Promise<NotificationPreferences> {
    logger.debug('Fetching notification preferences');
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  }

  public async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    logger.info('Updating notification preferences');
    const response = await apiClient.put<NotificationPreferences>(
      '/notifications/preferences',
      preferences
    );
    return response.data;
  }
}

export const notificationService = new NotificationService();
