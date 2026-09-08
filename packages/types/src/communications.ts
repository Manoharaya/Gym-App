import type { BaseEntity } from './entities';

export type CommunicationChannel =
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'WHATSAPP'
  | 'IN_APP'
  | 'VOICE';

export type CommunicationType =
  | 'TRANSACTIONAL'
  | 'OPERATIONAL'
  | 'ENGAGEMENT'
  | 'REACTIVATION'
  | 'REMINDER'
  | 'SYSTEM'
  | 'MARKETING'
  | 'STAFF'
  | 'SECURITY';

export type CommunicationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUPPRESSED';

export type CommunicationSource =
  | 'BOOKING'
  | 'PAYMENT'
  | 'MEMBERSHIP'
  | 'REACTIVATION'
  | 'DAILY_CHECKIN'
  | 'SYSTEM'
  | 'STAFF'
  | 'MARKETING'
  | 'AI_AGENT';

export type CommunicationPolicyResult =
  | 'ALLOWED'
  | 'SUPPRESSED'
  | 'REQUIRES_APPROVAL'
  | 'INVALID_RECIPIENT'
  | 'INVALID_CHANNEL'
  | 'MISSING_CONSENT'
  | 'OPTED_OUT';

export type TemplateVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface CommunicationDto extends BaseEntity {
  organisationId: string;
  outletId?: string | null;
  recipientUserId?: string | null;
  recipientMemberId?: string | null;
  recipientStaffId?: string | null;

  type: CommunicationType;
  channel: CommunicationChannel;

  templateId?: string | null;
  templateVersionId?: string | null;

  subject?: string | null;
  contentPreview?: string | null;
  body?: string | null;
  variables?: Record<string, any> | null;

  status: CommunicationStatus;

  scheduledAt?: string | null;
  queuedAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  readAt?: string | null;

  provider: string;
  providerMessageId?: string | null;
  attemptCount: number;
  maxAttempts: number;

  source: CommunicationSource;
  sourceReferenceId?: string | null;
  idempotencyKey?: string | null;

  cost?: number | null;
  currency?: string;
  suppressionReason?: string | null;
  metadata?: Record<string, any> | null;
}

export interface CommunicationRequest {
  organisationId: string;
  outletId?: string;

  recipientMemberId?: string;
  recipientUserId?: string;
  recipientStaffId?: string;
  recipientEmail?: string;
  recipientPhone?: string;

  type: CommunicationType;
  channel?: CommunicationChannel;

  templateId?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, unknown>;

  source: CommunicationSource;
  sourceReferenceId?: string;

  requiresApproval?: boolean;
  scheduledAt?: Date | string;

  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface OutboundCommunication {
  communicationId: string;
  organisationId: string;
  outletId?: string | null;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientPushTokens?: string[];

  type: CommunicationType;
  channel: CommunicationChannel;
  subject?: string | null;
  body: string;
  html?: string | null;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  idempotencyKey?: string | null;
}

export interface ProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  providerStatus: string;
  cost?: number;
  currency?: string;
  error?: {
    code: string;
    message: string;
    isPermanent: boolean;
  };
}

export interface ProviderDeliveryStatus {
  providerMessageId: string;
  status: string;
  deliveredAt?: Date;
  failedAt?: Date;
  reason?: string;
}

export interface ProviderDeliveryEvent {
  provider: string;
  providerEventId: string;
  providerMessageId: string;
  status: CommunicationStatus;
  providerStatus: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedDeliveryStatus {
  status: CommunicationStatus;
  providerStatus?: string;
  timestamp: Date;
}

export interface CommunicationTemplateDto extends BaseEntity {
  organisationId?: string | null;
  name: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  description?: string | null;
  isSystem: boolean;
  versions?: CommunicationTemplateVersionDto[];
}

export interface CommunicationTemplateVersionDto extends BaseEntity {
  templateId: string;
  version: number;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  variablesSchema: Record<string, any>;
  status: TemplateVersionStatus;
  createdBy?: string | null;
}

export interface CommunicationPreferenceDto extends BaseEntity {
  userId: string;
  organisationId: string;
  channel: CommunicationChannel;
  type: CommunicationType;
  enabled: boolean;
  optedOutAt?: string | null;
}

export interface CommunicationAnalyticsDto {
  totalMessages: number;
  byStatus: Record<CommunicationStatus, number>;
  byChannel: Record<CommunicationChannel, number>;
  byType: Record<CommunicationType, number>;
  deliveryRate: number;
  failureRate: number;
  suppressionRate: number;
  readRate: number;
  estimatedCost: number;
  currency: string;
}
