/**
 * FitCore — Day 44: AI Finance Permission Service
 *
 * Enforces strict multi-tenant isolation and role-based access control for AI Financial Intelligence.
 * Guarantees that users can only query financial data within their authorized scope.
 */

import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';

export interface ResolvedFinanceScope {
  organisationId: string;
  outletId?: string;
  memberId?: string;
  role: string;
  isSuperAdmin: boolean;
  canViewAllOutlets: boolean;
  isSelfOnly: boolean;
}

@Injectable()
export class FinancePermissionService {
  /**
   * Resolves and validates the financial scope for an authenticated user.
   */
  resolveScope(
    user: AuthenticatedUser,
    requestedOrganisationId?: string,
    requestedOutletId?: string,
  ): ResolvedFinanceScope {
    if (!user) {
      throw new UnauthorizedException('Authentication required to access financial intelligence');
    }

    const roles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    const primaryRole = roles[0] || 'MEMBER';
    const isSuperAdmin = primaryRole === 'SUPERADMIN';

    // Platform SuperAdmin can query any organisation
    let organisationId = user.primaryOrganisationId;
    if (isSuperAdmin && requestedOrganisationId) {
      organisationId = requestedOrganisationId;
    } else if (requestedOrganisationId && requestedOrganisationId !== organisationId && !isSuperAdmin) {
      throw new ForbiddenException('Access to external organisation financial data is strictly forbidden');
    }

    if (!organisationId && !isSuperAdmin) {
      throw new ForbiddenException('User is not associated with an active organisation');
    }

    // Role-based financial access validation
    if (primaryRole === 'TRAINER') {
      throw new ForbiddenException('Trainers do not have access to organisation financial intelligence');
    }

    // Member role can only access their own billing/financial records
    if (primaryRole === 'MEMBER') {
      if (requestedOutletId || requestedOrganisationId) {
        // Members cannot query organisation-wide summaries
      }
      return {
        organisationId: organisationId || '',
        memberId: user.id,
        role: primaryRole,
        isSuperAdmin: false,
        canViewAllOutlets: false,
        isSelfOnly: true,
      };
    }

    // Outlet Managers can only query their assigned outlet(s)
    let canViewAllOutlets = false;
    let effectiveOutletId: string | undefined = requestedOutletId || user.primaryOutletId || undefined;

    if (isSuperAdmin || primaryRole === 'ORGANISATION_OWNER' || primaryRole === 'FINANCE') {
      canViewAllOutlets = true;
      effectiveOutletId = requestedOutletId || undefined;
    } else if (primaryRole === 'OUTLET_MANAGER') {
      canViewAllOutlets = false;
      const userOutlets: string[] = (user.roles || [])
        .map((r: any) => (typeof r === 'object' && r ? r.outletId : null))
        .filter(Boolean);
      if (user.primaryOutletId && !userOutlets.includes(user.primaryOutletId)) {
        userOutlets.push(user.primaryOutletId);
      }

      if (requestedOutletId && !userOutlets.includes(requestedOutletId)) {
        throw new ForbiddenException(`Outlet Manager is not authorized to query outlet ${requestedOutletId}`);
      }
      effectiveOutletId = requestedOutletId || user.primaryOutletId || undefined;
    } else if (primaryRole === 'RECEPTION') {
      // Reception has limited front-desk access only
      canViewAllOutlets = false;
      effectiveOutletId = user.primaryOutletId || undefined;
    }

    return {
      organisationId: organisationId || '',
      outletId: effectiveOutletId || undefined,
      role: primaryRole,
      isSuperAdmin,
      canViewAllOutlets,
      isSelfOnly: false,
    };
  }

  /**
   * Asserts user has administrative / organizational finance privileges.
   */
  assertCanQueryOrganisationFinances(scope: ResolvedFinanceScope): void {
    if (scope.isSelfOnly) {
      throw new ForbiddenException('Members are restricted to their own billing history');
    }
    if (scope.role === 'TRAINER') {
      throw new ForbiddenException('Trainers are unauthorized to query financial data');
    }
  }
}
