import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AttendanceSignalsService } from './attendance-signals.service';
import { BookingSignalsService } from './booking-signals.service';
import { WorkoutSignalsService } from './workout-signals.service';
import { MembershipSignalsService } from './membership-signals.service';
import { AppEngagementService } from './app-engagement.service';
import { CheckInSignalsService } from './checkin-signals.service';
import { WearableSignalsService } from './wearable-signals.service';
import {
  EngagementSignalsBundle,
  GoalSignals,
  NutritionEngagementSignals,
} from '../engagement-intelligence.types';

@Injectable()
export class EngagementSignalService {
  private readonly logger = new Logger(EngagementSignalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceSignals: AttendanceSignalsService,
    private readonly bookingSignals: BookingSignalsService,
    private readonly workoutSignals: WorkoutSignalsService,
    private readonly membershipSignals: MembershipSignalsService,
    private readonly appEngagement: AppEngagementService,
    private readonly checkinSignals: CheckInSignalsService,
    private readonly wearableSignals: WearableSignalsService,
  ) {}

  /**
   * Orchestrates multi-domain data collection across all FitCore sources of truth.
   * Grounded, deterministic, read-only.
   */
  async collectAllSignals(
    memberId: string,
    organisationId: string,
    now: Date = new Date(),
  ): Promise<EngagementSignalsBundle> {
    const [
      attendance,
      booking,
      workout,
      membership,
      app,
      checkin,
      wearables,
      goals,
      nutrition,
    ] = await Promise.all([
      this.attendanceSignals.collect(memberId, organisationId, now),
      this.bookingSignals.collect(memberId, organisationId, now),
      this.workoutSignals.collect(memberId, organisationId, now),
      this.membershipSignals.collect(memberId, organisationId, now),
      this.appEngagement.collect(memberId, organisationId, now),
      this.checkinSignals.collect(memberId, organisationId, now),
      this.wearableSignals.collect(memberId, organisationId, now),
      this.collectGoalSignals(memberId, organisationId, now),
      this.collectNutritionSignals(memberId, organisationId, now),
    ]);

    return {
      memberId,
      organisationId,
      attendance,
      booking,
      workout,
      membership,
      app,
      checkin,
      goals,
      nutrition,
      wearables,
      collectedAt: now,
    };
  }

  private async collectGoalSignals(
    memberId: string,
    organisationId: string,
    now: Date,
  ): Promise<GoalSignals> {
    const goals = await this.prisma.trainingGoal.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
      },
      select: {
        id: true,
        status: true,
        baselineValue: true,
        currentValue: true,
        targetValue: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');

    let totalProgress = 0;
    let countedGoals = 0;
    for (const g of activeGoals) {
      if (
        g.targetValue !== null &&
        g.baselineValue !== null &&
        g.currentValue !== null &&
        g.targetValue !== g.baselineValue
      ) {
        const progress = Math.min(
          100,
          Math.max(
            0,
            ((g.currentValue - g.baselineValue) / (g.targetValue - g.baselineValue)) * 100,
          ),
        );
        totalProgress += progress;
        countedGoals++;
      }
    }

    const averageProgressPct = countedGoals > 0 ? Math.round(totalProgress / countedGoals) : 0;
    const lastGoalActivityAt = goals[0]?.updatedAt || null;

    return {
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      averageProgressPct,
      lastGoalActivityAt,
    };
  }

  private async collectNutritionSignals(
    memberId: string,
    organisationId: string,
    now: Date,
  ): Promise<NutritionEngagementSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Only aggregated logging frequency, NO individual food or calorie data exposed
    const foodLogs = await this.prisma.foodLog.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        consumedAt: { gte: d28Ago, lte: now },
      },
      select: {
        consumedAt: true,
      },
      orderBy: { consumedAt: 'desc' },
    });

    const foodLogsLast7d = foodLogs.filter((l) => l.consumedAt >= d7Ago).length;
    const foodLogsLast28d = foodLogs.length;

    const distinctDays = new Set(foodLogs.map((l) => l.consumedAt.toISOString().split('T')[0])).size;
    const trackingConsistencyScore = Math.min(100, Math.round((distinctDays / 28) * 100));
    const lastNutritionLogAt = foodLogs[0]?.consumedAt || null;

    return {
      foodLogsLast7d,
      foodLogsLast28d,
      trackingConsistencyScore,
      lastNutritionLogAt,
    };
  }
}
