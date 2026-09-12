/**
 * FitCore — Day 54: Platform Superadmin & Platform Operations Types
 */

export type PlatformPermission =
  | 'platform.organisations.read'
  | 'platform.organisations.manage'
  | 'platform.users.read'
  | 'platform.usage.read'
  | 'platform.ai_usage.read'
  | 'platform.billing.read'
  | 'platform.support.manage'
  | 'platform.feature_flags.manage'
  | 'platform.configuration.manage'
  | 'platform.health.read'
  | 'platform.integrations.read'
  | 'platform.operations.execute'
  | 'platform.audit.read'
  | 'platform.security.read'
  | 'platform.privacy.read'
  | 'platform.announcements.manage';

export type PlatformAdminScope =
  | 'GLOBAL'
  | 'ORGANISATION'
  | 'OUTLET'
  | 'FUNCTIONAL';

export type OrganisationLifecycleStatus =
  | 'PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type SupportTicketStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_PLATFORM'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export type SupportTicketPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT'
  | 'CRITICAL';

export type SupportTicketCategory =
  | 'ACCOUNT'
  | 'BILLING'
  | 'PAYMENT'
  | 'BOOKING'
  | 'ACCESS'
  | 'AI'
  | 'INTEGRATION'
  | 'COMMUNICATION'
  | 'SECURITY'
  | 'PRIVACY'
  | 'DEVELOPER'
  | 'MARKETPLACE'
  | 'PERFORMANCE'
  | 'BUG'
  | 'OTHER';

export type SupportMessageVisibility =
  | 'PLATFORM'
  | 'ORGANISATION'
  | 'INTERNAL_ONLY';

export type FeatureFlagStatus = 'ENABLED' | 'DISABLED';

export type FeatureFlagRolloutStrategy =
  | 'ALL'
  | 'NONE'
  | 'SELECTED_ORGANISATIONS'
  | 'SELECTED_OUTLETS'
  | 'PERCENTAGE';

export type FeatureFlagScope = 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'USER';

export type PlatformHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'WARNING'
  | 'DOWN'
  | 'UNKNOWN';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MITIGATING'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportAccessStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REJECTED';

export type MaintenanceModeScope = 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'FEATURE';

export type DataQualityStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'ACTION_REQUIRED'
  | 'CRITICAL'
  | 'UNKNOWN';

export interface PlatformOrganisationSummary {
  id: string;
  name: string;
  slug: string;
  status: OrganisationLifecycleStatus | string;
  outletsCount: number;
  membersCount: number;
  staffCount: number;
  activeMembershipsCount: number;
  activeSubscriptionsCount: number;
  aiRequestsCount: number;
  aiEstimatedCostCents: number;
  communicationsCount: number;
  activeIntegrationsCount: number;
  developerAppsCount: number;
  marketplaceInstallationsCount: number;
  securityAlertsCount: number;
  privacyRequestsCount: number;
  platformHealthStatus: PlatformHealthStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SuspensionImpactPreview {
  organisationId: string;
  organisationName: string;
  currentStatus: string;
  activeMembers: number;
  outlets: number;
  staff: number;
  bookingsUpcoming: number;
  billingState: string;
  activeIntegrations: number;
  developerApps: number;
  marketplaceInstallations: number;
  communicationWorkflows: number;
  impactPolicyNotice: string;
}

export interface PlatformUsageSnapshotEntity {
  id: string;
  organisationId?: string | null;
  outletId?: string | null;
  metricKey: string;
  value: number;
  unit: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  dataVersion: number;
  createdAt: Date | string;
}

export interface PlatformOverviewKPIs {
  totalOrganisations: number;
  activeOrganisations: number;
  trialOrganisations: number;
  suspendedOrganisations: number;
  totalOutlets: number;
  activeMembers: number;
  activeStaff: number;
  aiRequests: number;
  aiTotalTokens: number;
  aiEstimatedCostCents: number;
  apiRequests: number;
  openSupportTickets: number;
  criticalIncidents: number;
  integrationFailures: number;
  failedJobs: number;
  timestamp: string;
}

export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  organisationId: string;
  organisationName: string;
  creatorUserId: string;
  creatorEmail: string;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  title: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  firstResponseTarget: Date | string;
  resolutionTarget: Date | string;
  slaStatus: 'WITHIN_TARGET' | 'AT_RISK' | 'OVERDUE';
  messagesCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PlatformFeatureFlagEvaluationResult {
  flagKey: string;
  enabled: boolean;
  evaluatedScope: FeatureFlagScope;
  reason: string;
}

export interface SupportAccessGrant {
  id: string;
  ticketId?: string | null;
  organisationId: string;
  organisationName: string;
  requesterUserId: string;
  requesterEmail: string;
  approverUserId?: string | null;
  approverEmail?: string | null;
  purpose: string;
  scope: PlatformAdminScope;
  status: SupportAccessStatus;
  isBreakGlass: boolean;
  stepUpVerified: boolean;
  expiresAt: Date | string;
  createdAt: Date | string;
}
