/**
 * FitCore — Day 51: Enterprise Administration Types
 */

import { UserRole } from './roles-permissions';

export type EnterpriseScopeType =
  | 'PLATFORM'
  | 'ORGANISATION'
  | 'BRAND'
  | 'REGION'
  | 'OUTLET';

export type EnterpriseRoleAssignmentStatus =
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'REVOKED';

export type EnterprisePolicyCategory =
  | 'SECURITY'
  | 'ACCESS'
  | 'BOOKING'
  | 'MEMBERSHIP'
  | 'COMMUNICATION'
  | 'AI'
  | 'PRIVACY'
  | 'DATA_RETENTION'
  | 'INTEGRATION'
  | 'MARKETPLACE'
  | 'STAFF'
  | 'TRAINING'
  | 'NUTRITION'
  | 'REPORTING'
  | 'BRANDING';

export type EnterprisePolicyStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'DISABLED';

export type CustomDomainStatus =
  | 'PENDING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'FAILED'
  | 'DISABLED';

export type CustomDomainVerificationMethod = 'DNS_TXT' | 'DNS_CNAME';

export type SslStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'ERROR';

export type StaffAssignmentType =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'TEMPORARY'
  | 'REGIONAL';

export type OutletLifecycleStatus =
  | 'ACTIVE'
  | 'TEMPORARILY_CLOSED'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'ARCHIVED';

// =========================================================================
// BRAND DTOS & INTERFACES
// =========================================================================

export interface OrganisationBrandDto {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryDomain?: string | null;
  defaultLocale: string;
  defaultTimezone: string;
  defaultCurrency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDto {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryDomain?: string;
  defaultLocale?: string;
  defaultTimezone?: string;
  defaultCurrency?: string;
}

export interface UpdateBrandDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryDomain?: string;
  defaultLocale?: string;
  defaultTimezone?: string;
  defaultCurrency?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'ARCHIVED';
}

// =========================================================================
// OUTLET ADMINISTRATION DTOS
// =========================================================================

export interface EnterpriseOutletDto {
  id: string;
  organisationId: string;
  brandId?: string | null;
  managerUserId?: string | null;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
  currency: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status: OutletLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnterpriseOutletDto {
  brandId?: string;
  managerUserId?: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  timezone?: string;
  currency?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface UpdateEnterpriseOutletDto {
  brandId?: string;
  managerUserId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  currency?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: OutletLifecycleStatus;
}

// =========================================================================
// SCOPED ROLES & ASSIGNMENTS
// =========================================================================

export interface EnterpriseRoleAssignmentDto {
  id: string;
  userId: string;
  organisationId: string;
  roleId: string;
  roleName: UserRole;
  scopeType: EnterpriseScopeType;
  scopeId?: string | null;
  startAt: Date;
  endAt?: Date | null;
  status: EnterpriseRoleAssignmentStatus;
  assignedById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignEnterpriseRoleDto {
  userId: string;
  roleName: UserRole;
  scopeType: EnterpriseScopeType;
  scopeId?: string;
  startAt?: Date | string;
  endAt?: Date | string;
}

export interface UpdateEnterpriseRoleAssignmentDto {
  status?: EnterpriseRoleAssignmentStatus;
  endAt?: Date | string;
}

// =========================================================================
// POLICIES & SIMULATOR
// =========================================================================

export interface EnterprisePolicyDto {
  id: string;
  organisationId: string;
  scopeType: EnterpriseScopeType;
  scopeId?: string | null;
  policyCategory: EnterprisePolicyCategory;
  policyKey: string;
  value: any;
  version: number;
  status: EnterprisePolicyStatus;
  isHardCeiling: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetEnterprisePolicyDto {
  scopeType: EnterpriseScopeType;
  scopeId?: string;
  policyCategory: EnterprisePolicyCategory;
  policyKey: string;
  value: any;
  isHardCeiling?: boolean;
  effectiveFrom?: Date | string;
  effectiveUntil?: Date | string;
  reason?: string;
}

export interface ResolvedEffectivePolicyDto {
  policyKey: string;
  category: EnterprisePolicyCategory;
  effectiveValue: any;
  sourceScope: EnterpriseScopeType;
  sourceId?: string | null;
  policyVersion: number;
  isHardCeilingEnforced: boolean;
  inheritedFrom?: EnterpriseScopeType | null;
  effectiveAt: Date;
}

export interface PolicySimulationRequestDto {
  brandId?: string;
  outletId?: string;
  roleName?: UserRole;
}

export interface PolicySimulationResultDto {
  organisationId: string;
  brandId?: string | null;
  outletId?: string | null;
  roleName?: UserRole | null;
  effectivePolicies: Record<string, ResolvedEffectivePolicyDto>;
  effectiveFeatures: Record<string, boolean>;
  aiGovernance: {
    aiEnabled: boolean;
    allowedFeatures: string[];
    requireHumanApproval: boolean;
    maxDailyRequests?: number;
  };
  communicationGovernance: {
    smsAllowed: boolean;
    whatsappAllowed: boolean;
    marketingAllowed: boolean;
    quietHours?: string;
  };
}

// =========================================================================
// BRANDING
// =========================================================================

export interface EnterpriseBrandingDto {
  id: string;
  organisationId: string;
  brandId?: string | null;
  outletId?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  emailBranding?: Record<string, any> | null;
  appName?: string | null;
  displayName?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetEnterpriseBrandingDto {
  brandId?: string;
  outletId?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  emailBranding?: Record<string, any>;
  appName?: string;
  displayName?: string;
  supportEmail?: string;
  supportPhone?: string;
}

// =========================================================================
// CUSTOM DOMAINS
// =========================================================================

export interface CustomDomainDto {
  id: string;
  organisationId: string;
  brandId?: string | null;
  domain: string;
  status: CustomDomainStatus;
  verificationMethod: CustomDomainVerificationMethod;
  verificationTokenReference: string;
  verifiedAt?: Date | null;
  sslStatus: SslStatus;
  sslIssuedAt?: Date | null;
  sslExpiresAt?: Date | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomDomainDto {
  brandId?: string;
  domain: string;
  verificationMethod?: CustomDomainVerificationMethod;
}

// =========================================================================
// STAFF MULTI-OUTLET ASSIGNMENT
// =========================================================================

export interface AssignStaffOutletDto {
  staffProfileId: string;
  outletId: string;
  assignmentType?: StaffAssignmentType;
  isPrimary?: boolean;
  roleScope?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface TransferStaffOutletDto {
  staffProfileId: string;
  fromOutletId: string;
  toOutletId: string;
  isPrimary?: boolean;
  reason?: string;
}
