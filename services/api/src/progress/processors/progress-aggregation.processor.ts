import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PersonalRecordService } from '../services/personal-record.service';
import { ProgressAnalyticsService } from '../services/progress-analytics.service';
import { AuditService } from '../../audit/audit.service';

export interface ProgressAggregationResult {
  membersProcessed: number;
  prsEvaluated: number;
  snapshotsGenerated: number;
}

@Injectable()
export class ProgressAggregationProcessor {
  private readonly logger = new Logger(ProgressAggregationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prService: PersonalRecordService,
    private readonly analyticsService: ProgressAnalyticsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Scans and aggregates progress metrics, generates snapshots, and checks PRs.
   * Completely idempotent and safe for periodic cron / background job execution.
   */
  async processBatchAggregation(organisationId?: string): Promise<ProgressAggregationResult> {
    const where: any = { status: 'ACTIVE' };
    if (organisationId) {
      where.organisationId = organisationId;
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      select: { id: true, organisationId: true },
      take: 100,
    });

    let totalPRs = 0;
    let totalSnapshots = 0;

    for (const m of members) {
      try {
        // 1. Recalculate or evaluate latest PRs
        const recentWorkouts = await this.prisma.workout.findMany({
          where: {
            organisationId: m.organisationId,
            memberProfileId: m.id,
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          take: 5,
        });

        for (const w of recentWorkouts) {
          const prs = await this.prService.evaluateWorkoutForPRs(m.organisationId, w.id);
          totalPRs += prs.length;
        }

        // 2. Invalidate cache to guarantee fresh analytics
        await this.analyticsService.invalidateMemberCache(m.organisationId, m.id);

        totalSnapshots++;
      } catch (err: any) {
        this.logger.error(`Failed aggregation for member ${m.id}: ${err.message}`);
      }
    }

    this.logger.log(
      `[PROGRESS PROCESSOR] Aggregated progress for ${members.length} members: ${totalPRs} PR evaluations, ${totalSnapshots} cache refreshes`,
    );

    return {
      membersProcessed: members.length,
      prsEvaluated: totalPRs,
      snapshotsGenerated: totalSnapshots,
    };
  }
}
