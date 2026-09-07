import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ScoreBreakdown {
  attendanceScore: number;
  workoutScore: number;
  goalScore: number;
  nutritionScore: number;
  challengeScore: number;
  recencyScore: number;
  decayMultiplier: number;
}

export interface ScoreCalculationResult {
  score: number;
  calculationVersion: number;
  breakdown: ScoreBreakdown;
}

export const CURRENT_CALCULATION_VERSION = 1;

export const SCORING_WEIGHTS = {
  ATTENDANCE: 0.30,
  WORKOUT: 0.25,
  GOALS: 0.15,
  NUTRITION: 0.10,
  CHALLENGES: 0.10,
  RECENCY: 0.10,
};

@Injectable()
export class EngagementScoreService {
  private readonly logger = new Logger(EngagementScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically calculates member engagement score (0-100) using configurable weights and time-decay.
   */
  async calculateScore(memberId: string, organisationId: string): Promise<ScoreCalculationResult> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Attendance (Gym visits & classes in last 30 days) - Target: 12 visits/month = 100%
    const [visitsLast30Days, classesLast30Days] = await Promise.all([
      this.prisma.checkIn.count({
        where: {
          memberProfileId: memberId,
          checkedInAt: { gte: thirtyDaysAgo },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          memberProfileId: memberId,
          checkedInAt: { gte: thirtyDaysAgo },
          status: { in: ['CHECKED_IN', 'COMPLETED', 'ATTENDED'] },
        },
      }),
    ]);
    const totalAttendance = visitsLast30Days + classesLast30Days;
    const rawAttendanceScore = Math.min(100, (totalAttendance / 12) * 100);

    // 2. Workout activity in last 30 days - Target: 10 completed workouts/month = 100%
    const workoutsLast30Days = await this.prisma.workout.count({
      where: {
        memberProfileId: memberId,
        completedAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
    });
    const rawWorkoutScore = Math.min(100, (workoutsLast30Days / 10) * 100);

    // 3. Goal progress & completion - Active goals with progress or recently completed
    const [activeGoals, completedGoalsRecently] = await Promise.all([
      this.prisma.trainingGoal.findMany({
        where: {
          memberProfileId: memberId,
          status: 'ACTIVE',
        },
        select: { currentValue: true, targetValue: true },
      }),
      this.prisma.trainingGoal.count({
        where: {
          memberProfileId: memberId,
          status: 'COMPLETED',
          completedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    let goalProgressSum = 0;
    for (const g of activeGoals) {
      if (g.targetValue && g.targetValue > 0) {
        goalProgressSum += Math.min(1, (g.currentValue ?? 0) / g.targetValue);
      } else {
        goalProgressSum += 0.5;
      }
    }
    const avgGoalProgress = activeGoals.length > 0 ? (goalProgressSum / activeGoals.length) * 100 : 0;
    const rawGoalScore = Math.min(100, avgGoalProgress + completedGoalsRecently * 25);

    // 4. Nutrition logging in last 30 days - Target: 20 logged meals/month = 100%
    const foodLogsLast30Days = await this.prisma.foodLog.count({
      where: {
        memberProfileId: memberId,
        consumedAt: { gte: thirtyDaysAgo },
      },
    });
    const rawNutritionScore = Math.min(100, (foodLogsLast30Days / 20) * 100);

    // 5. Challenges participation & completion in last 30 days
    const challengeParticipations = await this.prisma.challengeParticipant.findMany({
      where: {
        memberId,
        organisationId,
      },
      select: { status: true, currentProgress: true, target: true },
    });

    let challengeScoreAccumulator = 0;
    for (const cp of challengeParticipations) {
      if (cp.status === 'COMPLETED') {
        challengeScoreAccumulator += 50;
      } else if (cp.status === 'IN_PROGRESS' || cp.status === 'JOINED') {
        const progressPct = cp.target > 0 ? (cp.currentProgress / cp.target) * 30 : 15;
        challengeScoreAccumulator += progressPct;
      }
    }
    const rawChallengeScore = Math.min(100, challengeScoreAccumulator);

    // 6. Recency / Time Decay Analysis
    const lastEvent = await this.prisma.engagementEvent.findFirst({
      where: { memberId },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });

    let decayMultiplier = 0.2;
    let recencyScore = 10;
    if (lastEvent) {
      const lastOccurred = new Date(lastEvent.occurredAt);
      if (lastOccurred >= sevenDaysAgo) {
        decayMultiplier = 1.0;
        recencyScore = 100;
      } else if (lastOccurred >= fourteenDaysAgo) {
        decayMultiplier = 0.75;
        recencyScore = 60;
      } else if (lastOccurred >= thirtyDaysAgo) {
        decayMultiplier = 0.50;
        recencyScore = 30;
      } else {
        decayMultiplier = 0.20;
        recencyScore = 10;
      }
    }

    // Weighted aggregation
    const weightedBaseScore =
      rawAttendanceScore * SCORING_WEIGHTS.ATTENDANCE +
      rawWorkoutScore * SCORING_WEIGHTS.WORKOUT +
      rawGoalScore * SCORING_WEIGHTS.GOALS +
      rawNutritionScore * SCORING_WEIGHTS.NUTRITION +
      rawChallengeScore * SCORING_WEIGHTS.CHALLENGES +
      recencyScore * SCORING_WEIGHTS.RECENCY;

    const finalScore = Math.round(Math.min(100, Math.max(0, weightedBaseScore * (0.5 + 0.5 * decayMultiplier))) * 10) / 10;

    const breakdown: ScoreBreakdown = {
      attendanceScore: Math.round(rawAttendanceScore * 10) / 10,
      workoutScore: Math.round(rawWorkoutScore * 10) / 10,
      goalScore: Math.round(rawGoalScore * 10) / 10,
      nutritionScore: Math.round(rawNutritionScore * 10) / 10,
      challengeScore: Math.round(rawChallengeScore * 10) / 10,
      recencyScore: Math.round(recencyScore * 10) / 10,
      decayMultiplier,
    };

    return {
      score: finalScore,
      calculationVersion: CURRENT_CALCULATION_VERSION,
      breakdown,
    };
  }

  /**
   * Calculates score and persists an immutable snapshot for historical auditability.
   */
  async recordSnapshot(
    memberId: string,
    organisationId: string,
    engagementLevel: string,
  ): Promise<ScoreCalculationResult> {
    const calc = await this.calculateScore(memberId, organisationId);

    await this.prisma.engagementScoreSnapshot.create({
      data: {
        organisationId,
        memberId,
        score: calc.score,
        engagementLevel,
        calculationVersion: calc.calculationVersion,
        scoreBreakdown: calc.breakdown as any,
      },
    });

    return calc;
  }
}
