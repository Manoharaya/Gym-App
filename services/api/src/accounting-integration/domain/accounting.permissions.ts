/**
 * FitCore — Day 43: Accounting Permissions & Scope Resolver
 */

import { ForbiddenException } from '@nestjs/common';

export type AccountingRoleScope = 'PLATFORM' | 'ORGANISATION' | 'OUTLET';

export interface AccountingRequestUser {
  id: string;
  organisationId?: string;
  outletId?: string;
  outletIds?: string[];
  roles?: string[];
  role?: string;
  isSuperAdmin?: boolean;
}

export interface ResolvedAccountingScope {
  organisationId: string;
  outletId?: string;
  roleScope: AccountingRoleScope;
}

export class AccountingPermissions {
  /**
   * Resolves scope for administrative accounting operations.
   * Strictly prohibits MEMBER, TRAINER, and unauthorized staff.
   */
  static resolveScope(
    user: AccountingRequestUser,
    requestedOutletId?: string,
  ): ResolvedAccountingScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access accounting integration');
    }

    const roles: string[] = (
      user.roles && user.roles.length > 0 ? user.roles : [user.role || 'MEMBER']
    ).map((r: any) => (typeof r === 'string' ? r : r.role || 'MEMBER').toUpperCase());

    // 1. MEMBER is strictly forbidden
    if (
      roles.includes('MEMBER') &&
      !roles.some((r) =>
        ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE'].includes(r),
      )
    ) {
      throw new ForbiddenException('Member role is not authorized to access accounting');
    }

    // 2. TRAINER is strictly forbidden
    if (
      roles.includes('TRAINER') &&
      !roles.some((r) =>
        ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE'].includes(r),
      )
    ) {
      throw new ForbiddenException('Trainer role is not authorized to access accounting');
    }

    // 3. RECEPTION is strictly forbidden from accounting configuration
    if (
      roles.includes('RECEPTION') &&
      !roles.some((r) =>
        ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE'].includes(r),
      )
    ) {
      throw new ForbiddenException('Reception role is not authorized to access accounting');
    }

    const orgId = user.organisationId;
    if (!orgId && !roles.includes('SUPERADMIN') && !user.isSuperAdmin) {
      throw new ForbiddenException('User is not associated with an organisation');
    }

    // 4. Outlet Manager validation
    const isOutletManagerOnly =
      roles.includes('OUTLET_MANAGER') &&
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
          `User is not authorized to view accounting for outlet '${requestedOutletId}'`,
        );
      }

      return {
        organisationId: orgId || 'default-org',
        outletId: requestedOutletId || allowedOutletIds[0],
        roleScope: 'OUTLET',
      };
    }

    // 5. SuperAdmin / Platform scope
    if (roles.includes('SUPERADMIN') || (user.isSuperAdmin && !roles.includes('ORGANISATION_OWNER') && !roles.includes('OUTLET_MANAGER'))) {
      return {
        organisationId: orgId || 'default-org',
        outletId: requestedOutletId,
        roleScope: 'PLATFORM',
      };
    }

    // 6. Organisation Owner / Admin / Finance scope
    return {
      organisationId: orgId || 'default-org',
      outletId: requestedOutletId,
      roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
    };
  }

  /**
   * Asserts user has permission to configure accounting connections and mappings.
   */
  static assertCanConfigure(user: AccountingRequestUser): void {
    const roles: string[] = (
      user.roles && user.roles.length > 0 ? user.roles : [user.role || 'MEMBER']
    ).map((r: any) => (typeof r === 'string' ? r : r.role || 'MEMBER').toUpperCase());

    const isAllowed = roles.some((r) =>
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OWNER', 'ADMIN', 'FINANCE'].includes(r),
    ) || user.isSuperAdmin;

    if (!isAllowed) {
      throw new ForbiddenException('Insufficient permissions to configure accounting connections');
    }
  }
}
