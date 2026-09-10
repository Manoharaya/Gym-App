/**
 * FitCore — Day 42: Recurring Billing & Collections Permissions & Scope Resolver
 */

import { ForbiddenException } from '@nestjs/common';

export type BillingRoleScope = 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'SELF';

export interface BillingRequestUser {
  id: string;
  organisationId?: string;
  outletId?: string;
  outletIds?: string[];
  roles?: string[];
  role?: string;
  memberProfileId?: string;
  isSuperAdmin?: boolean;
}

export interface ResolvedBillingScope {
  organisationId: string;
  outletId?: string;
  roleScope: BillingRoleScope;
  memberProfileId?: string;
}

export class RecurringBillingPermissions {
  /**
   * Resolves the billing scope for an administrative request.
   * Prohibits MEMBER and TRAINER roles from administrative billing endpoints.
   */
  static resolveAdminScope(
    user: BillingRequestUser,
    requestedOutletId?: string,
  ): ResolvedBillingScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access recurring billing.');
    }

    const roles: string[] = (
      user.roles && user.roles.length > 0 ? user.roles : [user.role || 'MEMBER']
    ).map((r: any) => (typeof r === 'string' ? r : r.role || 'MEMBER').toUpperCase());

    // 1. MEMBER is strictly forbidden from administrative billing
    if (
      roles.includes('MEMBER') &&
      !roles.some((r) =>
        ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE', 'OUTLET_MANAGER', 'RECEPTION'].includes(r),
      )
    ) {
      throw new ForbiddenException('Member role is not authorized to access administrative billing');
    }

    // 2. TRAINER is strictly forbidden from administrative billing & collections
    if (
      roles.includes('TRAINER') &&
      !roles.some((r) =>
        ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE', 'OUTLET_MANAGER'].includes(r),
      )
    ) {
      throw new ForbiddenException('Trainer role is not authorized to access billing or collections');
    }

    const orgId = user.organisationId;
    if (!orgId && !roles.includes('SUPERADMIN') && !user.isSuperAdmin) {
      throw new ForbiddenException('User is not associated with an organisation');
    }

    // 3. Outlet Manager Scope validation
    const isOutletManagerOnly =
      (roles.includes('OUTLET_MANAGER') || roles.includes('RECEPTION')) &&
      !roles.some((r) => ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE'].includes(r));

    if (isOutletManagerOnly) {
      const allowedOutletIds: string[] = Array.from(
        new Set([
          ...(user.outletIds || []),
          ...(user.outletId ? [user.outletId] : []),
        ]),
      );

      if (requestedOutletId && allowedOutletIds.length > 0 && !allowedOutletIds.includes(requestedOutletId)) {
        throw new ForbiddenException(
          `User is not authorized to manage billing for outlet '${requestedOutletId}'`,
        );
      }

      return {
        organisationId: orgId || 'default-org',
        outletId: requestedOutletId || allowedOutletIds[0],
        roleScope: 'OUTLET',
      };
    }

    // 4. Superadmin / Platform scope
    if (roles.includes('SUPERADMIN') || (user.isSuperAdmin && !roles.includes('ORGANISATION_OWNER') && !roles.includes('OUTLET_MANAGER'))) {
      return {
        organisationId: orgId || 'default-org',
        outletId: requestedOutletId,
        roleScope: 'PLATFORM',
      };
    }

    // 5. Organisation Owner / Admin / Finance scope
    return {
      organisationId: orgId || 'default-org',
      outletId: requestedOutletId,
      roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
    };
  }

  /**
   * Resolves the member scope for self-billing endpoints.
   */
  static resolveMemberScope(user: BillingRequestUser): ResolvedBillingScope {
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    return {
      organisationId: user.organisationId || 'unknown',
      roleScope: 'SELF',
      memberProfileId: user.memberProfileId || user.id,
    };
  }
}
