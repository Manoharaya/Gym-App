/**
 * FitCore — Day 49: Developer Platform & Public API Domain Types
 */

export type DeveloperApplicationType =
  | 'INTERNAL'
  | 'ORGANISATION'
  | 'PARTNER'
  | 'THIRD_PARTY'
  | 'MARKETPLACE';

export type DeveloperApplicationStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'ARCHIVED';

export type DeveloperEnvironment = 'DEVELOPMENT' | 'SANDBOX' | 'PRODUCTION';

export type ApiKeyStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';

export type ApiScope =
  | 'members:read'
  | 'members:write'
  | 'memberships:read'
  | 'memberships:write'
  | 'classes:read'
  | 'classes:write'
  | 'bookings:read'
  | 'bookings:write'
  | 'attendance:read'
  | 'attendance:write'
  | 'trainers:read'
  | 'training:read'
  | 'training:write'
  | 'payments:read'
  | 'invoices:read'
  | 'communication:read'
  | 'communication:write'
  | 'resources:read'
  | 'analytics:read'
  | 'webhooks:manage'
  | 'health:read'
  | 'health:write'
  | 'wearables:read';

export type ScopeSensitivity = 'PUBLIC' | 'STANDARD' | 'SENSITIVE' | 'RESTRICTED';

export interface ApiScopeDefinition {
  scope: ApiScope;
  resource: string;
  operation: 'read' | 'write' | 'manage';
  sensitivity: ScopeSensitivity;
  displayName: string;
  description: string;
  requiresExplicitConsent: boolean;
}

export type WebhookSubscriptionStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'FAILING'
  | 'DISABLED'
  | 'REVOKED';

export type WebhookDeliveryStatus =
  | 'PENDING'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'EXPIRED';

export type RateLimitTier =
  | 'STANDARD'
  | 'PARTNER'
  | 'ENTERPRISE'
  | 'INTERNAL'
  | 'SANDBOX';

export type DeveloperAuditAction =
  | 'DEVELOPER_APPLICATION_CREATED'
  | 'DEVELOPER_APPLICATION_UPDATED'
  | 'DEVELOPER_APPLICATION_SUSPENDED'
  | 'DEVELOPER_APPLICATION_REVOKED'
  | 'DEVELOPER_APPLICATION_SECRET_ROTATED'
  | 'API_KEY_CREATED'
  | 'API_KEY_ROTATED'
  | 'API_KEY_REVOKED'
  | 'OAUTH_AUTHORIZATION_CREATED'
  | 'OAUTH_CONSENT_GRANTED'
  | 'OAUTH_CONSENT_REVOKED'
  | 'OAUTH_TOKEN_ISSUED'
  | 'OAUTH_TOKEN_REVOKED'
  | 'WEBHOOK_SUBSCRIPTION_CREATED'
  | 'WEBHOOK_SUBSCRIPTION_UPDATED'
  | 'WEBHOOK_SUBSCRIPTION_PAUSED'
  | 'WEBHOOK_SUBSCRIPTION_RESUMED'
  | 'WEBHOOK_SUBSCRIPTION_REVOKED'
  | 'WEBHOOK_SUBSCRIPTION_SECRET_ROTATED'
  | 'WEBHOOK_DELIVERY_FAILED'
  | 'WEBHOOK_DELIVERY_SUCCEEDED'
  | 'API_SCOPE_GRANTED'
  | 'API_SCOPE_REVOKED'
  | 'DEVELOPER_API_REQUEST'
  | 'DEVELOPER_API_RATE_LIMITED';

export interface DeveloperApplicationDto {
  id: string;
  organisationId?: string | null;
  createdByUserId: string;
  name: string;
  description?: string | null;
  applicationType: DeveloperApplicationType;
  status: DeveloperApplicationStatus;
  environment: DeveloperEnvironment;
  clientId: string;
  redirectUris: string[];
  allowedScopes: ApiScope[];
  webhookEnabled: boolean;
  rateLimitTier: RateLimitTier;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeveloperApplicationDto {
  organisationId?: string;
  name: string;
  description?: string;
  applicationType?: DeveloperApplicationType;
  environment?: DeveloperEnvironment;
  redirectUris?: string[];
  allowedScopes?: ApiScope[];
  webhookEnabled?: boolean;
}

export interface UpdateDeveloperApplicationDto {
  name?: string;
  description?: string;
  redirectUris?: string[];
  allowedScopes?: ApiScope[];
  status?: DeveloperApplicationStatus;
  webhookEnabled?: boolean;
}

export interface DeveloperApiKeyDto {
  id: string;
  applicationId: string;
  organisationId?: string | null;
  name?: string | null;
  keyPrefix: string;
  environment: DeveloperEnvironment;
  scopes: ApiScope[];
  status: ApiKeyStatus;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  rotatedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyDto {
  name?: string;
  environment?: DeveloperEnvironment;
  scopes?: ApiScope[];
  expiresInDays?: number;
}

export interface ApiKeyCreatedResponseDto {
  apiKey: DeveloperApiKeyDto;
  plainKey: string; // ONLY returned once upon creation!
}

export interface RotateApiKeyDto {
  gracePeriodHours?: number;
}

export interface WebhookSubscriptionDto {
  id: string;
  applicationId: string;
  organisationId: string;
  endpointUrl: string;
  description?: string | null;
  eventTypes: string[];
  status: WebhookSubscriptionStatus;
  hasSecret: boolean;
  failureCount: number;
  consecutiveFailures: number;
  lastDeliveryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookSubscriptionDto {
  endpointUrl: string;
  description?: string;
  eventTypes: string[];
}

export interface UpdateWebhookSubscriptionDto {
  endpointUrl?: string;
  description?: string;
  eventTypes?: string[];
  status?: WebhookSubscriptionStatus;
}

export interface WebhookDeliveryDto {
  id: string;
  subscriptionId: string;
  organisationId: string;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  status: WebhookDeliveryStatus;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  deliveredAt?: string | null;
  nextRetryAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

export interface WebhookTestResultDto {
  success: boolean;
  httpStatus?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  payload: Record<string, any>;
}

export interface OAuthAuthorizeQueryDto {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256';
}

export interface OAuthConsentRequestDto {
  client_id: string;
  redirect_uri: string;
  scopes: ApiScope[];
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256';
  approved: boolean;
}

export interface OAuthTokenRequestDto {
  grant_type: 'authorization_code' | 'refresh_token';
  client_id: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
}

export interface OAuthTokenResponseDto {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface OAuthRevokeDto {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id: string;
  client_secret?: string;
}

export interface DeveloperApiUsageDto {
  id: string;
  applicationId: string;
  organisationId?: string | null;
  apiKeyId?: string | null;
  environment: DeveloperEnvironment;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  scope?: string | null;
  requestId: string;
  timestamp: string;
}

export interface DeveloperApiLogDto {
  id: string;
  requestId: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  apiVersion: string;
  scope?: string;
}

export interface DeveloperAnalyticsSummaryDto {
  requestsToday: number;
  requestsLast7Days: number;
  requestsLast30Days: number;
  successRatePercentage: number;
  errorRatePercentage: number;
  rateLimitedRequests: number;
  averageLatencyMs: number;
  webhookDeliveriesTotal: number;
  webhookFailuresTotal: number;
  activeApiKeys: number;
  activeWebhooks: number;
  topEndpoints: { endpoint: string; count: number; errorRate: number; avgLatency: number }[];
  statusDistribution: Record<string, number>;
}

export interface DeveloperAuditLogDto {
  id: string;
  organisationId?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  action: DeveloperAuditAction;
  resource: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, any> | null;
  createdAt: string;
}

// Public API Domain DTOs
export interface PublicPaginationMeta {
  requestId: string;
  page: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

export interface PublicResponseEnvelope<T> {
  data: T;
  meta: PublicPaginationMeta;
}

export interface PublicMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  membershipStatus?: string | null;
  joinedAt: string;
}

export interface PublicClassDto {
  id: string;
  name: string;
  classType: string;
  trainerName?: string | null;
  roomName?: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  isFull: boolean;
  status: string;
}

export interface PublicBookingDto {
  id: string;
  classSessionId: string;
  memberId: string;
  status: string;
  bookedAt: string;
  className?: string;
  startsAt?: string;
}

export interface CreatePublicBookingDto {
  classSessionId: string;
  memberId: string;
}

export interface PublicMembershipPlanDto {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceMinor: number;
  currency: string;
  billingFrequency: string;
  status: string;
}

export interface PublicTrainerDto {
  id: string;
  name: string;
  bio?: string | null;
  specialties: string[];
  status: string;
}

export interface PublicAttendanceRecordDto {
  id: string;
  memberId: string;
  classSessionId?: string | null;
  status: string;
  checkInMethod: string;
  checkedInAt: string;
}
