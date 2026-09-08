import { Injectable, Logger } from '@nestjs/common';
import { RetentionOutcomeService } from '../workflows/retention-outcome.service';

@Injectable()
export class RetentionOutcomeJob {
  private readonly logger = new Logger(RetentionOutcomeJob.name);

  constructor(private readonly outcomeService: RetentionOutcomeService) {}

  /**
   * Periodically scans for member re-engagement signals following retention outreach.
   */
  async execute(organisationId: string): Promise<{ reengagedDetected: number }> {
    this.logger.log(`Starting retention outcome tracking job for organisation: ${organisationId}`);
    const reengagedDetected = await this.outcomeService.detectReengagement(organisationId);
    this.logger.log(`Completed outcome tracking job. Detected ${reengagedDetected} re-engaged members.`);
    return { reengagedDetected };
  }
}
