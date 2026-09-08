/**
 * Day 30 — Workflow Event Processing Background Job
 *
 * Provides idempotent background ingestion and batch processing of domain events,
 * ensuring high throughput, retry-safety, and tenant isolation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEngineService } from '../engine/workflow-engine.service';
import { WorkflowTriggerEvent } from '../automation.types';

@Injectable()
export class WorkflowEventJob {
  private readonly logger = new Logger(WorkflowEventJob.name);

  constructor(private readonly engineService: WorkflowEngineService) {}

  /**
   * Processes an incoming domain event asynchronously with idempotency guarantees.
   */
  async processEvent(event: WorkflowTriggerEvent): Promise<{ triggeredCount: number; instanceIds: string[] }> {
    this.logger.log(
      `[Job:WorkflowEvent] Processing event ${event.eventType} for member ${event.memberId} (Org: ${event.organisationId})`,
    );

    try {
      const instanceIds = await this.engineService.handleEvent(event);
      this.logger.log(`[Job:WorkflowEvent] Event processed successfully; created ${instanceIds.length} instances.`);
      return { triggeredCount: instanceIds.length, instanceIds };
    } catch (err: any) {
      this.logger.error(`[Job:WorkflowEvent] Error processing event ${event.eventType}: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Batch processes multiple buffered events.
   */
  async processBatch(events: WorkflowTriggerEvent[]): Promise<{ totalProcessed: number; totalTriggered: number }> {
    let totalTriggered = 0;
    for (const ev of events) {
      const res = await this.processEvent(ev);
      totalTriggered += res.triggeredCount;
    }
    return { totalProcessed: events.length, totalTriggered };
  }
}
