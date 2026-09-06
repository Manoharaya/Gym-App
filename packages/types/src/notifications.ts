/**
 * FitCore Notification Architecture Contracts
 */

export type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';

export type NotificationCategory =
  | 'BOOKING_REMINDER'
  | 'WORKOUT_REMINDER'
  | 'MEMBERSHIP_BILLING'
  | 'COMMUNITY_CHAT'
  | 'AI_CHECKIN'
  | 'FACILITY_ALERT'
  | 'PROMOTIONAL';

export interface NotificationPreferences {
  userId: string;
  channels: {
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
  categories: Record<NotificationCategory, boolean>;
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    timezone: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  organisationId: string;
  outletId?: string;
  title: string;
  body: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  read: boolean;
  actionUrl?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}
