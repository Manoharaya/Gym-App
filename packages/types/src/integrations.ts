/**
 * FitCore — Day 48: Production-Grade Integrations Platform Contracts
 *
 * Unified integration architecture:
 * FITCORE DOMAIN -> INTEGRATION SERVICE -> PROVIDER ABSTRACTION -> PROVIDER ADAPTER -> EXTERNAL SYSTEM
 */

export type IntegrationCategory =
  | 'PAYMENTS'
  | 'ACCOUNTING'
  | 'COMMUNICATION'
  | 'MESSAGING'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'WEARABLE'
  | 'CALENDAR'
  | 'ACCESS_CONTROL'
  | 'ANALYTICS'
  | 'STORAGE'
  | 'OTHER';

export type IntegrationCapability =
  | 'CONTACTS'
  | 'INVOICES'
  | 'PAYMENTS'
  | 'REFUNDS'
  | 'CREDIT_NOTES'
  | 'WEBHOOKS'
  | 'SYNC'
  | 'MESSAGES'
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'PUSH'
  | 'CALENDAR_READ'
  | 'CALENDAR_WRITE'
  | 'HEALTH_DATA_READ'
  | 'ACCESS_CONTROL'
  | 'DEVICE_TELEMETRY'
  | 'ACCOUNTING_SYNC';

export type IntegrationConnectionStatus =
  | 'PENDING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'DEGRADED'
  | 'AUTHENTICATION_REQUIRED'
  | 'ERROR'
  | 'DISCONNECTED'
  | 'REVOKED'
  | 'SUSPENDED';

export type IntegrationScope =
  | 'ORGANISATION'
  | 'OUTLET'
  | 'MEMBER'
  | 'STAFF';

export type IntegrationEnvironment =
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION';

export type IntegrationHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'AUTHENTICATION_REQUIRED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN';

export type IntegrationWebhookStatus =
  | 'RECEIVED'
  | 'VERIFIED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'IGNORED'
  | 'DUPLICATE';

export type IntegrationSyncType =
  | 'INITIAL'
  | 'INCREMENTAL'
  | 'FULL'
  | 'ENTITY'
  | 'RECONCILIATION';

export type IntegrationSyncStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type IntegrationSyncRecordStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SYNCED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED'
  | 'CONFLICT';

export type IntegrationSyncRecordOperation =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SKIP'
  | 'RETRY'
  | 'FAILED';

export type IntegrationErrorCategory =
  | 'TRANSIENT'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'INVALID_CONFIGURATION'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNKNOWN';

export type IntegrationNormalizedEventType =
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'REFUND_CREATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_PAID'
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_FAILED'
  | 'MESSAGE_RECEIVED'
  | 'CALENDAR_EVENT_CREATED'
  | 'CALENDAR_EVENT_UPDATED'
  | 'CALENDAR_EVENT_DELETED'
  | 'WEARABLE_SYNC_COMPLETED'
  | 'WEARABLE_CONNECTION_CHANGED'
  | 'ACCESS_EVENT_RECEIVED'
  | 'ACCESS_DEVICE_STATUS_CHANGED';

export type IntegrationAuditAction =
  | 'INTEGRATION_CONNECTED'
  | 'INTEGRATION_DISCONNECTED'
  | 'INTEGRATION_REAUTHORIZED'
  | 'INTEGRATION_HEALTH_CHECKED'
  | 'INTEGRATION_SYNC_STARTED'
  | 'INTEGRATION_SYNC_COMPLETED'
  | 'INTEGRATION_SYNC_FAILED'
  | 'INTEGRATION_WEBHOOK_RECEIVED'
  | 'INTEGRATION_WEBHOOK_PROCESSED'
  | 'INTEGRATION_WEBHOOK_FAILED'
  | 'INTEGRATION_CONFIGURATION_CHANGED'
  | 'INTEGRATION_CREDENTIAL_ROTATED';

export type IntegrationReconciliationStatus =
  | 'MATCHED'
  | 'MISSING_EXTERNAL'
  | 'MISSING_FITCORE'
  | 'AMOUNT_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'DUPLICATE'
  | 'STALE'
  | 'CONFLICT'
  | 'UNKNOWN'
  | 'RESOLVED';

export interface IntegrationMetadata {
  integrationKey: string;
  displayName: string;
  category: IntegrationCategory;
  provider: string;
  description: string;
  version: string;
  author?: string;
  websiteUrl?: string;
  documentationUrl?: string;
  iconUrl?: string;
  capabilities: IntegrationCapability[];
  supportedScopes: IntegrationScope[];
  supportedEnvironments: IntegrationEnvironment[];
  authenticationType: 'OAUTH2' | 'API_KEY' | 'BASIC' | 'DEVICE_TOKEN' | 'NONE';
  webhookSupport: boolean;
  syncSupport: boolean;
  status: 'GA' | 'BETA' | 'DEPRECATED' | 'DISABLED';
}

export interface IntegrationConnectionDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  memberId?: string | null;
  staffId?: string | null;
  integrationKey: string;
  provider: string;
  category: IntegrationCategory;
  scope: IntegrationScope;
  status: IntegrationConnectionStatus;
  environment: IntegrationEnvironment;
  externalAccountId?: string | null;
  externalAccountName?: string | null;
  hasCredentials: boolean;
  configuration: Record<string, any>;
  connectedByUserId: string;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastSuccessfulOperationAt?: string | null;
  lastFailedOperationAt?: string | null;
  lastHealthCheckAt?: string | null;
  lastSyncAt?: string | null;
  configurationVersion: number;
  healthStatus: IntegrationHealthStatus;
  failureCount: number;
  consecutiveFailures: number;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationConnectionDto {
  integrationKey: string;
  scope?: IntegrationScope;
  outletId?: string;
  memberId?: string;
  staffId?: string;
  environment?: IntegrationEnvironment;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
}

export interface UpdateIntegrationConnectionDto {
  environment?: IntegrationEnvironment;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
  status?: IntegrationConnectionStatus;
}

export interface IntegrationWebhookEventDto {
  id: string;
  organisationId?: string | null;
  outletId?: string | null;
  connectionId?: string | null;
  provider: string;
  externalEventId: string;
  eventType: string;
  normalizedType?: IntegrationNormalizedEventType | null;
  status: IntegrationWebhookStatus;
  attemptCount: number;
  payloadHash: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  receivedAt: string;
  processedAt?: string | null;
}

export interface IntegrationSyncJobDto {
  id: string;
  organisationId: string;
  connectionId: string;
  syncType: IntegrationSyncType;
  status: IntegrationSyncStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  cursor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorCount: number;
  errorMessage?: string | null;
  triggeredBy?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSyncRecordDto {
  id: string;
  syncJobId: string;
  organisationId: string;
  entityType: string;
  fitcoreEntityId?: string | null;
  externalEntityId?: string | null;
  operation: IntegrationSyncRecordOperation;
  status: IntegrationSyncRecordStatus;
  attemptCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface IntegrationHealthReportDto {
  connectionId: string;
  integrationKey: string;
  provider: string;
  scope: IntegrationScope;
  status: IntegrationHealthStatus;
  isAvailable: boolean;
  consecutiveFailures: number;
  failureCount: number;
  lastSuccessfulOperationAt?: string | null;
  lastFailedOperationAt?: string | null;
  lastHealthCheckAt: string;
  latencyMs?: number;
  details?: Record<string, any>;
  diagnostics?: string[];
}

export interface IntegrationOverviewSummaryDto {
  totalConnections: number;
  connectedCount: number;
  healthyCount: number;
  degradedCount: number;
  attentionCount: number;
  syncsLast24h: number;
  webhooksLast24h: number;
  categories: Record<IntegrationCategory, number>;
  providers: Record<string, number>;
}

export interface IntegrationAuditDto {
  id: string;
  organisationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  action: IntegrationAuditAction;
  resource: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface IntegrationErrorLogDto {
  id: string;
  connectionId?: string | null;
  provider: string;
  category: IntegrationErrorCategory;
  message: string;
  statusCode?: number;
  retryable: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

export interface IntegrationRateLimitStatusDto {
  provider: string;
  connectionId: string;
  operation: string;
  limit: number;
  remaining: number;
  resetAt: string;
  isThrottled: boolean;
  retryAfterSeconds?: number;
}
