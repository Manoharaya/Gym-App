/**
 * Day 30 — Workflow Scheduler Background Job
 *
 * Runs periodically to scan and advance workflow instances that were deferred
 * due to step delays or quiet hours windows.
 */

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowSchedulerService } from '../scheduling/workflow-scheduler.service';

@Injectable()
export class WorkflowSchedulerJob {
  private readonly logger = new Logger(WorkflowSchedulerJob.name);

  constructor(private readonly schedulerService: WorkflowSchedulerService) {}

  /**
   * Executes scheduled tick, waking up deferred instances whose scheduledAt timestamp has elapsed.
   */
  async runSchedulerTick(): Promise<{ processedCount: number }> {
    this.logger.debug('[Job:WorkflowScheduler] Running scheduled workflow queue scan...');
    try {
      const processed = await this.schedulerService.processScheduledWorkflows();
      if (processed > 0) {
        this.logger.log(`[Job:WorkflowScheduler] Successfully advanced ${processed} scheduled instances.`);
      }
      return { processedCount: processed };
    } catch (err: any) {
      this.logger.error(`[Job:WorkflowScheduler] Error processing scheduled queue: ${err.message}`, err.stack);
      throw err;
    }
  }
}
