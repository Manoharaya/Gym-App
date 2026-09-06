import { Injectable, ForbiddenException } from '@nestjs/common';
import { RequestWithUser, TenantContext } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class TenantContextService {
  /**
   * Resolves and validates the tenant context from the incoming request.
   * Throws ForbiddenException if a non-superadmin user attempts to access an organisation
   * they do not belong to.
   */
  resolveAndValidateTenant(req: RequestWithUser): TenantContext {
    const headerOrgId = req.headers['x-organisation-id'] as string | undefined;
    const headerOutletId = req.headers['x-outlet-id'] as string | undefined;
    const paramOrgId = req.params?.organisationId || req.params?.orgId;
    const paramOutletId = req.params?.outletId;

    const requestedOrgId = paramOrgId || headerOrgId;
    const requestedOutletId = paramOutletId || headerOutletId;

    const user = req.user;

    // If no authenticated user yet (e.g., public route), just return whatever is requested
    if (!user) {
      return {
        organisationId: requestedOrgId,
        outletId: requestedOutletId,
      };
    }

    // Platform Superadmins have global platform-wide access
    if (user.isSuperAdmin) {
      const resolvedOrgId = requestedOrgId || user.primaryOrganisationId;
      return {
        organisationId: resolvedOrgId,
        outletId: requestedOutletId || user.primaryOutletId || undefined,
      };
    }

    // Non-superadmin: check organization boundary
    const userOrgIds = new Set<string>();
    if (user.primaryOrganisationId) userOrgIds.add(user.primaryOrganisationId);
    user.roles?.forEach((r) => {
      if (r.organisationId) userOrgIds.add(r.organisationId);
    });

    if (requestedOrgId && !userOrgIds.has(requestedOrgId)) {
      throw new ForbiddenException(
        `Cross-tenant access forbidden: User ${user.email} cannot access organisation ${requestedOrgId}`,
      );
    }

    const effectiveOrgId = requestedOrgId || user.primaryOrganisationId || Array.from(userOrgIds)[0];

    // Check outlet boundary if an outlet is explicitly requested
    if (requestedOutletId) {
      const hasOrgWideScope = user.roles.some(
        (r) =>
          r.organisationId === effectiveOrgId &&
          ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
      );

      if (!hasOrgWideScope) {
        const allowedOutletIds = new Set<string>();
        if (user.primaryOutletId) allowedOutletIds.add(user.primaryOutletId);
        user.roles.forEach((r) => {
          if (r.outletId) allowedOutletIds.add(r.outletId);
        });

        if (!allowedOutletIds.has(requestedOutletId)) {
          throw new ForbiddenException(
            `Cross-outlet access forbidden: User ${user.email} cannot access outlet ${requestedOutletId}`,
          );
        }
      }
    }

    return {
      organisationId: effectiveOrgId,
      outletId: requestedOutletId || user.primaryOutletId || undefined,
    };
  }
}
