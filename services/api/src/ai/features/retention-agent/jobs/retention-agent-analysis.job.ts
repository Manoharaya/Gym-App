import { Injectable, Logger } from '@nestjs/common';
import { RetentionMemberSelectorService } from '../analysis/retention-member-selector.service';
import { RetentionWorkflowService } from '../workflows/retention-workflow.service';

@Injectable()
export class RetentionAgentAnalysisJob {
  private readonly logger = new Logger(RetentionAgentAnalysisJob.name);

  constructor(
    private readonly memberSelector: RetentionMemberSelectorService,
    private readonly workflowService: RetentionWorkflowService,
  ) {}

  /**
   * Evaluates active members and creates pending review tasks for candidates.
   */
  async execute(organisationId: string, limit: number = 20): Promise<{ processed: number; created: number }> {
    this.logger.log(`Starting automated retention analysis job for organisation: ${organisationId}`);

    const candidates = await this.memberSelector.findCandidates(organisationId, undefined, limit);
    let created = 0;

    for (const candidate of candidates) {
      try {
        await this.workflowService.createOutreachForMember(candidate.memberId, organisationId);
        created++;
      } catch (err: any) {
        this.logger.warn(`Failed creating outreach for member ${candidate.memberId}: ${err.message}`);
      }
    }

    this.logger.log(`Completed retention analysis job. Evaluated ${candidates.length} candidates, created ${created} pending outreaches.`);
    return { processed: candidates.length, created };
  }
}
