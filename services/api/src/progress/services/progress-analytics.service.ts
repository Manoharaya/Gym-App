import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { BodyMeasurementService } from './body-measurement.service';
import { AdherenceAnalyticsService } from './adherence-analytics.service';
import { PersonalRecordService } from './personal-record.service';
import { GoalProgressService } from './goal-progress.service';
import { FitnessAssessmentService } from './fitness-assessment.service';

export interface ExercisePerformanceAnalytics {
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // in kg
  maxLoad: number;
  averageRpe: number | null;
}

export interface ProgressComparisonResult {
  memberProfileId: string;
  primaryPeriod: {
    period: string;
    workoutsCompleted: number;
    tonnage: number;
    adherenceRate: number;
  };
  comparisonPeriod: {
    period: string;
    workoutsCompleted: number;
    tonnage: number;
    adherenceRate: number;
  };
  deltas: {
    workoutsChange: number;
    tonnageChange: number;
    adherenceChange: number;
  };
}

@Injectable()
export class ProgressAnalyticsService {
  private readonly logger = new Logger(ProgressAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly measurementService: BodyMeasurementService,
    private readonly adherenceService: AdherenceAnalyticsService,
    private readonly prService: PersonalRecordService,
    private readonly goalService: GoalProgressService,
    private readonly assessmentService: FitnessAssessmentService,
  ) {}

  /**
   * Generates a unified, multi-dimensional progress overview for a member.
   * Utilizes Redis caching with tenant and member-scoped keys.
   */
  async getMemberProgressSummary(
    organisationId: string,
    memberProfileId: string,
    period: string = '30D',
    actor: AuthenticatedUser,
    bypassCache: boolean = false,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    const cacheKey = `org:${organisationId}:member:${memberProfileId}:progress:${period}`;

    if (!bypassCache) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore parsing error and recompute
        }
      }
    }

    const { rangeStart, rangeEnd } = this.adherenceService.resolveDateRange(period);

    // 1. Adherence metrics
    const adherence = await this.adherenceService.calculateMemberAdherence(
      organisationId,
      memberProfileId,
      period,
      rangeStart,
      rangeEnd,
    );

    // 2. Training volume & workout performance
    const volumeData = await this.calculateTrainingVolume(
      organisationId,
      memberProfileId,
      rangeStart,
      rangeEnd,
    );

    // 3. Recent measurements
    const recentMeasurements = await this.prisma.bodyMeasurement.findMany({
      where: { organisationId, memberProfileId },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    });

    // 4. Personal records
    const bestPRs = await this.prService.getMemberBestPRs(
      organisationId,
      memberProfileId,
      actor,
    );

    // 5. Active goal progress
    const activeGoals = await this.goalService.getMemberGoalProgress(
      organisationId,
      memberProfileId,
      actor,
      'ACTIVE',
    );

    // 6. Recent assessments
    const recentAssessments = await this.assessmentService.getMemberAssessments(
      organisationId,
      memberProfileId,
      actor,
    );

    const summary = {
      memberProfileId,
      organisationId,
      period,
      adherence,
      workoutsCompleted: volumeData.workoutsCompleted,
      totalTonnageLifted: volumeData.totalTonnage,
      exercisesCompleted: volumeData.exercisesCompleted,
      exerciseAnalytics: volumeData.exerciseAnalytics,
      recentMeasurements,
      personalRecords: bestPRs,
      activeGoals,
      recentAssessments: recentAssessments.slice(0, 5),
      generatedAt: new Date().toISOString(),
    };

    // Cache for 300 seconds
    await this.redis.set(cacheKey, JSON.stringify(summary), 300);

    return summary;
  }

  /**
   * Calculates training volume (tonnage = load * reps) across completed workouts in the period.
   * Only calculates tonnage for load-bearing exercises where load * reps is applicable.
   */
  async calculateTrainingVolume(
    organisationId: string,
    memberProfileId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    workoutsCompleted: number;
    totalTonnage: number;
    exercisesCompleted: number;
    exerciseAnalytics: ExercisePerformanceAnalytics[];
  }> {
    const workoutWhere: any = {
      organisationId,
      memberProfileId,
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      workoutWhere.completedAt = {};
      if (startDate) workoutWhere.completedAt.gte = startDate;
      if (endDate) workoutWhere.completedAt.lte = endDate;
    }

    const completedWorkouts = await this.prisma.workout.findMany({
      where: workoutWhere,
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              where: { completed: true },
            },
          },
        },
      },
    });

    let totalTonnage = 0;
    let totalExercisesCount = 0;
    const exerciseMap = new Map<string, ExercisePerformanceAnalytics>();

    for (const w of completedWorkouts) {
      for (const we of w.exercises) {
        totalExercisesCount++;
        const ex = we.exercise;
        const exId = ex.id;

        if (!exerciseMap.has(exId)) {
          exerciseMap.set(exId, {
            exerciseId: exId,
            exerciseName: ex.name,
            exerciseType: ex.exerciseType,
            totalSets: 0,
            totalReps: 0,
            totalVolume: 0,
            maxLoad: 0,
            averageRpe: null,
          });
        }

        const stats = exerciseMap.get(exId)!;
        let rpeSum = 0;
        let rpeCount = 0;

        for (const s of we.sets) {
          stats.totalSets++;
          if (s.actualReps) {
            stats.totalReps += s.actualReps;
          }

          if (s.actualLoad && s.actualLoad > 0) {
            if (s.actualLoad > stats.maxLoad) {
              stats.maxLoad = s.actualLoad;
            }

            // Tonnage only applies if load > 0 and reps > 0
            if (s.actualReps && s.actualReps > 0) {
              const setTonnage = s.actualLoad * s.actualReps;
              stats.totalVolume += setTonnage;
              totalTonnage += setTonnage;
            }
          }

          if (s.actualRPE) {
            rpeSum += s.actualRPE;
            rpeCount++;
          }
        }

        if (rpeCount > 0) {
          stats.averageRpe = Number((rpeSum / rpeCount).toFixed(1));
        }
      }
    }

    return {
      workoutsCompleted: completedWorkouts.length,
      totalTonnage: Number(totalTonnage.toFixed(1)),
      exercisesCompleted: totalExercisesCount,
      exerciseAnalytics: Array.from(exerciseMap.values()),
    };
  }

  /**
   * Compares two distinct time periods (e.g. Last 30 Days vs Prior 30 Days).
   */
  async comparePeriods(
    organisationId: string,
    memberProfileId: string,
    period: string = '30D',
    actor: AuthenticatedUser,
  ): Promise<ProgressComparisonResult> {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    const now = new Date();
    let days = 30;
    if (period === '7D') days = 7;
    else if (period === '14D') days = 14;
    else if (period === '90D') days = 90;

    const primaryEnd = now;
    const primaryStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const comparisonEnd = primaryStart;
    const comparisonStart = new Date(primaryStart.getTime() - days * 24 * 60 * 60 * 1000);

    const [primaryVol, primaryAdherence, compVol, compAdherence] = await Promise.all([
      this.calculateTrainingVolume(organisationId, memberProfileId, primaryStart, primaryEnd),
      this.adherenceService.calculateMemberAdherence(
        organisationId,
        memberProfileId,
        period,
        primaryStart,
        primaryEnd,
      ),
      this.calculateTrainingVolume(organisationId, memberProfileId, comparisonStart, comparisonEnd),
      this.adherenceService.calculateMemberAdherence(
        organisationId,
        memberProfileId,
        period,
        comparisonStart,
        comparisonEnd,
      ),
    ]);

    return {
      memberProfileId,
      primaryPeriod: {
        period: `Current ${period}`,
        workoutsCompleted: primaryVol.workoutsCompleted,
        tonnage: primaryVol.totalTonnage,
        adherenceRate: primaryAdherence.adherenceRate,
      },
      comparisonPeriod: {
        period: `Previous ${period}`,
        workoutsCompleted: compVol.workoutsCompleted,
        tonnage: compVol.totalTonnage,
        adherenceRate: compAdherence.adherenceRate,
      },
      deltas: {
        workoutsChange: primaryVol.workoutsCompleted - compVol.workoutsCompleted,
        tonnageChange: Number((primaryVol.totalTonnage - compVol.totalTonnage).toFixed(1)),
        adherenceChange: primaryAdherence.adherenceRate - compAdherence.adherenceRate,
      },
    };
  }

  /**
   * Invalidate cached progress for a member.
   */
  async invalidateMemberCache(organisationId: string, memberProfileId: string) {
    const periods = ['7D', '14D', '30D', '90D', '6M', '1Y', 'ALL'];
    for (const p of periods) {
      await this.redis.del(`org:${organisationId}:member:${memberProfileId}:progress:${p}`);
    }
  }

  /**
   * Creates an immutable point-in-time progress snapshot.
   */
  async createSnapshot(
    organisationId: string,
    memberProfileId: string,
    period: string = '30D',
    actor: AuthenticatedUser,
  ) {
    const summary = await this.getMemberProgressSummary(
      organisationId,
      memberProfileId,
      period,
      actor,
      true,
    );

    return this.prisma.progressSnapshot.create({
      data: {
        organisationId,
        memberProfileId,
        snapshotDate: new Date(),
        period,
        adherenceRate: summary.adherence.adherenceRate,
        workoutsCompleted: summary.workoutsCompleted,
        tonnageLifted: summary.totalTonnageLifted,
        prsAchieved: summary.personalRecords.length,
        measurementsSummary: { count: summary.recentMeasurements.length },
        assessmentsSummary: { count: summary.recentAssessments.length },
        goalProgressSummary: { activeGoals: summary.activeGoals },
      },
    });
  }
}
