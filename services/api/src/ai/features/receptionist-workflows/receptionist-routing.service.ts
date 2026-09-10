/**
 * Day 35 — Receptionist Staff Routing Service
 * Intelligently routes handoffs and follow-up tasks to active, authorized staff members.
 * Enforces strict multi-tenant, outlet, and employment status invariants.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { StaffRoutingRule, WorkflowHandoffReason } from '@fitcore/types';

export interface RouteStaffParams {
  organisationId: string;
  outletId?: string | null;
  reason?: WorkflowHandoffReason;
  routingRule?: StaffRoutingRule;
  requiredRole?: string; // RECEPTION, TRAINER, FINANCE, OUTLET_MANAGER
}

@Injectable()
export class ReceptionistRoutingService {
  private readonly logger = new Logger(ReceptionistRoutingService.name);
  private roundRobinIndices: Map<string, number> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates available staff members and selects the best candidate according to configured rules.
   * Invariant: Never assigns to terminated, suspended, or unauthorized staff.
   */
  async findEligibleStaff(params: RouteStaffParams): Promise<{
    assignedStaffId?: string;
    targetRole?: string;
    routingMethod: StaffRoutingRule;
  }> {
    const { organisationId, outletId, reason, routingRule = 'BY_ROLE', requiredRole } = params;

    // 1. Determine target role from reason or override
    const targetRole = requiredRole || this.resolveTargetRole(reason);

    // 2. Query active staff within the organisation
    const staffQuery: any = {
      organisationId,
      employmentStatus: 'ACTIVE', // Invariant: Only active staff
      user: {
        status: 'ACTIVE',
      },
    };

    if (outletId) {
      staffQuery.outletAssignments = {
        some: {
          outletId,
          status: 'ACTIVE',
        },
      };
    }

    const activeStaff = await this.prisma.staffProfile.findMany({
      where: staffQuery,
      include: {
        user: {
          include: {
            userRoles: {
              include: { role: true },
            },
          },
        },
        outletAssignments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activeStaff.length === 0) {
      this.logger.warn(
        `[StaffRouting] No active staff found for org ${organisationId} and outlet ${outletId || 'ANY'}`,
      );
      return {
        assignedStaffId: undefined,
        targetRole,
        routingMethod: routingRule,
      };
    }

    // 3. Filter by role match if BY_ROLE or requiredRole specified
    let candidatePool = activeStaff;
    if (targetRole) {
      const roleMatched = activeStaff.filter((staff) => {
        const hasUserRole = staff.user?.userRoles?.some((ur) => ur.role.name === targetRole);
        const hasOutletScope = staff.outletAssignments?.some((oa) => oa.roleScope === targetRole);
        return hasUserRole || hasOutletScope;
      });

      if (roleMatched.length > 0) {
        candidatePool = roleMatched;
      }
    }

    // 4. Select candidate according to routing rule
    let selectedStaffId: string | undefined;

    if (routingRule === 'ROUND_ROBIN' || routingRule === 'BY_ROLE' || routingRule === 'BY_OUTLET') {
      const cacheKey = `${organisationId}:${outletId || 'ALL'}:${targetRole || 'ANY'}`;
      const currentIndex = this.roundRobinIndices.get(cacheKey) || 0;
      const selectedIndex = currentIndex % candidatePool.length;
      selectedStaffId = candidatePool[selectedIndex].id;
      this.roundRobinIndices.set(cacheKey, selectedIndex + 1);
    } else {
      // Default to first candidate
      selectedStaffId = candidatePool[0].id;
    }

    this.logger.log(
      `[StaffRouting] Assigned staff ${selectedStaffId} (Role: ${targetRole || 'GENERAL'}) using ${routingRule}`,
    );

    return {
      assignedStaffId: selectedStaffId,
      targetRole,
      routingMethod: routingRule,
    };
  }

  /**
   * Maps handoff reasons to target staff roles.
   */
  private resolveTargetRole(reason?: WorkflowHandoffReason): string {
    switch (reason) {
      case 'PAYMENT_QUESTION':
      case 'PRICING_EXCEPTION':
        return 'FINANCE';
      case 'COMPLAINT':
        return 'OUTLET_MANAGER';
      case 'SPECIAL_REQUEST':
        return 'RECEPTION';
      case 'BOOKING_FAILURE':
      case 'TECHNICAL_FAILURE':
        return 'RECEPTION';
      default:
        return 'RECEPTION';
    }
  }
}
