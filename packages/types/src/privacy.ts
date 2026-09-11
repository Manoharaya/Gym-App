/**
 * FitCore — Day 53: Privacy & Compliance Center Types & Interfaces
 */

export type PrivacyDataCategory =
  | 'IDENTITY'
  | 'CONTACT'
  | 'PROFILE'
  | 'HEALTH'
  | 'MEDICAL_DOCUMENT'
  | 'FITNESS'
  | 'TRAINING'
  | 'NUTRITION'
  | 'WEARABLE'
  | 'ATTENDANCE'
  | 'BOOKING'
  | 'MEMBERSHIP'
  | 'PAYMENT'
  | 'FINANCIAL'
  | 'COMMUNICATION'
  | 'AI_INTERACTION'
  | 'ENGAGEMENT'
  | 'RETENTION'
  | 'SECURITY'
  | 'DEVICE'
  | 'AUDIT'
  | 'DOCUMENT'
  | 'CONSENT'
  | 'MARKETING';

export type PrivacyDataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'HIGHLY_SENSITIVE';

export type PrivacyDataPurpose =
  | 'ACCOUNT_MANAGEMENT'
  | 'MEMBERSHIP_MANAGEMENT'
  | 'BOOKING'
  | 'ACCESS_CONTROL'
  | 'TRAINING'
  | 'NUTRITION'
  | 'HEALTH_SCREENING'
  | 'WEARABLE_SYNC'
  | 'COMMUNICATION'
  | 'PAYMENT_PROCESSING'
  | 'SECURITY'
  | 'LEGAL_COMPLIANCE'
  | 'CUSTOMER_SUPPORT'
  | 'AI_PERSONALIZATION'
  | 'ANALYTICS'
  | 'MARKETING';

export type PrivacyRequestType =
  | 'ACCESS'
  | 'EXPORT'
  | 'CORRECTION'
  | 'DELETION'
  | 'RESTRICTION'
  | 'CONSENT_WITHDRAWAL'
  | 'OTHER';

export type PrivacyRequestStatus =
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'IDENTITY_VERIFICATION_REQUIRED'
  | 'VERIFICATION_PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'WAITING_FOR_REVIEW'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export type PrivacyExportFormat = 'JSON' | 'CSV' | 'PDF_SUMMARY';

export type PrivacyExportJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type DeletionStrategyAction =
  | 'DELETE'
  | 'ANONYMIZE'
  | 'RETAIN'
  | 'RESTRICT'
  | 'ARCHIVE'
  | 'SKIP';

export type DeletionItemStatus =
  | 'PENDING'
  | 'DELETED'
  | 'ANONYMIZED'
  | 'RETAINED'
  | 'RESTRICTED'
  | 'SKIPPED'
  | 'FAILED'
  | 'REQUIRES_REVIEW';

export type RetentionAction =
  | 'DELETE'
  | 'ANONYMIZE'
  | 'ARCHIVE'
  | 'RESTRICT'
  | 'REVIEW';

export type PrivacyHoldStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED';

export type MemberPrivacyRestrictionStatus = 'NONE' | 'RESTRICTED' | 'UNDER_REVIEW';

export type PrivacyDecision =
  | 'ALLOWED'
  | 'DENIED'
  | 'REQUIRES_CONSENT'
  | 'REQUIRES_VERIFICATION'
  | 'REQUIRES_REVIEW'
  | 'REQUIRES_RETENTION'
  | 'RESTRICTED'
  | 'UNKNOWN';

export type PrivacyProcessorCategory =
  | 'AI_PROVIDER'
  | 'PAYMENT_PROVIDER'
  | 'COMMUNICATION_PROVIDER'
  | 'WEARABLE_PROVIDER'
  | 'ACCOUNTING_PROVIDER'
  | 'CLOUD_STORAGE';

// --- Interfaces & DTOs ---

export interface PrivacyDataAssetDto {
  id: string;
  organisationId?: string | null;
  category: PrivacyDataCategory;
  domain: string;
  entity: string;
  fieldPath?: string | null;
  classification: PrivacyDataClassification;
  purpose: PrivacyDataPurpose;
  source: string;
  storageLocation: string;
  retentionPolicy: string;
  deletionPolicy: DeletionStrategyAction;
  exportable: boolean;
  deletable: boolean;
  requiresConsent: boolean;
  sensitive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyPreferenceDto {
  id?: string;
  memberId: string;
  organisationId: string;
  aiPersonalization: boolean;
  analytics: boolean;
  marketing: boolean;
  wearables: boolean;
  dataSharing: boolean;
  personalization: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrivacyRequestDto {
  id: string;
  organisationId: string;
  requesterUserId: string;
  memberId?: string | null;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  reason?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrivacyRequestDto {
  type: PrivacyRequestType;
  reason?: string;
  metadata?: Record<string, any>;
  stepUpToken?: string;
}

export interface PrivacyExportResponseDto {
  id: string;
  privacyRequestId?: string | null;
  organisationId: string;
  memberId: string;
  status: PrivacyExportJobStatus;
  formats: PrivacyExportFormat[];
  downloadUrl?: string | null;
  downloadExpiresAt?: string | null;
  fileSizeBytes?: number | null;
  errorReason?: string | null;
  createdAt: string;
}

export interface PrivacyDeletionItemDto {
  id: string;
  domain: string;
  entity: string;
  action: DeletionStrategyAction;
  status: DeletionItemStatus;
  retentionReason?: string | null;
  recordsAffected: number;
  executedAt?: string | null;
  errorMessage?: string | null;
}

export interface PrivacyDeletionPlanDto {
  id: string;
  privacyRequestId?: string | null;
  organisationId: string;
  memberId: string;
  status: string;
  requiresReview: boolean;
  reviewReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  executedAt?: string | null;
  completedAt?: string | null;
  items: PrivacyDeletionItemDto[];
  createdAt: string;
}

export interface PrivacyRetentionPolicyDto {
  id: string;
  organisationId?: string | null;
  dataCategory: PrivacyDataCategory;
  name: string;
  retentionPeriodDays: number;
  action: RetentionAction;
  legalHold: boolean;
  enabled: boolean;
  effectiveAt: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyRetentionHoldDto {
  id: string;
  organisationId: string;
  memberId?: string | null;
  dataCategory: string;
  reason: string;
  status: PrivacyHoldStatus;
  createdBy: string;
  releasedBy?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

export interface PrivacyProcessorDto {
  id: string;
  organisationId?: string | null;
  name: string;
  category: PrivacyProcessorCategory;
  purpose: string;
  dataCategories: PrivacyDataCategory[];
  status: string;
  privacyPolicyReference?: string | null;
  dataRegion?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyOverviewDto {
  memberId: string;
  organisationId?: string;
  totalDataCategoriesCount?: number;
  preferences?: PrivacyPreferenceDto;
  dataCategoriesSummary: {
    category: PrivacyDataCategory;
    title: string;
    description: string;
    itemCount: number;
    lastUpdated?: string;
  }[];
  activeConsentsCount: number;
  privacyPreferences: PrivacyPreferenceDto;
  pendingRequestsCount: number;
  restrictionStatus: MemberPrivacyRestrictionStatus;
}

export interface PrivacyQualityReportDto {
  status: 'HEALTHY' | 'WARNING' | 'ACTION_REQUIRED' | 'CRITICAL';
  totalAssetsCataloged: number;
  unclassifiedAssetsCount: number;
  missingRetentionCount: number;
  activeHoldsCount: number;
  pendingReviewDeletionsCount: number;
  staleExportsCount: number;
  issues: string[];
}
