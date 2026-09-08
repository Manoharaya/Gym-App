/**
 * Day 30 — Workflow Scheduler Service
 *
 * Manages timed delays, quiet hours resumption, and deferred step executions.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
  ) {}

  /**
   * Processes all pending scheduled instances whose delay has elapsed.
   */
  async processScheduledWorkflows(): Promise<number> {
    const now = new Date();
    const scheduledInstances = await this.prisma.workflowInstance.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      take: 50,
    });

    if (scheduledInstances.length === 0) {
      return 0;
    }

    this.logger.log(`Processing ${scheduledInstances.length} scheduled workflow instance(s)...`);
    let processedCount = 0;

    for (const inst of scheduledInstances) {
      try {
        await this.prisma.workflowInstance.update({
          where: { id: inst.id },
          data: { status: 'RUNNING', scheduledAt: null },
        });

        await this.engine.runNextStep(inst.id);
        processedCount++;
      } catch (err: any) {
        this.logger.error(`Error processing scheduled instance ${inst.id}: ${err.message}`, err.stack);
      }
    }

    return processedCount;
  }
}
