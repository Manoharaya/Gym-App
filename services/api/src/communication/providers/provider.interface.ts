export interface DeliveryResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  failureCode?: string;
}

export interface EmailNotificationRequest {
  to: string;
  subject: string;
  body: string;
  recipientUserId: string;
  organisationId: string;
  metadata?: Record<string, any>;
}

export interface SmsNotificationRequest {
  to: string;
  body: string;
  recipientUserId: string;
  organisationId: string;
  metadata?: Record<string, any>;
}

export interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: string;
  recipientUserId: string;
  organisationId: string;
}

export interface InAppNotificationRequest {
  notificationId: string;
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface EmailProvider {
  send(request: EmailNotificationRequest): Promise<DeliveryResult>;
}

export interface SmsProvider {
  send(request: SmsNotificationRequest): Promise<DeliveryResult>;
}

export interface PushProvider {
  send(request: PushNotificationRequest): Promise<DeliveryResult>;
}

export interface InAppProvider {
  send(request: InAppNotificationRequest): Promise<DeliveryResult>;
}
