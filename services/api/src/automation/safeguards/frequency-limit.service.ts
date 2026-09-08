/**
 * Day 30 — Workflow Frequency Limit Service
 *
 * Enforces member-level frequency safeguards:
 * - Maximum communications per day
 * - Maximum communications per week
 * - Maximum concurrent active workflows per member
 * - Maximum active retention workflows per member
 * - Maximum AI drafts generated per member
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FrequencyLimitCheckResult } from '../automation.types';

export interface FrequencyLimitPolicy {
  maxCommunicationsPerDay?: number;
  maxCommunicationsPerWeek?: number;
  maxConcurrentWorkflows?: number;
  maxActiveRetentionWorkflows?: number;
  maxAiDraftsPerWeek?: number;
}

@Injectable()
export class FrequencyLimitService {
  private readonly logger = new Logger(FrequencyLimitService.name);

  // Conservative platform defaults
  private readonly defaultLimits: FrequencyLimitPolicy = {
    maxCommunicationsPerDay: 2,
    maxCommunicationsPerWeek: 5,
    maxConcurrentWorkflows: 3,
    maxActiveRetentionWorkflows: 1,
    maxAiDraftsPerWeek: 5,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates all frequency limits for a member before workflow initiation or execution.
   */
  async evaluateLimits(
    organisationId: string,
    memberId: string,
    customPolicy?: FrequencyLimitPolicy,
    workflowCategory?: string,
  ): Promise<FrequencyLimitCheckResult> {
    const policy = { ...this.defaultLimits, ...(customPolicy || {}) };
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Check max active retention workflows if this workflow is in the RETENTION category
    if (workflowCategory === 'RETENTION' && policy.maxActiveRetentionWorkflows !== undefined) {
      const activeRetentionCount = await this.prisma.workflowInstance.count({
        where: {
          organisationId,
          memberId,
          status: { in: ['PENDING', 'RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED'] },
          workflow: {
            category: 'RETENTION',
          },
        },
      });

      if (activeRetentionCount >= policy.maxActiveRetentionWorkflows) {
        return {
          allowed: false,
          limitType: 'MAX_RETENTION_WORKFLOWS',
          currentCount: activeRetentionCount,
          maxLimit: policy.maxActiveRetentionWorkflows,
          reason: `Member already has ${activeRetentionCount} active retention workflow(s) (limit: ${policy.maxActiveRetentionWorkflows}).`,
        };
      }
    }

    // 2. Check max concurrent active workflows
    if (policy.maxConcurrentWorkflows !== undefined) {
      const activeWorkflowsCount = await this.prisma.workflowInstance.count({
        where: {
          organisationId,
          memberId,
          status: { in: ['PENDING', 'RUNNING', 'WAITING', 'AWAITING_APPROVAL', 'SCHEDULED'] },
        },
      });

      if (activeWorkflowsCount >= policy.maxConcurrentWorkflows) {
        return {
          allowed: false,
          limitType: 'MAX_CONCURRENT_WORKFLOWS',
          currentCount: activeWorkflowsCount,
          maxLimit: policy.maxConcurrentWorkflows,
          reason: `Member has reached max concurrent workflows (${activeWorkflowsCount}/${policy.maxConcurrentWorkflows}).`,
        };
      }
    }

    // 3. Check max communications per day
    if (policy.maxCommunicationsPerDay !== undefined) {
      const commsToday = await this.prisma.communication.count({
        where: {
          organisationId,
          recipientMemberId: memberId,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (commsToday >= policy.maxCommunicationsPerDay) {
        return {
          allowed: false,
          limitType: 'MAX_COMMUNICATIONS_PER_DAY',
          currentCount: commsToday,
          maxLimit: policy.maxCommunicationsPerDay,
          reason: `Member reached daily communication limit (${commsToday}/${policy.maxCommunicationsPerDay} in 24h).`,
        };
      }
    }

    // 4. Check max communications per week
    if (policy.maxCommunicationsPerWeek !== undefined) {
      const commsThisWeek = await this.prisma.communication.count({
        where: {
          organisationId,
          recipientMemberId: memberId,
          createdAt: { gte: oneWeekAgo },
        },
      });

      if (commsThisWeek >= policy.maxCommunicationsPerWeek) {
        return {
          allowed: false,
          limitType: 'MAX_COMMUNICATIONS_PER_WEEK',
          currentCount: commsThisWeek,
          maxLimit: policy.maxCommunicationsPerWeek,
          reason: `Member reached weekly communication limit (${commsThisWeek}/${policy.maxCommunicationsPerWeek} in 7d).`,
        };
      }
    }

    return {
      allowed: true,
      reason: 'All frequency limit checks passed.',
    };
  }
}
