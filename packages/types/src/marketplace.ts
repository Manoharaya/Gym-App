/**
 * FitCore — Day 50: Marketplace Foundation Shared Types
 */

import { ApiScope } from './developer-platform';

export type MarketplaceListingType =
  | 'APP'
  | 'INTEGRATION'
  | 'AI_AGENT'
  | 'TRAINER'
  | 'PROGRAM'
  | 'SERVICE'
  | 'CONTENT'
  | 'OTHER';

export type MarketplacePublisherType =
  | 'FITCORE'
  | 'ORGANISATION'
  | 'DEVELOPER'
  | 'PARTNER'
  | 'TRAINER';

export type MarketplaceListingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type MarketplaceListingVisibility =
  | 'PUBLIC'
  | 'ORGANISATION_ONLY'
  | 'PRIVATE'
  | 'UNLISTED';

export type MarketplaceInstallationStatus =
  | 'PENDING'
  | 'AWAITING_APPROVAL'
  | 'INSTALLING'
  | 'CONFIGURATION_REQUIRED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ERROR'
  | 'DISABLED'
  | 'UNINSTALLED';

export type MarketplaceInstallationScope = 'ORGANISATION' | 'OUTLET';

export type MarketplacePermissionStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED';

export type MarketplacePricingType =
  | 'FREE'
  | 'PAID'
  | 'SUBSCRIPTION'
  | 'USAGE_BASED'
  | 'CONTACT_SALES';

export type MarketplaceReviewStatus =
  | 'PUBLISHED'
  | 'PENDING_MODERATION'
  | 'HIDDEN'
  | 'REMOVED';

export type MarketplaceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'ERROR'
  | 'DISABLED';

export type MarketplaceDependencyStatus =
  | 'SATISFIED'
  | 'MISSING'
  | 'INCOMPATIBLE'
  | 'DISABLED';

export interface MarketplaceCategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentCategoryId?: string | null;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  subcategories?: MarketplaceCategoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentCategoryId?: string;
  displayOrder?: number;
}

export interface MarketplaceDependencyDto {
  type: 'INTEGRATION' | 'AI_FEATURE' | 'APP' | 'PERMISSION';
  key: string;
  name: string;
  required: boolean;
  minVersion?: string;
  description?: string;
  status?: MarketplaceDependencyStatus;
}

export interface MarketplaceListingVersionDto {
  id: string;
  listingId: string;
  version: string;
  status: MarketplaceListingStatus;
  releaseNotes?: string | null;
  description?: string | null;
  configurationSchema?: Record<string, any> | null;
  permissionRequirements?: {
    requiredScopes: ApiScope[];
    optionalScopes?: ApiScope[];
    dataAccessDescription?: string;
  } | null;
  capabilities: string[];
  compatibility?: {
    minFitCoreVersion?: string;
    maxFitCoreVersion?: string;
    supportedScopes?: MarketplaceInstallationScope[];
    supportedEnvironments?: string[];
    dependencies?: MarketplaceDependencyDto[];
  } | null;
  documentationUrl?: string | null;
  supportUrl?: string | null;
  privacyPolicyUrl?: string | null;
  termsUrl?: string | null;
  isBreakingChange: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceListingVersionDto {
  version: string;
  releaseNotes?: string;
  description?: string;
  configurationSchema?: Record<string, any>;
  permissionRequirements?: {
    requiredScopes: ApiScope[];
    optionalScopes?: ApiScope[];
    dataAccessDescription?: string;
  };
  capabilities?: string[];
  compatibility?: {
    minFitCoreVersion?: string;
    maxFitCoreVersion?: string;
    supportedScopes?: MarketplaceInstallationScope[];
    supportedEnvironments?: string[];
    dependencies?: MarketplaceDependencyDto[];
  };
  documentationUrl?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  isBreakingChange?: boolean;
}

export interface MarketplaceListingDto {
  id: string;
  organisationId?: string | null;
  publisherType: MarketplacePublisherType;
  publisherId: string;
  publisherName?: string;
  listingType: MarketplaceListingType;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  categoryId: string;
  category?: MarketplaceCategoryDto;
  status: MarketplaceListingStatus;
  visibility: MarketplaceListingVisibility;
  version: string;
  currentVersionId?: string | null;
  currentVersion?: MarketplaceListingVersionDto;
  developerApplicationId?: string | null;
  integrationProviderId?: string | null;
  aiFeatureKey?: string | null;
  trainerProfileId?: string | null;
  programId?: string | null;
  serviceDefinitionId?: string | null;
  pricingType: MarketplacePricingType;
  pricingDetails?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  averageRating: number;
  reviewCount: number;
  installCount: number;
  featured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceListingDto {
  organisationId?: string;
  publisherType: MarketplacePublisherType;
  listingType: MarketplaceListingType;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  categoryId: string;
  visibility?: MarketplaceListingVisibility;
  initialVersion: string;
  developerApplicationId?: string;
  integrationProviderId?: string;
  aiFeatureKey?: string;
  trainerProfileId?: string;
  programId?: string;
  serviceDefinitionId?: string;
  pricingType?: MarketplacePricingType;
  pricingDetails?: Record<string, any>;
  metadata?: Record<string, any>;
  capabilities?: string[];
  requiredScopes?: ApiScope[];
  optionalScopes?: ApiScope[];
  configurationSchema?: Record<string, any>;
  documentationUrl?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
}

export interface UpdateMarketplaceListingDto {
  name?: string;
  shortDescription?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  categoryId?: string;
  visibility?: MarketplaceListingVisibility;
  pricingType?: MarketplacePricingType;
  pricingDetails?: Record<string, any>;
  metadata?: Record<string, any>;
  featured?: boolean;
}

export interface MarketplaceInstallationDto {
  id: string;
  listingId: string;
  listing?: MarketplaceListingDto;
  listingVersionId: string;
  listingVersion?: MarketplaceListingVersionDto;
  organisationId: string;
  outletId?: string | null;
  installedByUserId: string;
  scope: MarketplaceInstallationScope;
  status: MarketplaceInstallationStatus;
  healthStatus: MarketplaceHealthStatus;
  configuration?: Record<string, any> | null;
  permissionGrant?: MarketplacePermissionGrantDto | null;
  lastHealthCheckAt?: string | null;
  lastError?: string | null;
  failureCount: number;
  installedAt: string;
  activatedAt?: string | null;
  disabledAt?: string | null;
  uninstalledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceInstallationDto {
  listingId: string;
  listingVersionId?: string;
  outletId?: string;
  scope?: MarketplaceInstallationScope;
  configuration?: Record<string, any>;
}

export interface ConfigureMarketplaceInstallationDto {
  configuration: Record<string, any>;
}

export interface MarketplacePermissionGrantDto {
  id: string;
  installationId: string;
  organisationId: string;
  outletId?: string | null;
  requestedScopes: ApiScope[];
  approvedScopes: ApiScope[];
  status: MarketplacePermissionStatus;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveMarketplacePermissionsDto {
  approvedScopes: ApiScope[];
}

export interface MarketplaceReviewDto {
  id: string;
  listingId: string;
  installationId?: string | null;
  organisationId: string;
  organisationName?: string;
  userId: string;
  authorName?: string;
  rating: number; // 1-5
  title?: string | null;
  review?: string | null;
  status: MarketplaceReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceReviewDto {
  rating: number;
  title?: string;
  review?: string;
}

export interface ModerateMarketplaceReviewDto {
  status: MarketplaceReviewStatus;
  reason?: string;
}

export interface MarketplaceInstallationValidationResultDto {
  valid: boolean;
  status:
    | 'READY'
    | 'REQUIRES_CONFIGURATION'
    | 'REQUIRES_PERMISSION'
    | 'REQUIRES_INTEGRATION'
    | 'INCOMPATIBLE'
    | 'ALREADY_INSTALLED'
    | 'BLOCKED';
  issues: string[];
  missingDependencies: MarketplaceDependencyDto[];
  conflicts: string[];
  requiredScopes: ApiScope[];
  optionalScopes: ApiScope[];
  configurationRequired: boolean;
}

export interface MarketplaceListingQueryDto {
  search?: string;
  categoryId?: string;
  listingType?: MarketplaceListingType;
  publisherType?: MarketplacePublisherType;
  pricingType?: MarketplacePricingType;
  featured?: boolean;
  installedOnly?: boolean;
  outletId?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceAnalyticsSummaryDto {
  listingId: string;
  totalViews: number;
  totalSearches: number;
  totalInstallations: number;
  activeInstallations: number;
  averageRating: number;
  totalReviews: number;
}
