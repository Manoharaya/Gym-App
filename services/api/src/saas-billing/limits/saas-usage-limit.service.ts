import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SaasLimitCheckResult } from '@fitcore/types';

export interface LimitCheckOutcome {
  allowed: boolean;
  status: SaasLimitCheckResult;
  currentUsage: number;
  includedAllowance: number;
  overageAllowed: boolean;
  reason?: string;
}

@Injectable()
export class SaasUsageLimitService {
  private readonly logger = new Logger(SaasUsageLimitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates if a given entitlement usage is allowed for an organisation.
   * Fails closed: if unknown or no active subscription, returns PLAN_REQUIRED or LIMIT_REACHED.
   */
  async checkLimit(
    organisationId: string,
    entitlementCode: string,
    additionalQuantity: number = 1,
  ): Promise<LimitCheckOutcome> {
    const sub = await this.prisma.saasSubscription.findFirst({
      where: {
        organisationId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        planVersion: {
          include: {
            entitlements: {
              where: { entitlement: { code: entitlementCode } },
              include: { entitlement: true },
            },
          },
        },
      },
    });

    if (!sub) {
      return {
        allowed: false,
        status: 'PLAN_REQUIRED',
        currentUsage: 0,
        includedAllowance: 0,
        overageAllowed: false,
        reason: 'No active SaaS subscription found for organisation',
      };
    }

    const planEnt = sub.planVersion?.entitlements?.[0];
    if (!planEnt) {
      // Entitlement not configured on plan
      return {
        allowed: true, // If not explicitly restricted, allow or check defaults
        status: 'ALLOWED',
        currentUsage: 0,
        includedAllowance: 0,
        overageAllowed: false,
      };
    }

    if (planEnt.limitType === 'UNLIMITED') {
      return {
        allowed: true,
        status: 'ALLOWED',
        currentUsage: 0,
        includedAllowance: 0,
        overageAllowed: false,
      };
    }

    // Determine current usage based on entitlement code
    let currentUsage = 0;
    if (entitlementCode === 'OUTLET_LIMIT') {
      currentUsage = await this.prisma.outlet.count({
        where: { organisationId, status: { not: 'DELETED' } },
      });
    } else if (entitlementCode === 'MEMBER_LIMIT') {
      currentUsage = await this.prisma.memberProfile.count({
        where: { organisationId },
      });
    } else if (entitlementCode === 'STAFF_LIMIT') {
      currentUsage = await this.prisma.staffProfile.count({
        where: { organisationId, employmentStatus: 'ACTIVE' },
      });
    } else if (entitlementCode === 'DEVELOPER_APP_LIMIT') {
      currentUsage = await this.prisma.developerApplication.count({
        where: { organisationId, status: 'ACTIVE' },
      });
    } else if (entitlementCode === 'AI_TOKEN_LIMIT') {
      const agg = await this.prisma.saasUsageAggregate.findFirst({
        where: {
          organisationId,
          meterKey: 'AI_TOKEN',
          periodStart: { gte: sub.currentPeriodStart },
          periodEnd: { lte: sub.currentPeriodEnd },
        },
      });
      currentUsage = agg?.quantity || 0;
    } else {
      // Default to usage meter aggregate
      const agg = await this.prisma.saasUsageAggregate.findFirst({
        where: {
          organisationId,
          meterKey: planEnt.entitlement.meterKey || entitlementCode,
          periodStart: { gte: sub.currentPeriodStart },
        },
      });
      currentUsage = agg?.quantity || 0;
    }

    const projectedUsage = currentUsage + additionalQuantity;
    const allowance = planEnt.includedAllowance;

    if (projectedUsage <= allowance) {
      const softLimit = (allowance * planEnt.softLimitThresholdPercent) / 100;
      if (projectedUsage >= softLimit) {
        return {
          allowed: true,
          status: 'WARNING',
          currentUsage,
          includedAllowance: allowance,
          overageAllowed: planEnt.overageAllowed,
        };
      }
      return {
        allowed: true,
        status: 'ALLOWED',
        currentUsage,
        includedAllowance: allowance,
        overageAllowed: planEnt.overageAllowed,
      };
    }

    // Over quota:
    if (planEnt.overageAllowed) {
      return {
        allowed: true,
        status: 'OVERAGE_ALLOWED',
        currentUsage,
        includedAllowance: allowance,
        overageAllowed: true,
        reason: `Allowance of ${allowance} reached, overage will be billed`,
      };
    }

    return {
      allowed: false,
      status: 'LIMIT_REACHED',
      currentUsage,
      includedAllowance: allowance,
      overageAllowed: false,
      reason: `Hard limit of ${allowance} reached for ${entitlementCode}`,
    };
  }

  /**
   * Convenience helpers for core resource limits
   */
  async checkOutletLimit(organisationId: string): Promise<LimitCheckOutcome> {
    return this.checkLimit(organisationId, 'OUTLET_LIMIT', 1);
  }

  async checkMemberLimit(organisationId: string): Promise<LimitCheckOutcome> {
    return this.checkLimit(organisationId, 'MEMBER_LIMIT', 1);
  }

  async checkStaffLimit(organisationId: string): Promise<LimitCheckOutcome> {
    return this.checkLimit(organisationId, 'STAFF_LIMIT', 1);
  }

  async checkAiTokenLimit(organisationId: string, tokens: number): Promise<LimitCheckOutcome> {
    return this.checkLimit(organisationId, 'AI_TOKEN_LIMIT', tokens);
  }
}
