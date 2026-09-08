import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { NutritionCoachService } from '../services/nutrition-coach.service';

@Injectable()
export class NutritionCoachJobService {
  private readonly logger = new Logger(NutritionCoachJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coachService: NutritionCoachService,
  ) {}

  /**
   * Idempotent batch generation of daily nutrition insights for active members.
   * Can be triggered on a cron schedule or background task queue.
   */
  async processDailyNutritionInsights(organisationId?: string): Promise<{ processedCount: number }> {
    this.logger.log(`Starting daily nutrition insights processing (org: ${organisationId || 'ALL'})`);

    const where: any = { status: 'ACTIVE' };
    if (organisationId) {
      where.organisationId = organisationId;
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      select: { id: true, organisationId: true, userId: true },
      take: 100,
    });

    let processedCount = 0;

    for (const member of members) {
      try {
        const dummyActor: any = {
          id: member.userId,
          isSuperAdmin: true,
          roles: [{ role: 'MEMBER', organisationId: member.organisationId }],
        };

        await this.coachService.getTodaySummary(member.id, member.organisationId, dummyActor);
        processedCount++;
      } catch (err: any) {
        this.logger.error(
          `Failed to process daily nutrition insight for member '${member.id}': ${err.message}`,
        );
      }
    }

    this.logger.log(`Daily nutrition insights completed. Processed ${processedCount} members.`);
    return { processedCount };
  }
}
