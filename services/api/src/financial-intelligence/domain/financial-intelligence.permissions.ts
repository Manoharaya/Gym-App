import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@fitcore/types';

export interface FinancialRequestUser {
  id: string;
  organisationId?: string;
  outletId?: string;
  outletIds?: string[];
  roles?: string[];
  role?: string;
  memberProfileId?: string;
}

export interface ResolvedFinancialScope {
  organisationId: string;
  outletId?: string;
  memberProfileId?: string;
  roleScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'SELF';
  authorizedCurrencies?: string[];
}

export class FinancialIntelligencePermissions {
  /**
   * Resolves authoritative financial query scope server-side based on authenticated user context.
   * Never trusts client-supplied organisationId, outletId, or memberId over user authorization.
   */
  static resolveScope(
    user: FinancialRequestUser,
    requestedOutletId?: string,
    isSelfQuery: boolean = false,
  ): ResolvedFinancialScope {
    if (!user) {
      throw new ForbiddenException('Authentication required to access financial intelligence.');
    }

    const roles = (user.roles || [user.role || 'MEMBER']).map((r) => r.toUpperCase());

    // 1. Members can ONLY access their own billing/financial records
    if (roles.includes('MEMBER') && !roles.some((r) => r !== 'MEMBER')) {
      if (!isSelfQuery) {
        throw new ForbiddenException('Members are not permitted to access organizational financial intelligence.');
      }
      return {
        organisationId: user.organisationId || 'unknown',
        memberProfileId: user.memberProfileId || user.id,
        roleScope: 'SELF',
      };
    }

    // 2. Trainers are strictly forbidden from financial intelligence
    if (roles.includes('TRAINER') && !roles.some((r) => ['SUPERADMIN', 'ORGANISATION_OWNER', 'FINANCE', 'OUTLET_MANAGER'].includes(r))) {
      throw new ForbiddenException('Trainer role is not permitted to view financial intelligence metrics.');
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
      };
    }

    // 4. Organisation Owner & Finance Roles: Full Organisation Scope
    if (roles.includes('ORGANISATION_OWNER') || roles.includes('FINANCE')) {
      return {
        organisationId: organisationId!,
        outletId: requestedOutletId,
        roleScope: requestedOutletId ? 'OUTLET' : 'ORGANISATION',
      };
    }

    // 5. Outlet Manager: Scoped strictly to their assigned outlet(s)
    if (roles.includes('OUTLET_MANAGER')) {
      const allowedOutlets = user.outletIds && user.outletIds.length > 0 ? user.outletIds : user.outletId ? [user.outletId] : [];

      if (allowedOutlets.length === 0) {
        throw new ForbiddenException('Outlet Manager is not assigned to any active outlet.');
      }

      if (requestedOutletId && !allowedOutlets.includes(requestedOutletId)) {
        throw new ForbiddenException(`Access denied: You are not authorized to access outlet ${requestedOutletId}.`);
      }

      return {
        organisationId: organisationId!,
        outletId: requestedOutletId || allowedOutlets[0],
        roleScope: 'OUTLET',
      };
    }

    // 6. Receptionist: Limited scope (can view only assigned outlet)
    if (roles.includes('RECEPTION')) {
      const allowedOutlet = user.outletId;
      if (!allowedOutlet) {
        throw new ForbiddenException('Reception staff is not assigned to an outlet.');
      }
      if (requestedOutletId && requestedOutletId !== allowedOutlet) {
        throw new ForbiddenException(`Access denied: Receptionist cannot access other outlets.`);
      }
      return {
        organisationId: organisationId!,
        outletId: allowedOutlet,
        roleScope: 'OUTLET',
      };
    }

    throw new ForbiddenException('Insufficient permissions to access financial intelligence.');
  }
}
