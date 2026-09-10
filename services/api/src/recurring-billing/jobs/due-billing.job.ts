/**
 * FitCore — Day 42: Due Billing Schedules Background Job
 *
 * Scans active billing schedules due for renewal in bounded batches
 * and generates billing cycles with invoices.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BillingCycleService } from '../services/billing-cycle.service';

@Injectable()
export class DueBillingJob {
  private readonly logger = new Logger(DueBillingJob.name);

  constructor(private readonly cycleService: BillingCycleService) {}

  /**
   * Processes due billing schedules for an organisation.
   */
  async runDueBillingTick(
    organisationId: string,
    batchSize: number = 50,
  ): Promise<{ processedCount: number; cyclesGenerated: number }> {
    this.logger.debug(`[Job:DueBilling] Scanning due billing schedules for org '${organisationId}'...`);
    try {
      const result = await this.cycleService.processDueSchedules(organisationId, batchSize);
      if (result.cyclesGenerated > 0) {
        this.logger.log(
          `[Job:DueBilling] Generated ${result.cyclesGenerated} cycles from ${result.processedCount} due schedules.`,
        );
      }
      return result;
    } catch (err: any) {
      this.logger.error(`[Job:DueBilling] Failed to process due schedules: ${err.message}`, err.stack);
      throw err;
    }
  }
}
