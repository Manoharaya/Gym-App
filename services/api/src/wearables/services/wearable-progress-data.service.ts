import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthDataSummaryService } from './health-data-summary.service';

export interface WearableProgressContribution {
  memberId: string;
  source: 'WEARABLE';
  providers: string[];
  totalSteps7Days: number;
  avgDailySteps: number;
  totalActiveCalories7Days: number;
  avgRestingHeartRateBpm: number | null;
  avgSleepMinutes: number | null;
  workoutSessionsCount: number;
}

/**
 * WearableProgressDataService
 *
 * Provides a clean adapter boundary for Progress and Analytics domains to query
 * aggregated telemetry metrics without modifying authoritative progress records automatically.
 * Preserves strict source attribution (source: 'WEARABLE').
 */
@Injectable()
export class WearableProgressDataService {
  private readonly logger = new Logger(WearableProgressDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: HealthDataSummaryService,
  ) {}

  /**
   * Computes a 7-day wearable progress contribution payload.
   */
  async getWearableProgressMetrics(
    memberId: string,
    organisationId: string,
  ): Promise<WearableProgressContribution> {
    const summary = await this.summaryService.getMemberSummary(memberId, organisationId);

    return {
      memberId,
      source: 'WEARABLE',
      providers: summary.connectedProviders,
      totalSteps7Days: summary.totalSteps,
      avgDailySteps: summary.avgDailySteps,
      totalActiveCalories7Days: summary.totalActiveCaloriesKcal,
      avgRestingHeartRateBpm: summary.avgRestingHeartRateBpm || null,
      avgSleepMinutes: summary.avgSleepMinutes || null,
      workoutSessionsCount: summary.totalWorkouts,
    };
  }
}
