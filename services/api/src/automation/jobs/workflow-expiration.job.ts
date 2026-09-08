/**
 * Day 30 — Workflow Expiration Background Job
 *
 * Scans and expires workflow instances that exceeded their configured time-to-live (TTL)
 * or pending human approvals that timed out without staff action.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowStateService } from '../workflows/workflow-state.service';

@Injectable()
export class WorkflowExpirationJob {
  private readonly logger = new Logger(WorkflowExpirationJob.name);

  // Default approval timeout is 7 days if unconfigured
  private readonly defaultApprovalTtlDays = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateService: WorkflowStateService,
  ) {}

  /**
   * Scans and marks expired instances across all organisations or a specific organisation.
   */
  async processExpirations(organisationId?: string): Promise<{ expiredCount: number; expiredIds: string[] }> {
    const now = new Date();
    const approvalCutoff = new Date(now.getTime() - this.defaultApprovalTtlDays * 24 * 60 * 60 * 1000);

    const where: any = {
      status: { in: ['WAITING', 'AWAITING_APPROVAL', 'SCHEDULED'] },
      OR: [
        { expiresAt: { lte: now } },
        {
          status: 'AWAITING_APPROVAL',
          startedAt: { lte: approvalCutoff },
        },
      ],
    };

    if (organisationId) {
      where.organisationId = organisationId;
    }

    const candidates = await this.prisma.workflowInstance.findMany({
      where,
      select: { id: true, status: true, workflowId: true },
      take: 100,
    });

    const expiredIds: string[] = [];

    for (const inst of candidates) {
      try {
        await this.stateService.transition(inst.id, 'EXPIRED', {
          reason: `Workflow timed out in status ${inst.status} without timely progression.`,
          failureReason: 'Execution TTL expired.',
        });
        expiredIds.push(inst.id);
      } catch (err: any) {
        this.logger.warn(`Failed to expire instance ${inst.id}: ${err.message}`);
      }
    }

    if (expiredIds.length > 0) {
      this.logger.log(`[Job:WorkflowExpiration] Expired ${expiredIds.length} timed-out instances.`);
    }

    return { expiredCount: expiredIds.length, expiredIds };
  }
}
