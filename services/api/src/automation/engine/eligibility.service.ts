/**
 * Day 30 — Workflow Eligibility Service
 *
 * Checks member eligibility against workflow audience filters,
 * multi-tenant boundaries, and trainer client scoping.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowAudienceFilter, WorkflowConditionEvaluationResult } from '@fitcore/types';

export interface EligibilityEvaluationResult {
  eligible: boolean;
  reasons: string[];
  audienceFilterResults?: WorkflowConditionEvaluationResult[];
}

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Evaluates if a member is eligible for a workflow given the workflow audience filter.
   */
  async evaluateEligibility(
    organisationId: string,
    outletId: string | null | undefined,
    memberId: string,
    audienceFilter?: WorkflowAudienceFilter | null,
    extraContext?: Record<string, any>,
  ): Promise<EligibilityEvaluationResult> {
    const reasons: string[] = [];

    // 1. Fetch member profile with relations
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: true,
        memberships: {
          where: { status: 'ACTIVE' },
          include: { membershipPlan: true },
          take: 1,
        },
        memberOutlets: true,
        trainerClientAssignments: {
          where: { status: 'ACTIVE' },
          include: { trainerProfile: { include: { staffProfile: true } } },
          take: 1,
        },
      },
    });

    if (!member) {
      return {
        eligible: false,
        reasons: [`Member with ID ${memberId} not found.`],
      };
    }

    // Multi-tenant boundary check
    if (member.organisationId !== organisationId) {
      return {
        eligible: false,
        reasons: [`Member does not belong to organisation ${organisationId}.`],
      };
    }

    // Outlet scoping check
    if (outletId && member.memberOutlets.length > 0) {
      const isMemberOfOutlet = member.memberOutlets.some((mo) => mo.outletId === outletId);
      if (!isMemberOfOutlet) {
        reasons.push(`Member is not assigned to workflow outlet (${outletId}).`);
      }
    }

    if (!audienceFilter || Object.keys(audienceFilter).length === 0) {
      return { eligible: true, reasons: ['No audience filter restrictions; eligible.'] };
    }

    // 2. Membership status check
    const activeMembership = member.memberships[0];
    const currentStatus = activeMembership?.status || member.status || 'ACTIVE';

    if (audienceFilter.membershipStatuses && audienceFilter.membershipStatuses.length > 0) {
      const statusMatched = audienceFilter.membershipStatuses.some(
        (s) => s.toUpperCase() === currentStatus.toUpperCase(),
      );
      if (!statusMatched) {
        reasons.push(
          `Membership status '${currentStatus}' does not match allowed statuses: [${audienceFilter.membershipStatuses.join(', ')}]`,
        );
      }
    }

    // 3. Trainer scoping check
    const assignedAssignment = member.trainerClientAssignments[0];
    const trainerProfileId = assignedAssignment?.trainerProfileId;
    const trainerUserId = assignedAssignment?.trainerProfile?.staffProfile?.userId;

    if (audienceFilter.trainerId) {
      const matchesTrainer =
        trainerProfileId === audienceFilter.trainerId || trainerUserId === audienceFilter.trainerId;
      if (!matchesTrainer) {
        reasons.push(
          `Assigned trainer (${trainerUserId || trainerProfileId || 'None'}) does not match filter trainer (${audienceFilter.trainerId}).`,
        );
      }
    }

    // 4. Days since join (tenure) check
    if (member.createdAt) {
      const daysSinceJoin = Math.floor(
        (Date.now() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (audienceFilter.minDaysSinceJoin !== undefined && daysSinceJoin < audienceFilter.minDaysSinceJoin) {
        reasons.push(
          `Member tenure of ${daysSinceJoin} days is less than minimum required ${audienceFilter.minDaysSinceJoin} days.`,
        );
      }

      if (audienceFilter.maxDaysSinceJoin !== undefined && daysSinceJoin > audienceFilter.maxDaysSinceJoin) {
        reasons.push(
          `Member tenure of ${daysSinceJoin} days exceeds maximum allowed ${audienceFilter.maxDaysSinceJoin} days.`,
        );
      }
    }

    // 5. Tags evaluation
    const memberMetadata = (member as any).metadata || {};
    const memberTags: string[] = Array.isArray(memberMetadata.tags) ? memberMetadata.tags : [];

    if (audienceFilter.tags && audienceFilter.tags.length > 0) {
      const hasAllRequiredTags = audienceFilter.tags.every((t) =>
        memberTags.some((mt) => mt.toLowerCase() === t.toLowerCase()),
      );
      if (!hasAllRequiredTags) {
        reasons.push(`Member lacks required tags: [${audienceFilter.tags.join(', ')}]`);
      }
    }

    if (audienceFilter.excludeTags && audienceFilter.excludeTags.length > 0) {
      const hasExcludedTag = audienceFilter.excludeTags.some((t) =>
        memberTags.some((mt) => mt.toLowerCase() === t.toLowerCase()),
      );
      if (hasExcludedTag) {
        reasons.push(`Member has excluded tags from: [${audienceFilter.excludeTags.join(', ')}]`);
      }
    }

    // 6. Custom conditions
    const filterResults: WorkflowConditionEvaluationResult[] = [];
    if (audienceFilter.customConditions && audienceFilter.customConditions.length > 0) {
      const context = {
        member: {
          id: member.id,
          status: currentStatus,
          trainerId: trainerUserId,
          tags: memberTags,
          user: member.user,
        },
        ...extraContext,
      };

      for (const cond of audienceFilter.customConditions) {
        const evalRes = this.conditionEvaluator.evaluateCondition(cond, context);
        filterResults.push(evalRes);
        if (!evalRes.passed) {
          reasons.push(evalRes.reason || 'Custom audience condition failed.');
        }
      }
    }

    const eligible = reasons.length === 0;
    return {
      eligible,
      reasons: eligible ? ['Member meets all audience criteria.'] : reasons,
      audienceFilterResults: filterResults,
    };
  }
}
