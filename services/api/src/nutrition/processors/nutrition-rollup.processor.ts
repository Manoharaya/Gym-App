import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NutritionSummaryService } from '../services/nutrition-summary.service';

@Injectable()
export class NutritionRollupProcessor {
  private readonly logger = new Logger(NutritionRollupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: NutritionSummaryService,
  ) {}

  /**
   * Idempotent batch aggregation of daily nutrition summaries for all active members.
   * Can be triggered on a cron or background queue.
   */
  async processDailyRollup(date: Date = new Date()): Promise<{ processedCount: number }> {
    this.logger.log(`Starting nutrition daily rollup for date: ${date.toISOString()}`);

    const activeMembers = await this.prisma.memberProfile.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, organisationId: true, userId: true },
    });

    let processedCount = 0;

    for (const member of activeMembers) {
      try {
        const dummyActor: any = {
          id: member.userId,
          isSuperAdmin: true,
          roles: [{ role: 'SUPERADMIN' }],
        };

        await this.summaryService.getDailySummary(
          member.organisationId,
          member.id,
          date,
          dummyActor,
        );
        processedCount++;
      } catch (err: any) {
        this.logger.error(
          `Failed to generate nutrition summary for member '${member.id}': ${err.message}`,
        );
      }
    }

    this.logger.log(`Nutrition daily rollup completed. Processed ${processedCount} members.`);
    return { processedCount };
  }
}
