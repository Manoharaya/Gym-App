import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  HealthDataSummaryDto,
  DailyHealthMetricSummary,
  WearableProviderType,
} from '@fitcore/types';

@Injectable()
export class HealthDataSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic normalized health summary for a member over a date range.
   */
  async getMemberSummary(
    memberId: string,
    organisationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<HealthDataSummaryDto> {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // Default 7 days

    const records = await this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const activeConnections = await this.prisma.wearableConnection.findMany({
      where: { memberId, organisationId, status: 'CONNECTED' },
      select: { provider: true },
    });

    const connectedProviders = Array.from(
      new Set(activeConnections.map((c) => c.provider as WearableProviderType)),
    );

    // Group records by calendar day (YYYY-MM-DD in UTC or source timezone)
    const dayMap = new Map<string, DailyHealthMetricSummary>();

    let totalSteps = 0;
    let totalDistanceKm = 0;
    let totalActiveCaloriesKcal = 0;
    let totalWorkouts = 0;
    const restingHeartRateSamples: number[] = [];
    const sleepDurationSamples: number[] = [];

    for (const record of records) {
      const dateKey = record.startTime.toISOString().split('T')[0];

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          steps: 0,
          distanceKm: 0,
          activeCaloriesKcal: 0,
          restingHeartRateBpm: null,
          avgHeartRateBpm: null,
          sleepMinutes: null,
          workoutCount: 0,
          sources: [],
        });
      }

      const daySummary = dayMap.get(dateKey)!;
      const prov = record.provider as WearableProviderType;
      if (!daySummary.sources.includes(prov)) {
        daySummary.sources.push(prov);
      }

      switch (record.dataType) {
        case 'STEPS':
          daySummary.steps += Math.round(record.value);
          totalSteps += Math.round(record.value);
          break;
        case 'DISTANCE':
          daySummary.distanceKm = Number((daySummary.distanceKm + record.value).toFixed(2));
          totalDistanceKm = Number((totalDistanceKm + record.value).toFixed(2));
          break;
        case 'ACTIVE_CALORIES':
        case 'TOTAL_CALORIES':
          daySummary.activeCaloriesKcal += Math.round(record.value);
          totalActiveCaloriesKcal += Math.round(record.value);
          break;
        case 'RESTING_HEART_RATE':
          daySummary.restingHeartRateBpm = Math.round(record.value);
          restingHeartRateSamples.push(record.value);
          break;
        case 'HEART_RATE':
          daySummary.avgHeartRateBpm = Math.round(record.value);
          break;
        case 'SLEEP':
        case 'SLEEP_DURATION':
          daySummary.sleepMinutes = (daySummary.sleepMinutes || 0) + Math.round(record.value);
          sleepDurationSamples.push(record.value);
          break;
        case 'WORKOUT':
        case 'EXERCISE_SESSION':
          daySummary.workoutCount += Math.round(record.value);
          totalWorkouts += Math.round(record.value);
          break;
      }
    }

    const dailySummaries = Array.from(dayMap.values());
    const daysCount = Math.max(1, dailySummaries.length);

    const avgRestingHeartRateBpm =
      restingHeartRateSamples.length > 0
        ? Math.round(
            restingHeartRateSamples.reduce((a, b) => a + b, 0) /
              restingHeartRateSamples.length,
          )
        : null;

    const avgSleepMinutes =
      sleepDurationSamples.length > 0
        ? Math.round(
            sleepDurationSamples.reduce((a, b) => a + b, 0) / sleepDurationSamples.length,
          )
        : null;

    return {
      memberId,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      totalSteps,
      avgDailySteps: Math.round(totalSteps / daysCount),
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalActiveCaloriesKcal,
      avgRestingHeartRateBpm,
      avgSleepMinutes,
      totalWorkouts,
      dailySummaries,
      connectedProviders,
    };
  }
}
