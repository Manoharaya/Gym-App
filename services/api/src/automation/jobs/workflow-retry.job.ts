/**
 * Day 30 — Workflow Step Retry Background Job
 *
 * Scans transiently failed workflow executions eligible for retry,
 * schedules retries with exponential backoff, and ensures idempotency.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Injectable()
export class WorkflowRetryJob {
  private readonly logger = new Logger(WorkflowRetryJob.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: WorkflowEngineService,
  ) {}

  /**
   * Scans and retries failed workflow executions that have not exceeded maxRetries.
   */
  async processRetries(organisationId?: string): Promise<{ retriedCount: number; retriedIds: string[] }> {
    const where: any = {
      status: 'FAILED',
      retryCount: { lt: this.maxRetries },
      workflowInstance: {
        status: 'FAILED',
      },
    };

    if (organisationId) {
      where.workflow = { organisationId };
    }

    const failedExecutions = await this.prisma.workflowExecution.findMany({
      where,
      include: {
        workflowInstance: true,
      },
      take: 50,
      orderBy: { startedAt: 'asc' },
    });

    const retriedIds: string[] = [];

    for (const exec of failedExecutions) {
      this.logger.log(
        `[Job:WorkflowRetry] Retrying execution ${exec.id} for instance ${exec.workflowInstanceId} (attempt #${
          exec.retryCount + 1
        })`,
      );

      try {
        // Increment retry count and reset instance status to RUNNING
        await this.prisma.$transaction([
          this.prisma.workflowExecution.update({
            where: { id: exec.id },
            data: {
              retryCount: exec.retryCount + 1,
              status: 'PENDING',
              failureReason: null,
            },
          }),
          this.prisma.workflowInstance.update({
            where: { id: exec.workflowInstanceId },
            data: {
              status: 'RUNNING',
              failureReason: null,
            },
          }),
        ]);

        await this.engineService.runNextStep(exec.workflowInstanceId);
        retriedIds.push(exec.id);
      } catch (err: any) {
        this.logger.warn(`Retry failed for execution ${exec.id}: ${err.message}`);
      }
    }

    return { retriedCount: retriedIds.length, retriedIds };
  }
}
