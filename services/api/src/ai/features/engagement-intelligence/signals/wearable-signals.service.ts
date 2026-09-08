import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { WearableSignals } from '../engagement-intelligence.types';

@Injectable()
export class WearableSignalsService {
  private readonly logger = new Logger(WearableSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collects high-level wearable engagement indicators.
   * STRICT BOUNDARY:
   * Only measures sync consistency, activity consistency, and sleep tracking consistency.
   * Never extracts raw clinical health indicators or draws medical conclusions.
   */
  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<WearableSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const syncLogs = await this.prisma.wearableSyncLog.findMany({
      where: {
        memberId,
        organisationId,
        status: 'SUCCESS',
        startedAt: { gte: d28Ago, lte: now },
      },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
    });

    const distinctDays28d = new Set(syncLogs.map((s) => s.startedAt.toISOString().split('T')[0]));
    const distinctDays7d = new Set(
      syncLogs.filter((s) => s.startedAt >= d7Ago).map((s) => s.startedAt.toISOString().split('T')[0]),
    );

    const syncDaysLast7d = distinctDays7d.size;
    const syncDaysLast28d = distinctDays28d.size;
    const syncConsistencyPct = Math.min(100, Math.round((syncDaysLast28d / 28) * 100));

    // Measure activity consistency via step records count days
    const activityRecords = await this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        dataType: 'STEPS',
        startTime: { gte: d28Ago, lte: now },
      },
      select: { startTime: true },
    });
    const activityDays = new Set(activityRecords.map((r) => r.startTime.toISOString().split('T')[0])).size;
    const activityConsistencyScore = Math.min(100, Math.round((activityDays / 28) * 100));

    // Sleep tracking days count
    const sleepRecords = await this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        dataType: 'SLEEP_SESSION',
        startTime: { gte: d28Ago, lte: now },
      },
      select: { startTime: true },
    });
    const sleepTrackingDays = new Set(sleepRecords.map((r) => r.startTime.toISOString().split('T')[0])).size;

    const lastSyncAt = syncLogs[0]?.startedAt || null;

    return {
      syncDaysLast7d,
      syncDaysLast28d,
      syncConsistencyPct,
      activityConsistencyScore,
      sleepTrackingDays,
      lastSyncAt,
    };
  }
}
