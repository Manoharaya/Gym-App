import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { SleepMetricsService } from './sleep-metrics.service';
import { ActivityMetricsService } from './activity-metrics.service';
import { HeartMetricsService } from './heart-metrics.service';
import { RecoveryMetricsService } from './recovery-metrics.service';
import {
  WearableProviderType,
  DataQualityRating,
  SleepMetricsDto,
  ActivityMetricsDto,
  HeartMetricsDto,
  RecoverySummaryDto,
} from '@fitcore/types';

export interface ComprehensiveWearableMetrics {
  memberId: string;
  dataQuality: DataQualityRating;
  dataDaysCount: number;
  connectedProviders: WearableProviderType[];
  sleep: SleepMetricsDto;
  activity: ActivityMetricsDto;
  heart: HeartMetricsDto;
  recovery: RecoverySummaryDto;
}

@Injectable()
export class WearableMetricsService {
  private readonly logger = new Logger(WearableMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sleepMetrics: SleepMetricsService,
    private readonly activityMetrics: ActivityMetricsService,
    private readonly heartMetrics: HeartMetricsService,
    private readonly recoveryMetrics: RecoveryMetricsService,
  ) {}

  /**
   * Fetches normalized health records and derives complete deterministic metrics.
   */
  async getMetricsForMember(
    memberId: string,
    organisationId: string,
    daysBack: number = 28,
  ): Promise<ComprehensiveWearableMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setUTCHours(0, 0, 0, 0);

    // 1. Check connected providers
    const connections = await this.prisma.wearableConnection.findMany({
      where: { memberId, organisationId, status: 'CONNECTED' },
      select: { provider: true },
    });
    const connectedProviders = connections.map((c) => c.provider as WearableProviderType);

    // 2. Fetch normalized health records in window
    const records = await this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        startTime: { gte: startDate },
      },
      orderBy: { startTime: 'desc' },
    });

    // 3. Fetch latest check-in readiness score if available
    const latestCheckIn = await this.prisma.dailyCheckIn.findFirst({
      where: { memberId, status: 'COMPLETED' },
      orderBy: { checkInDate: 'desc' },
      select: { readinessScore: true },
    });

    // 4. Derive individual domain metrics
    const sleep = this.sleepMetrics.calculateSleepMetrics(records);
    const activity = this.activityMetrics.calculateActivityMetrics(records);
    const heart = this.heartMetrics.calculateHeartMetrics(records);
    const recovery = this.recoveryMetrics.assessRecovery({
      sleep,
      activity,
      heart,
      recentCheckInScore: latestCheckIn?.readinessScore,
    });

    // 5. Evaluate overall data quality
    const maxDays = Math.max(sleep.dataDaysCount, activity.dataDaysCount, heart.dataDaysCount);

    let dataQuality: DataQualityRating = 'NO_DATA';
    if (maxDays >= 7) {
      dataQuality = 'NORMAL_DATA';
    } else if (maxDays >= 3) {
      dataQuality = 'PARTIAL_DATA';
    } else if (maxDays > 0) {
      dataQuality = 'INSUFFICIENT_DATA';
    }

    return {
      memberId,
      dataQuality,
      dataDaysCount: maxDays,
      connectedProviders,
      sleep,
      activity,
      heart,
      recovery,
    };
  }
}
