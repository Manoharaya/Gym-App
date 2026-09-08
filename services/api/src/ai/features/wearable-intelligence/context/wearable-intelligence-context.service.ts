import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { WearableMetricsService } from '../metrics/wearable-metrics.service';
import { WearableTrendService } from '../trends/wearable-trend.service';
import { TrainingCorrelationService } from '../correlation/training-correlation.service';
import { WearableIntelligenceContextDto } from '@fitcore/types';

@Injectable()
export class WearableIntelligenceContextService {
  private readonly logger = new Logger(WearableIntelligenceContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: WearableMetricsService,
    private readonly trendService: WearableTrendService,
    private readonly correlationService: TrainingCorrelationService,
  ) {}

  /**
   * Constructs bounded, sanitized, and authorized AI context strictly filtering out sensitive data.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
  ): Promise<WearableIntelligenceContextDto> {
    // 1. Fetch member timezone
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { timezone: true },
    });

    const timezone = member?.timezone || 'UTC';
    const currentDate = new Date().toISOString().slice(0, 10);

    // 2. Fetch comprehensive metrics
    const metrics = await this.metricsService.getMetricsForMember(memberId, organisationId, 28);

    // 3. Fetch records for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        startTime: { gte: thirtyDaysAgo },
      },
    });

    const detectedTrends = this.trendService.detectTrends(records);

    // 4. Fetch recent completed workout counts
    const recentWorkouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        startedAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
      select: { id: true },
    });

    // 5. Fetch recent check-in subjective indicators
    const latestCheckIn = await this.prisma.dailyCheckIn.findFirst({
      where: { memberId, status: 'COMPLETED' },
      orderBy: { checkInDate: 'desc' },
      select: { energyLevel: true, sorenessLevel: true },
    });

    // Construct clean, bounded context
    return {
      memberId,
      organisationId,
      timezone,
      currentDate,
      dataAvailability: {
        sleep: metrics.sleep.availability !== 'NOT_AVAILABLE',
        activity: metrics.activity.availability !== 'NOT_AVAILABLE',
        heartMetrics: metrics.heart.restingHeartRateAvailability !== 'NOT_AVAILABLE',
        hrv: metrics.heart.hrvAvailability !== 'NOT_AVAILABLE',
      },
      sleepSummary: {
        recentAverageMinutes: metrics.sleep.sevenDayAverageMinutes,
        baselineMinutes: metrics.sleep.fourteenDayAverageMinutes,
        trend: detectedTrends.find((t) => t.metric === 'SLEEP')?.summaryText || null,
      },
      activitySummary: {
        recentAverageSteps: metrics.activity.sevenDayAverageSteps,
        baselineSteps: metrics.activity.sevenDayAverageSteps,
        trend: detectedTrends.find((t) => t.metric === 'STEPS')?.summaryText || null,
      },
      heartSummary: {
        restingHeartRate: metrics.heart.latestRestingHeartRateBpm,
        baselineRestingHeartRate: metrics.heart.sevenDayAverageRestingHeartRateBpm,
        trend: detectedTrends.find((t) => t.metric.includes('HEART'))?.summaryText || null,
      },
      recoverySummary: {
        category: metrics.recovery.category,
        explanation: metrics.recovery.explanation,
      },
      trainingSummary: {
        recentWorkoutsCount: recentWorkouts.length,
        trainingConsistency: recentWorkouts.length >= 8 ? 'HIGH' : recentWorkouts.length >= 4 ? 'MODERATE' : 'LIGHT',
      },
      checkInSummary: latestCheckIn
        ? {
            recentEnergy: latestCheckIn.energyLevel || undefined,
            recentSoreness: latestCheckIn.sorenessLevel || undefined,
          }
        : undefined,
      detectedTrends,
      dataQuality: metrics.dataQuality,
    };
  }
}
