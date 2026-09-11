import { ForbiddenException } from '@nestjs/common';

export interface BusinessBiRequestUser {
  id: string;
  organisationId?: string;
  outletId?: string;
  outletIds?: string[];
  roles?: string[];
  role?: string;
  memberProfileId?: string;
}

export interface ResolvedBiScope {
  organisationId: string;
  outletId?: string;
  roleScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET';
  userRole: string;
  allowedOutlets: string[];
}

export class BusinessIntelligencePermissions {
  /**
   * Resolves the authoritative query scope server-side based on authenticated user context.
   * Client-supplied organisationId and outletId are strictly validated against permissions.
   */
  static resolveScope(
    user: BusinessBiRequestUser,
    requestedOutletId?: string,
  ): ResolvedBiScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access Business Intelligence.');
    }

    const roles = (user.roles || [user.role || 'MEMBER']).map((r) => r.toUpperCase());

    // 1. Members are strictly forbidden from organizational Business Intelligence
    if (roles.includes('MEMBER') && !roles.some((r) => r !== 'MEMBER')) {
      throw new ForbiddenException('Members are not permitted to access executive business intelligence.');
    }

    // 2. Trainers are strictly forbidden from executive/financial Business Intelligence
    if (
      roles.includes('TRAINER') &&
      !roles.some((r) => ['SUPERADMIN', 'ORGANISATION_OWNER', 'FINANCE', 'OUTLET_MANAGER'].includes(r))
    ) {
      throw new ForbiddenException('Trainer role is not permitted to view executive business intelligence.');
    }

    const organisationId = user.organisationId;
    if (!organisationId && !roles.includes('SUPERADMIN')) {
      throw new ForbiddenException('User is not associated with an active organisation.');
    }

    // 3. Superadmin: Platform Scope
    if (roles.includes('SUPERADMIN')) {
      return {
        organisationId: organisationId || 'all',
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'PLATFORM',
        userRole: 'SUPERADMIN',
        allowedOutlets: requestedOutletId ? [requestedOutletId] : [],
      };
    }

    // 4. Organisation Owner & Finance Roles: Full Organisation Scope
    if (roles.includes('ORGANISATION_OWNER') || roles.includes('FINANCE')) {
      return {
        organisationId: organisationId!,
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
        userRole: roles.includes('ORGANISATION_OWNER') ? 'ORGANISATION_OWNER' : 'FINANCE',
        allowedOutlets: requestedOutletId ? [requestedOutletId] : [],
      };
    }

    // 5. Outlet Manager: Scoped strictly to their assigned outlet(s)
    if (roles.includes('OUTLET_MANAGER')) {
      const allowedOutlets =
        user.outletIds && user.outletIds.length > 0
          ? user.outletIds
          : user.outletId
          ? [user.outletId]
          : [];

      if (allowedOutlets.length === 0) {
        throw new ForbiddenException('Outlet Manager is not assigned to any active outlet.');
      }

      if (requestedOutletId && !allowedOutlets.includes(requestedOutletId)) {
        throw new ForbiddenException(
          `Access denied: You are not authorized to view metrics for outlet ${requestedOutletId}.`,
        );
      }

      return {
        organisationId: organisationId!,
        outletId: requestedOutletId || allowedOutlets[0],
        roleScope: 'OUTLET',
        userRole: 'OUTLET_MANAGER',
        allowedOutlets,
      };
    }

    // 6. Receptionist: Limited scope to assigned outlet
    if (roles.includes('RECEPTION')) {
      const allowedOutlet = user.outletId;
      if (!allowedOutlet) {
        throw new ForbiddenException('Receptionist is not assigned to an outlet.');
      }

      if (requestedOutletId && requestedOutletId !== allowedOutlet) {
        throw new ForbiddenException(
          `Access denied: Reception role can only view assigned outlet ${allowedOutlet}.`,
        );
      }

      return {
        organisationId: organisationId!,
        outletId: allowedOutlet,
        roleScope: 'OUTLET',
        userRole: 'RECEPTION',
        allowedOutlets: [allowedOutlet],
      };
    }

    throw new ForbiddenException('User role is not authorized for business intelligence.');
  }

  /**
   * Validates if a user is authorized to view a specific domain.
   */
  static isDomainAuthorized(userRole: string, domain: string): boolean {
    const role = userRole.toUpperCase();
    if (['SUPERADMIN', 'ORGANISATION_OWNER', 'FINANCE'].includes(role)) {
      return true;
    }
    if (role === 'OUTLET_MANAGER') {
      return true; // Outlet manager can view all domains within their outlet
    }
    if (role === 'RECEPTION') {
      // Reception can view operational domains, but not deep executive finance or AI cost
      return ['ATTENDANCE', 'BOOKING', 'MEMBERSHIP', 'COMMUNICATION', 'OPERATIONS'].includes(domain);
    }
    return false;
  }
}
