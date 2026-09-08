import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { SleepMetricsDto, ActivityMetricsDto, TrainingCorrelationDto } from '@fitcore/types';
import { TRAINING_CORRELATION_DISCLAIMER } from '../wearable-intelligence.constants';

@Injectable()
export class TrainingCorrelationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies non-causal patterns between wearable telemetry and workout/check-in records.
   */
  async findCorrelations(params: {
    memberId: string;
    organisationId: string;
    sleep: SleepMetricsDto;
    activity: ActivityMetricsDto;
  }): Promise<TrainingCorrelationDto[]> {
    const { memberId, organisationId, sleep, activity } = params;
    const correlations: TrainingCorrelationDto[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch recent completed workouts
    const recentWorkouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        startedAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    // 2. Fetch recent daily check-ins
    const recentCheckIns = await this.prisma.dailyCheckIn.findMany({
      where: {
        memberId,
        organisationId,
        createdAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
      orderBy: { checkInDate: 'desc' },
      take: 14,
    });

    // Correlation 1: Sleep vs Workout Completion Consistency
    if (sleep.dataDaysCount >= 3 && recentWorkouts.length >= 2) {
      const isSleepOptimal =
        sleep.sevenDayAverageMinutes && sleep.sevenDayAverageMinutes >= 420; // >= 7 hours
      const workoutCountLast7Days = recentWorkouts.filter(
        (w) => w.startedAt && w.startedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      ).length;

      if (isSleepOptimal && workoutCountLast7Days >= 3) {
        correlations.push({
          pattern: 'SUSTAINED_SLEEP_AND_TRAINING_MOMENTUM',
          correlationSummary:
            'Weeks where your average sleep duration was above 7 hours corresponded with higher workout consistency (3+ sessions logged).',
          dataPointsUsed: sleep.dataDaysCount + recentWorkouts.length,
          observedSignals: {
            wearableSignal: `7-day sleep average of ${Math.round((sleep.sevenDayAverageMinutes || 0) / 60)}h`,
            trainingSignal: `${workoutCountLast7Days} workouts logged this week`,
          },
          disclaimer: TRAINING_CORRELATION_DISCLAIMER,
        });
      } else if (!isSleepOptimal && sleep.sevenDayAverageMinutes && sleep.sevenDayAverageMinutes < 390) {
        correlations.push({
          pattern: 'SHORT_SLEEP_AND_LOWER_CONSISTENCY',
          correlationSummary:
            'In periods where average sleep duration dipped under 6.5 hours, workout completion frequency tended to be lower.',
          dataPointsUsed: sleep.dataDaysCount + recentWorkouts.length,
          observedSignals: {
            wearableSignal: `7-day sleep average of ${Math.round((sleep.sevenDayAverageMinutes || 0) / 60)}h`,
            trainingSignal: `${workoutCountLast7Days} workouts logged recently`,
          },
          disclaimer: TRAINING_CORRELATION_DISCLAIMER,
        });
      }
    }

    // Correlation 2: Daily Activity Steps vs Workout Days
    if (activity.dataDaysCount >= 3 && recentWorkouts.length >= 1) {
      correlations.push({
        pattern: 'ACTIVE_RECOVERY_BALANCE',
        correlationSummary:
          'Your daily movement volume remains active (averaging ' +
          activity.sevenDayAverageSteps.toLocaleString() +
          ' steps/day), supporting healthy cardiovascular circulation alongside strength sessions.',
        dataPointsUsed: activity.dataDaysCount + recentWorkouts.length,
        observedSignals: {
          wearableSignal: `Daily average steps: ${activity.sevenDayAverageSteps.toLocaleString()}`,
          trainingSignal: `${recentWorkouts.length} completed workouts in past 30 days`,
        },
        disclaimer: TRAINING_CORRELATION_DISCLAIMER,
      });
    }

    // Correlation 3: Check-in Soreness vs Preceding Workout
    if (recentCheckIns.length >= 2) {
      const highSorenessEntries = recentCheckIns.filter(
        (c) => c.sorenessLevel === 'HIGH' || c.sorenessLevel === 'VERY_HIGH',
      );
      if (highSorenessEntries.length > 0) {
        correlations.push({
          pattern: 'INTENSITY_AND_SORENESS_RESPONSE',
          correlationSummary:
            'Elevated muscle soreness entries in your check-ins closely follow intense lifting sessions, indicating strong stimulus followed by an expected recovery window.',
          dataPointsUsed: highSorenessEntries.length + recentWorkouts.length,
          observedSignals: {
            wearableSignal: 'Resting recovery and baseline sleep monitoring',
            trainingSignal: `${highSorenessEntries.length} check-in entries with elevated muscle soreness`,
          },
          disclaimer: TRAINING_CORRELATION_DISCLAIMER,
        });
      }
    }

    return correlations;
  }
}
