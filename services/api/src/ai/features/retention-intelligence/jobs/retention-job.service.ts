import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { RiskFactorService } from '../analysis/risk-factor.service';
import { InterventionSelectionService } from '../analysis/intervention-selection.service';
import { RETENTION_EVENTS } from '../retention-intelligence.constants';

@Injectable()
export class RetentionJobService {
  private readonly logger = new Logger(RetentionJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly riskFactorService: RiskFactorService,
    private readonly interventionSelectionService: InterventionSelectionService,
  ) {}

  /**
   * Idempotent background job calculating retention risk for all active members in an organisation.
   */
  async calculateRetentionRiskForAllActiveMembers(organisationId: string): Promise<{
    evaluatedCount: number;
    elevatedCount: number;
    highCount: number;
  }> {
    this.logger.log(`Starting retention risk batch calculation for organisation: ${organisationId}`);

    const activeMembers = await this.prisma.memberProfile.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    let elevatedCount = 0;
    let highCount = 0;
    const now = new Date();

    for (const member of activeMembers) {
      try {
        const signals = await this.signalService.collectAllSignals(member.id, organisationId, now);
        const baseline = await this.baselineService.computeBaseline(member.id, organisationId, now);
        const assessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);

        if (assessment.riskLevel === 'ELEVATED') elevatedCount++;
        if (assessment.riskLevel === 'HIGH') highCount++;
      } catch (err: any) {
        this.logger.error(`Error calculating retention risk for member ${member.id}: ${err.message}`);
      }
    }

    this.logger.log(
      `Completed retention risk batch: evaluated ${activeMembers.length} members (Elevated: ${elevatedCount}, High: ${highCount})`,
    );

    return {
      evaluatedCount: activeMembers.length,
      elevatedCount,
      highCount,
    };
  }

  /**
   * Identifies risk escalations and logs domain events.
   */
  async detectRiskEscalations(organisationId: string): Promise<number> {
    const activeMembers = await this.prisma.memberProfile.findMany({
      where: { organisationId, status: 'ACTIVE' },
      select: { id: true },
    });

    let escalationCount = 0;
    const rankMap: Record<string, number> = {
      INSUFFICIENT_DATA: 0,
      LOW: 1,
      MODERATE: 2,
      ELEVATED: 3,
      HIGH: 4,
    };

    for (const member of activeMembers) {
      const recentAnalyses = await this.prisma.retentionAnalysis.findMany({
        where: { organisationId, memberId: member.id },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { riskLevel: true, createdAt: true },
      });

      if (recentAnalyses.length === 2) {
        const currentRank = rankMap[recentAnalyses[0].riskLevel] || 0;
        const previousRank = rankMap[recentAnalyses[1].riskLevel] || 0;

        if (currentRank > previousRank) {
          escalationCount++;
          this.logger.warn(
            `[${RETENTION_EVENTS.RISK_ESCALATED}] Detected escalation for member ${member.id}: ${recentAnalyses[1].riskLevel} -> ${recentAnalyses[0].riskLevel}`,
          );
        }
      }
    }

    return escalationCount;
  }

  /**
   * Automatically marks stale/overdue follow-up tasks as EXPIRED.
   */
  async expireStaleFollowUpTasks(organisationId?: string): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.retentionFollowUpTask.updateMany({
      where: {
        ...(organisationId ? { organisationId } : {}),
        status: { in: ['OPEN', 'ASSIGNED'] },
        dueAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
        notes: 'Automatically expired due to overdue dueAt timestamp.',
      },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} overdue retention follow-up tasks.`);
    }

    return expired.count;
  }
}
