/**
 * FitCore Notification & Communication Architecture Contracts
 */

import type { BaseEntity } from './entities';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS';

export type NotificationCategory =
  | 'SYSTEM'
  | 'SECURITY'
  | 'MEMBERSHIP'
  | 'PAYMENT'
  | 'BOOKING'
  | 'ATTENDANCE'
  | 'TRAINING'
  | 'NUTRITION'
  | 'PROGRESS'
  | 'COMMUNICATION'
  | 'MARKETING'
  | 'ADMIN';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export type DeliveryStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type PushPlatform = 'IOS' | 'ANDROID' | 'WEB';

export type PushDeviceStatus = 'ACTIVE' | 'REVOKED' | 'INVALID';

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ScheduleStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface Notification extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  recipientUserId: string;
  memberId?: string | null;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  priority: NotificationPriority;
  status: NotificationStatus;
  readAt?: string | null;
  expiresAt?: string | null;
  deliveries?: NotificationDelivery[];
}

export interface NotificationDelivery extends BaseEntity {
  notificationId: string;
  channel: NotificationChannel;
  provider: string;
  providerMessageId?: string | null;
  status: DeliveryStatus;
  attemptCount: number;
  lastAttemptAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
}

export interface NotificationPreference extends BaseEntity {
  userId: string;
  organisationId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string | null;
}

export interface NotificationTemplate extends BaseEntity {
  organisationId?: string | null;
  key: string;
  name: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  subject?: string | null;
  body: string;
  variables: string[];
  version: number;
  status: TemplateStatus;
  isSystem: boolean;
}

export interface PushDevice extends BaseEntity {
  userId: string;
  organisationId: string;
  deviceId: string;
  platform: PushPlatform;
  pushToken: string;
  appVersion?: string | null;
  deviceName?: string | null;
  status: PushDeviceStatus;
  lastSeenAt: string;
}

export interface NotificationSchedule extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  recipientUserId: string;
  notificationType: string;
  scheduledFor: string;
  timezone: string;
  status: ScheduleStatus;
  payload: Record<string, any>;
  idempotencyKey?: string | null;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}

// Legacy helper for mobile backward compatibility
export interface NotificationItem {
  id: string;
  userId: string;
  organisationId: string;
  outletId?: string | null;
  title: string;
  body: string;
  category: NotificationCategory;
  channels?: NotificationChannel[];
  read: boolean;
  actionUrl?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string | null;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
  categories: Record<string, boolean>;
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}
