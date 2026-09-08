import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { WearableMetricsService } from '../metrics/wearable-metrics.service';
import { WearableIntelligenceCacheService } from './wearable-intelligence-cache.service';

@Injectable()
export class WearableIntelligenceJobService {
  private readonly logger = new Logger(WearableIntelligenceJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: WearableMetricsService,
    private readonly cache: WearableIntelligenceCacheService,
  ) {}

  /**
   * Precomputes and caches wearable intelligence metrics for active connected members.
   * Can be triggered on a cron schedule or after batch sync.
   */
  async precomputeActiveMemberMetrics(): Promise<{ processedCount: number }> {
    this.logger.log('Starting wearable intelligence metric precomputation job...');

    const activeConnections = await this.prisma.wearableConnection.findMany({
      where: { status: 'CONNECTED' },
      select: { memberId: true, organisationId: true },
      distinct: ['memberId'],
      take: 100,
    });

    let processedCount = 0;
    for (const conn of activeConnections) {
      try {
        const metrics = await this.metricsService.getMetricsForMember(
          conn.memberId,
          conn.organisationId,
          28,
        );
        await this.cache.set(conn.organisationId, conn.memberId, 'summary_28d', metrics, 3600 * 4);
        processedCount += 1;
      } catch (err: any) {
        this.logger.warn(
          `Failed precomputing wearable metrics for member ${conn.memberId}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Completed wearable intelligence job: processed ${processedCount} members.`);
    return { processedCount };
  }
}
