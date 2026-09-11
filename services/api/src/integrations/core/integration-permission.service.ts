/**
 * FitCore — Day 48: Integration Permission & Tenant Isolation Service
 *
 * Enforces strict multi-tenant RBAC and IDOR defenses across all integration queries:
 * - Organisation isolation: Org A cannot read or mutate Org B connections
 * - Outlet isolation: Outlet Manager cannot manage doors/communications for another outlet
 * - Member isolation: Members can only access their own wearables
 * - Staff isolation: Staff can only access their own staff calendar
 */

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationScope } from '@fitcore/types';

export interface IntegrationAccessContext {
  organisationId: string;
  userId: string;
  roles: string[];
  outletId?: string;
  memberId?: string;
  staffId?: string;
}

@Injectable()
export class IntegrationPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the calling user's integration context.
   */
  async resolveContext(user: any): Promise<IntegrationAccessContext> {
    const userId = user.sub || user.userId || user.id;
    const organisationId = user.organisationId;
    const roles: string[] = user.roles || (user.role ? [user.role] : []);

    let outletId = user.outletId;
    let memberId = user.memberId;
    let staffId = user.staffId;

    if (!memberId) {
      const memberProfile = await this.prisma.memberProfile.findFirst({
        where: { userId, organisationId },
        select: { id: true },
      });
      if (memberProfile) {
        memberId = memberProfile.id;
      }
    }

    if (!staffId) {
      const staffProfile = await this.prisma.staffProfile.findFirst({
        where: { userId, organisationId },
        select: { id: true },
      });
      if (staffProfile) {
        staffId = staffProfile.id;
      }
    }

    return { organisationId, userId, roles, outletId, memberId, staffId };
  }

  /**
   * Asserts whether user can view a specific connection.
   */
  assertCanAccessConnection(ctx: IntegrationAccessContext, connection: any): void {
    const isSuperAdmin = ctx.roles.includes('SUPERADMIN');
    if (isSuperAdmin) return;

    if (connection.organisationId !== ctx.organisationId) {
      throw new ForbiddenException('Cross-tenant integration access is strictly forbidden');
    }

    const isOrgAdmin =
      ctx.roles.includes('ORGANISATION_OWNER') ||
      ctx.roles.includes('ADMIN') ||
      ctx.roles.includes('OWNER');

    if (isOrgAdmin) return;

    if (connection.scope === 'MEMBER') {
      if (!ctx.memberId || connection.memberId !== ctx.memberId) {
        throw new ForbiddenException('You do not have permission to access another member’s integration');
      }
      return;
    }

    if (connection.scope === 'STAFF') {
      if (!ctx.staffId || connection.staffId !== ctx.staffId) {
        throw new ForbiddenException('You do not have permission to access another staff member’s integration');
      }
      return;
    }

    if (connection.scope === 'OUTLET') {
      const isOutletManager = ctx.roles.includes('OUTLET_MANAGER');
      if (isOutletManager) {
        if (!ctx.outletId || connection.outletId !== ctx.outletId) {
          throw new ForbiddenException('You do not have permission to manage another outlet’s integration');
        }
        return;
      }
    }

    const isFinance = ctx.roles.includes('FINANCE');
    if (isFinance && (connection.category === 'ACCOUNTING' || connection.category === 'PAYMENTS')) {
      return;
    }

    const isReception = ctx.roles.includes('RECEPTION');
    if (isReception && (connection.category === 'COMMUNICATION' || connection.category === 'ACCESS_CONTROL')) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions to access this integration connection');
  }

  /**
   * Asserts whether user can create or mutate a connection for given scope.
   */
  assertCanMutateScope(ctx: IntegrationAccessContext, scope: IntegrationScope, target?: { outletId?: string; memberId?: string; staffId?: string }): void {
    const isSuperAdmin = ctx.roles.includes('SUPERADMIN');
    if (isSuperAdmin) return;

    const isOrgAdmin =
      ctx.roles.includes('ORGANISATION_OWNER') ||
      ctx.roles.includes('ADMIN') ||
      ctx.roles.includes('OWNER');

    if (scope === 'ORGANISATION') {
      if (!isOrgAdmin) {
        throw new ForbiddenException('Only organisation administrators can manage organisation-level integrations');
      }
      return;
    }

    if (scope === 'OUTLET') {
      if (isOrgAdmin) return;
      const isOutletManager = ctx.roles.includes('OUTLET_MANAGER');
      if (isOutletManager) {
        if (target?.outletId && target.outletId !== ctx.outletId) {
          throw new ForbiddenException('Cannot configure an integration for a different outlet');
        }
        return;
      }
      throw new ForbiddenException('Only outlet managers can manage outlet-scoped integrations');
    }

    if (scope === 'MEMBER') {
      if (isOrgAdmin) return;
      if (target?.memberId && target.memberId !== ctx.memberId) {
        throw new ForbiddenException('Cannot configure integration for another member');
      }
      return;
    }

    if (scope === 'STAFF') {
      if (isOrgAdmin) return;
      if (target?.staffId && target.staffId !== ctx.staffId) {
        throw new ForbiddenException('Cannot configure integration for another staff member');
      }
      return;
    }
  }
}
