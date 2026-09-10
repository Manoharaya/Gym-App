import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@fitcore/types';

export interface RequestUser {
  id: string;
  organisationId?: string;
  outletId?: string;
  outletIds?: string[];
  roles?: string[];
  role?: string;
  staffProfileId?: string;
}

export interface ResolvedSalesScope {
  organisationId: string;
  outletId?: string;
  staffId?: string;
  roleScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'STAFF';
}

export class SalesIntelligencePermissions {
  /**
   * Resolves authoritative query scope server-side based on authenticated user context.
   * Never trusts client-supplied organisationId, outletId, or staffId over user authorization.
   */
  static resolveScope(user: RequestUser, requestedOutletId?: string): ResolvedSalesScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access sales intelligence.');
    }

    const roles = (user.roles || [user.role || 'MEMBER']).map((r) => r.toUpperCase());

    // 1. Members are strictly forbidden
    if (roles.includes('MEMBER') && !roles.some((r) => r !== 'MEMBER')) {
      throw new ForbiddenException('Members are not permitted to access sales intelligence.');
    }

    const organisationId = user.organisationId;
    if (!organisationId && !roles.includes('SUPERADMIN')) {
      throw new ForbiddenException('User is not associated with an active organisation.');
    }

    // 2. Superadmin
    if (roles.includes('SUPERADMIN')) {
      return {
        organisationId: organisationId || 'all',
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'PLATFORM',
      };
    }

    // 3. Organisation Owner
    if (roles.includes('ORGANISATION_OWNER')) {
      return {
        organisationId: organisationId!,
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
      };
    }

    // 4. Outlet Manager
    if (roles.includes('OUTLET_MANAGER')) {
      const allowedOutlets = user.outletIds || (user.outletId ? [user.outletId] : []);
      if (requestedOutletId && !allowedOutlets.includes(requestedOutletId)) {
        throw new ForbiddenException('Cannot access sales data for an unauthorised outlet.');
      }
      const targetOutlet = requestedOutletId || allowedOutlets[0];
      if (!targetOutlet) {
        throw new ForbiddenException('No outlet assigned for outlet manager.');
      }
      return {
        organisationId: organisationId!,
        outletId: targetOutlet,
        roleScope: 'OUTLET',
      };
    }

    // 5. Reception
    if (roles.includes('RECEPTION')) {
      const allowedOutlets = user.outletIds || (user.outletId ? [user.outletId] : []);
      const targetOutlet = requestedOutletId && allowedOutlets.includes(requestedOutletId)
        ? requestedOutletId
        : allowedOutlets[0];
      return {
        organisationId: organisationId!,
        outletId: targetOutlet,
        roleScope: 'OUTLET',
      };
    }

    // 6. Sales Staff / Trainer
    if (roles.includes('STAFF') || roles.includes('TRAINER')) {
      return {
        organisationId: organisationId!,
        outletId: user.outletId || requestedOutletId,
        staffId: user.staffProfileId || user.id,
        roleScope: 'STAFF',
      };
    }

    throw new ForbiddenException('Insufficient permissions to access sales intelligence.');
  }
}
