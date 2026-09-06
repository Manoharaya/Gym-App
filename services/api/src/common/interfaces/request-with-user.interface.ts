import { Request } from 'express';

export interface AuthenticatedUserRole {
  role: string;
  organisationId: string;
  outletId?: string | null;
}

export interface AuthenticatedUserPermission {
  resource: string;
  action: string;
  scope: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  status: string;
  roles: AuthenticatedUserRole[];
  permissions: AuthenticatedUserPermission[];
  primaryOrganisationId?: string;
  primaryOutletId?: string | null;
  isSuperAdmin: boolean;
}

export interface TenantContext {
  organisationId?: string;
  outletId?: string;
}

export interface RequestWithUser extends Request {
  requestId: string;
  user?: AuthenticatedUser;
  tenantContext?: TenantContext;
}
