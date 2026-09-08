/**
 * Day 30 — Workflow Cooldown & Frequency Safeguard Service
 *
 * Prevents spamming members and ensures rate limiting across scopes:
 * MEMBER, WORKFLOW, MEMBER_AND_WORKFLOW, ORGANISATION.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowSafetyPolicy, CooldownScope } from '@fitcore/types';
import { WORKFLOW_DEFAULTS } from '../automation.constants';

export interface SafeguardCheckResult {
  passed: boolean;
  check: string;
  detail: string;
}

@Injectable()
export class CooldownService {
  private readonly logger = new Logger(CooldownService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks cooldown and frequency limits before initiating a workflow instance.
   */
  async checkSafeguards(
    organisationId: string,
    workflowId: string,
    memberId: string,
    policy?: WorkflowSafetyPolicy | null,
  ): Promise<SafeguardCheckResult[]> {
    const results: SafeguardCheckResult[] = [];
    const cooldownHours = policy?.cooldownHours ?? WORKFLOW_DEFAULTS.COOLDOWN_HOURS;
    const scope: CooldownScope = policy?.cooldownScope ?? 'MEMBER_AND_WORKFLOW';
    const maxExecutionsPerMember = policy?.maxExecutionsPerMember;
    const maxDailyExecutions = policy?.maxDailyExecutions ?? WORKFLOW_DEFAULTS.MAX_DAILY_EXECUTIONS;

    const cooldownThreshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    // 1. Cooldown window check based on scope
    if (cooldownHours > 0) {
      let recentMatchCount = 0;

      switch (scope) {
        case 'MEMBER':
          recentMatchCount = await this.prisma.workflowInstance.count({
            where: {
              memberId,
              startedAt: { gte: cooldownThreshold },
              status: { notIn: ['CANCELLED', 'REJECTED'] },
            },
          });
          break;

        case 'WORKFLOW':
          recentMatchCount = await this.prisma.workflowInstance.count({
            where: {
              workflowId,
              startedAt: { gte: cooldownThreshold },
              status: { notIn: ['CANCELLED', 'REJECTED'] },
            },
          });
          break;

        case 'ORGANISATION':
          recentMatchCount = await this.prisma.workflowInstance.count({
            where: {
              organisationId,
              startedAt: { gte: cooldownThreshold },
              status: { notIn: ['CANCELLED', 'REJECTED'] },
            },
          });
          break;

        case 'MEMBER_AND_WORKFLOW':
        default:
          recentMatchCount = await this.prisma.workflowInstance.count({
            where: {
              workflowId,
              memberId,
              startedAt: { gte: cooldownThreshold },
              status: { notIn: ['CANCELLED', 'REJECTED'] },
            },
          });
          break;
      }

      if (recentMatchCount > 0) {
        results.push({
          passed: false,
          check: `COOLDOWN_${scope}`,
          detail: `Cooldown active: ${recentMatchCount} instance(s) found in past ${cooldownHours}h (Scope: ${scope}).`,
        });
      } else {
        results.push({
          passed: true,
          check: `COOLDOWN_${scope}`,
          detail: `Cooldown satisfied: No instances in past ${cooldownHours}h (Scope: ${scope}).`,
        });
      }
    }

    // 2. Max executions per member check
    if (maxExecutionsPerMember !== undefined && maxExecutionsPerMember > 0) {
      const totalMemberExecutions = await this.prisma.workflowInstance.count({
        where: {
          workflowId,
          memberId,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      });

      if (totalMemberExecutions >= maxExecutionsPerMember) {
        results.push({
          passed: false,
          check: 'MAX_EXECUTIONS_PER_MEMBER',
          detail: `Member has reached lifetime limit of ${maxExecutionsPerMember} execution(s) for this workflow (current: ${totalMemberExecutions}).`,
        });
      } else {
        results.push({
          passed: true,
          check: 'MAX_EXECUTIONS_PER_MEMBER',
          detail: `Member executions (${totalMemberExecutions}) is below limit of ${maxExecutionsPerMember}.`,
        });
      }
    }

    // 3. Max daily executions check for the workflow
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await this.prisma.workflowInstance.count({
      where: {
        workflowId,
        startedAt: { gte: oneDayAgo },
      },
    });

    if (dailyCount >= maxDailyExecutions) {
      results.push({
        passed: false,
        check: 'MAX_DAILY_EXECUTIONS',
        detail: `Workflow has reached daily execution limit of ${maxDailyExecutions} (current: ${dailyCount}).`,
      });
    } else {
      results.push({
        passed: true,
        check: 'MAX_DAILY_EXECUTIONS',
        detail: `Daily executions (${dailyCount}) is below limit of ${maxDailyExecutions}.`,
      });
    }

    return results;
  }
}
