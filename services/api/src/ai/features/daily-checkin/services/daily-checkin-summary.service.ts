import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  DailyCheckInTrend,
  EnergyLevel,
  SorenessLevel,
  SleepQuality,
  MotivationLevel,
} from '../domain/daily-checkin.enums';
import { TREND_OBSERVATION_MINIMUM } from '../domain/daily-checkin.constants';

@Injectable()
export class DailyCheckInSummaryService {
  private readonly logger = new Logger(DailyCheckInSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates deterministic trends over recent check-ins for a member.
   * Requires at least TREND_OBSERVATION_MINIMUM records to declare a trend.
   */
  async detectTrends(memberId: string, limit: number = 7): Promise<DailyCheckInTrend[]> {
    const checkIns = await this.prisma.dailyCheckIn.findMany({
      where: {
        memberId,
        status: 'COMPLETED',
      },
      orderBy: { checkInDate: 'desc' },
      take: limit,
      select: {
        checkInDate: true,
        energyLevel: true,
        sleepQuality: true,
        sorenessLevel: true,
        motivationLevel: true,
        yesterdayWorkoutCompleted: true,
        readinessScore: true,
      },
    });

    if (checkIns.length < TREND_OBSERVATION_MINIMUM) {
      return [];
    }

    const trends: DailyCheckInTrend[] = [];

    // Chronological order: oldest -> newest
    const chronological = [...checkIns].reverse();

    // 1. Soreness Trend
    const highSorenessCount = chronological.filter(
      (c) => c.sorenessLevel === SorenessLevel.HIGH || c.sorenessLevel === SorenessLevel.VERY_HIGH,
    ).length;

    if (highSorenessCount >= 3) {
      trends.push(DailyCheckInTrend.SORENESS_INCREASING);
    }

    // 2. Energy Trend
    const lowEnergyCount = chronological.filter(
      (c) => c.energyLevel === EnergyLevel.LOW || c.energyLevel === EnergyLevel.VERY_LOW,
    ).length;

    if (lowEnergyCount >= 3) {
      trends.push(DailyCheckInTrend.ENERGY_DECLINING);
    } else if (
      chronological.length >= 3 &&
      chronological.slice(-3).every((c) => c.energyLevel === EnergyLevel.GOOD || c.energyLevel === EnergyLevel.VERY_GOOD)
    ) {
      trends.push(DailyCheckInTrend.ENERGY_IMPROVING);
    }

    // 3. Sleep Trend
    const poorSleepCount = chronological.filter(
      (c) => c.sleepQuality === SleepQuality.POOR || c.sleepQuality === SleepQuality.VERY_POOR,
    ).length;

    if (poorSleepCount >= 3) {
      trends.push(DailyCheckInTrend.SLEEP_DECLINING);
    }

    // 4. Motivation Trend
    const lowMotivationCount = chronological.filter(
      (c) => c.motivationLevel === MotivationLevel.LOW || c.motivationLevel === MotivationLevel.VERY_LOW,
    ).length;

    if (lowMotivationCount >= 3) {
      trends.push(DailyCheckInTrend.MOTIVATION_DECLINING);
    }

    // 5. Training Consistency Trend
    const workoutRecords = chronological.filter((c) => c.yesterdayWorkoutCompleted !== null && c.yesterdayWorkoutCompleted !== undefined);
    if (workoutRecords.length >= 3) {
      const completedRatio =
        workoutRecords.filter((c) => c.yesterdayWorkoutCompleted === true).length / workoutRecords.length;

      if (completedRatio >= 0.75) {
        trends.push(DailyCheckInTrend.TRAINING_CONSISTENCY_IMPROVING);
      } else if (completedRatio <= 0.33) {
        trends.push(DailyCheckInTrend.TRAINING_CONSISTENCY_DECLINING);
      }
    }

    return trends;
  }

  /**
   * Builds a concise, non-clinical summary of historical patterns.
   */
  summarizeHistoricalPatterns(trends: DailyCheckInTrend[]): string {
    if (trends.length === 0) {
      return 'No long-term trend detected yet; baseline is currently forming.';
    }

    const observations: string[] = [];

    if (trends.includes(DailyCheckInTrend.SORENESS_INCREASING)) {
      observations.push('Reported muscular soreness has been elevated over recent days.');
    }
    if (trends.includes(DailyCheckInTrend.ENERGY_DECLINING)) {
      observations.push('Energy levels have averaged lower over consecutive check-ins.');
    }
    if (trends.includes(DailyCheckInTrend.ENERGY_IMPROVING)) {
      observations.push('Energy levels show positive momentum over recent sessions.');
    }
    if (trends.includes(DailyCheckInTrend.TRAINING_CONSISTENCY_IMPROVING)) {
      observations.push('Adherence to planned workouts is currently strong and consistent.');
    }
    if (trends.includes(DailyCheckInTrend.TRAINING_CONSISTENCY_DECLINING)) {
      observations.push('Multiple recent workouts were missed.');
    }

    return observations.join(' ');
  }
}
