import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { RetentionAgentContextService } from '../context/retention-agent-context.service';
import { RetentionPriorityService } from './retention-priority.service';
import { RetentionCandidateEvaluation } from '../retention-agent.types';
import { RETENTION_OUTREACH_COOLDOWN_DAYS } from '../retention-agent.constants';

@Injectable()
export class RetentionMemberSelectorService {
  private readonly logger = new Logger(RetentionMemberSelectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: RetentionAgentContextService,
    private readonly priorityService: RetentionPriorityService,
  ) {}

  /**
   * Scans active members and identifies candidates needing retention intervention.
   * Enforces 14-day outreach cooldown and data-sufficiency minimums.
   */
  async findCandidates(
    organisationId: string,
    outletId?: string,
    limit: number = 50,
  ): Promise<RetentionCandidateEvaluation[]> {
    const cooldownCutoff = new Date(Date.now() - RETENTION_OUTREACH_COOLDOWN_DAYS * 24 * 3600 * 1000);

    // Fetch active members belonging to organisation
    const members = await this.prisma.memberProfile.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
        ...(outletId
          ? {
              memberOutlets: {
                some: { outletId, status: 'ACTIVE' },
              },
            }
          : {}),
      },
      select: {
        id: true,
        memberOutlets: { where: { status: 'ACTIVE' }, select: { outletId: true }, take: 1 },
      },
      take: limit * 2, // Take larger sample to account for cooldown filtering
    });

    const evaluations: RetentionCandidateEvaluation[] = [];

    for (const m of members) {
      if (evaluations.length >= limit) break;

      try {
        const evaluation = await this.evaluateMember(m.id, organisationId);
        if (evaluation.isCandidate && !evaluation.cooldownActive) {
          evaluations.push(evaluation);
        }
      } catch (err: any) {
        this.logger.warn(`Failed evaluating member ${m.id} for retention outreach: ${err.message}`);
      }
    }

    return evaluations;
  }

  /**
   * Evaluates a single member's retention candidacy.
   */
  async evaluateMember(
    memberId: string,
    organisationId: string,
  ): Promise<RetentionCandidateEvaluation> {
    const context = await this.contextService.buildContext(memberId, organisationId);
    const { retentionSignals, engagement, communicationPolicy, trainer, outletId } = context;

    const reasons: string[] = [];
    const hasSufficientData = retentionSignals.riskLevel !== 'INSUFFICIENT_DATA';

    if (retentionSignals.riskLevel === 'HIGH' || retentionSignals.riskLevel === 'ELEVATED') {
      reasons.push(`Elevated retention risk (${retentionSignals.riskLevel})`);
    }

    if (engagement.dropPercentage >= 35) {
      reasons.push(`Significant attendance decline of ${engagement.dropPercentage}%`);
    }

    if (engagement.daysInactive >= 10) {
      reasons.push(`Lapsed attendance for ${engagement.daysInactive} days`);
    }

    if (engagement.noShowsLast30Days >= 2) {
      reasons.push(`Multiple recent class no-shows (${engagement.noShowsLast30Days})`);
    }

    if (retentionSignals.riskTrend === 'WORSENING') {
      reasons.push('Worsening engagement trajectory');
    }

    const isCandidate = reasons.length > 0;
    const priority = isCandidate ? this.priorityService.evaluatePriority(context) : 'LOW';

    return {
      memberId,
      isCandidate,
      priority,
      reasons,
      riskLevel: retentionSignals.riskLevel,
      riskTrend: retentionSignals.riskTrend,
      cooldownActive: communicationPolicy.isCooldownActive,
      hasSufficientData,
      assignedTrainerId: trainer?.trainerId,
      outletId,
    };
  }
}
