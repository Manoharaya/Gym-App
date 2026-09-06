/**
 * FitCore Multi-Tenancy Architecture
 *
 * Hierarchy:
 * Platform -> Organisation -> Outlet -> User -> Role -> Permissions
 *
 * All cross-tenant interactions are strictly prevented.
 * Data is multi-tenant scoped via organisationId, outletId, and userId.
 */

import type { UserRole } from './roles-permissions';

export interface TenantContext {
  /** Global unique identifier for the organisation */
  organisationId: string;
  /** Human-readable organisation name */
  organisationName: string;
  /** Active outlet/branch identifier, if user is bound to or currently viewing a specific outlet */
  outletId?: string;
  /** Human-readable outlet name */
  outletName?: string;
  /** Authenticated user identifier */
  userId: string;
  /** Active role assumed in this tenant session */
  role: UserRole;
  /** Tenant branding and localization preferences */
  branding?: TenantBranding;
  /** Whether this context is derived from local development seed data */
  isDevSeed?: boolean;
}

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  appName?: string;
  tagline?: string;
  currencyCode: string;
  timezone: string;
}

export interface OrganisationConfig {
  id: string;
  name: string;
  slug: string;
  legalEntityName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  outletsCount: number;
  features: {
    wearablesEnabled: boolean;
    aiCoachEnabled: boolean;
    doorAccessEnabled: boolean;
    retailEnabled: boolean;
    xeroIntegrationEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OutletConfig {
  id: string;
  organisationId: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'COMING_SOON';
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}
