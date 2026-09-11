import { ForbiddenException, Injectable } from '@nestjs/common';
import { BusinessBiRequestUser, ResolvedBiScope } from '../../business-intelligence/domain/business-intelligence.permissions';

export interface ResolvedMultiOutletScope extends ResolvedBiScope {
  isSingleOutletRestricted: boolean;
  authorizedOutletIds: string[];
}

@Injectable()
export class OutletIntelligencePermissionService {
  /**
   * Resolves authoritative multi-outlet query scope with strict RBAC & IDOR defenses.
   */
  static resolveScope(
    user: BusinessBiRequestUser,
    requestedOutletId?: string,
    requestedOutletIds?: string[],
  ): ResolvedMultiOutletScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access Multi-Outlet Intelligence.');
    }

    const roles = (user.roles || [user.role || 'MEMBER']).map((r) => r.toUpperCase());

    // 1. Members are strictly forbidden
    if (roles.includes('MEMBER') && !roles.some((r) => r !== 'MEMBER')) {
      throw new ForbiddenException('Members are not permitted to access multi-outlet intelligence.');
    }

    // 2. Trainers are strictly forbidden from executive intelligence
    if (roles.includes('TRAINER') && !roles.some((r) => ['ORGANISATION_OWNER', 'ORGANISATION_ADMIN', 'SUPER_ADMIN'].includes(r))) {
      throw new ForbiddenException('Trainers are not permitted to access executive multi-outlet intelligence.');
    }

    // 3. Super Admin
    if (roles.includes('SUPER_ADMIN')) {
      return {
        organisationId: user.organisationId || 'all',
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'PLATFORM',
        userRole: 'SUPER_ADMIN',
        allowedOutlets: requestedOutletIds || (requestedOutletId ? [requestedOutletId] : []),
        isSingleOutletRestricted: false,
        authorizedOutletIds: requestedOutletIds || (requestedOutletId ? [requestedOutletId] : []),
      };
    }

    const orgId = user.organisationId;
    if (!orgId) {
      throw new ForbiddenException('User is not associated with an active organisation.');
    }

    // 4. Organisation Owner / Admin / Finance Manager
    if (
      roles.includes('ORGANISATION_OWNER') ||
      roles.includes('ORGANISATION_ADMIN') ||
      roles.includes('FINANCE_MANAGER')
    ) {
      return {
        organisationId: orgId,
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
        userRole: roles[0],
        allowedOutlets: requestedOutletIds || (requestedOutletId ? [requestedOutletId] : []),
        isSingleOutletRestricted: false,
        authorizedOutletIds: requestedOutletIds || (requestedOutletId ? [requestedOutletId] : []),
      };
    }

    // 5. Outlet Manager / Staff (Scoped strictly to assigned outlet)
    if (roles.includes('OUTLET_MANAGER') || roles.includes('STAFF')) {
      const userOutletId = user.outletId || (user.outletIds && user.outletIds[0]);
      if (!userOutletId) {
        throw new ForbiddenException('Staff/Manager must be assigned to an outlet.');
      }

      // IDOR Defense: If client requests a different outlet, immediately block
      if (requestedOutletId && requestedOutletId !== userOutletId) {
        throw new ForbiddenException('Access denied: You are not authorized to view intelligence for other outlets.');
      }

      if (requestedOutletIds && requestedOutletIds.some((id) => id !== userOutletId)) {
        throw new ForbiddenException('Access denied: Cross-outlet benchmarking is restricted to organisation executives.');
      }

      return {
        organisationId: orgId,
        outletId: userOutletId,
        roleScope: 'OUTLET',
        userRole: 'OUTLET_MANAGER',
        allowedOutlets: [userOutletId],
        isSingleOutletRestricted: true,
        authorizedOutletIds: [userOutletId],
      };
    }

    throw new ForbiddenException('User lacks sufficient permissions for multi-outlet intelligence.');
  }

  /**
   * Asserts whether a user can access an individual outlet.
   */
  static assertCanAccessOutlet(user: BusinessBiRequestUser, outletId: string): void {
    const scope = this.resolveScope(user, outletId);
    if (scope.isSingleOutletRestricted && scope.outletId !== outletId) {
      throw new ForbiddenException('Access denied: You are not authorized to view intelligence for this outlet.');
    }
  }
}
