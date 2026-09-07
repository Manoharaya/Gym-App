import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { BodyMeasurementService } from './body-measurement.service';

export interface EvaluatedPRResult {
  recordType: string;
  isNewPR: boolean;
  value: number;
  unit: string;
  previousValue?: number | null;
  improvementPercentage?: number | null;
  recordId?: string;
}

@Injectable()
export class PersonalRecordService {
  private readonly logger = new Logger(PersonalRecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly measurementService: BodyMeasurementService,
  ) {}

  /**
   * Evaluates workout sets for an exercise to check if any new PRs were achieved.
   * Only completed sets in non-cancelled workouts are considered.
   */
  async evaluateWorkoutForPRs(
    organisationId: string,
    workoutId: string,
    actor?: AuthenticatedUser,
  ): Promise<EvaluatedPRResult[]> {
    const workout = await this.prisma.workout.findFirst({
      where: { id: workoutId, organisationId },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              where: { completed: true },
              orderBy: { setNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!workout || workout.status === 'CANCELLED' || workout.status === 'DRAFT') {
      return [];
    }

    const memberProfileId = workout.memberProfileId;
    const results: EvaluatedPRResult[] = [];

    for (const we of workout.exercises) {
      if (!we.sets || we.sets.length === 0) continue;

      const exerciseId = we.exerciseId;

      // 1. Evaluate MAX_WEIGHT (for STRENGTH or load-bearing exercises)
      const validLoadSets = we.sets.filter(
        (s) => s.actualLoad !== null && s.actualLoad > 0 && (s.actualReps === null || s.actualReps > 0),
      );

      if (validLoadSets.length > 0) {
        // Find maximum load set in this workout
        const maxLoadSet = validLoadSets.reduce((max, s) =>
          (s.actualLoad || 0) > (max.actualLoad || 0) ? s : max,
        );

        if (maxLoadSet.actualLoad) {
          const prCheck = await this.checkAndRecordPR({
            organisationId,
            memberProfileId,
            exerciseId,
            recordType: 'MAX_WEIGHT',
            value: maxLoadSet.actualLoad,
            unit: maxLoadSet.loadUnit || 'KG',
            workoutId: workout.id,
            workoutExerciseId: we.id,
            workoutSetId: maxLoadSet.id,
            achievedAt: maxLoadSet.completedAt || workout.completedAt || new Date(),
            actor,
          });

          if (prCheck) results.push(prCheck);
        }
      }

      // 2. Evaluate MAX_REPS
      const validRepSets = we.sets.filter((s) => s.actualReps !== null && s.actualReps > 0);
      if (validRepSets.length > 0) {
        const maxRepSet = validRepSets.reduce((max, s) =>
          (s.actualReps || 0) > (max.actualReps || 0) ? s : max,
        );

        if (maxRepSet.actualReps) {
          const prCheck = await this.checkAndRecordPR({
            organisationId,
            memberProfileId,
            exerciseId,
            recordType: 'MAX_REPS',
            value: maxRepSet.actualReps,
            unit: 'reps',
            workoutId: workout.id,
            workoutExerciseId: we.id,
            workoutSetId: maxRepSet.id,
            achievedAt: maxRepSet.completedAt || workout.completedAt || new Date(),
            actor,
          });

          if (prCheck) results.push(prCheck);
        }
      }

      // 3. Evaluate MAX_VOLUME (single set tonnage: load * reps)
      const volumeSets = we.sets.filter(
        (s) => s.actualLoad && s.actualLoad > 0 && s.actualReps && s.actualReps > 0,
      );
      if (volumeSets.length > 0) {
        const setVolumes = volumeSets.map((s) => ({
          set: s,
          vol: (s.actualLoad || 0) * (s.actualReps || 0),
        }));
        const maxVolSet = setVolumes.reduce((max, cur) => (cur.vol > max.vol ? cur : max));

        const prCheck = await this.checkAndRecordPR({
          organisationId,
          memberProfileId,
          exerciseId,
          recordType: 'MAX_VOLUME',
          value: Number(maxVolSet.vol.toFixed(1)),
          unit: `${maxVolSet.set.loadUnit || 'KG'}xReps`,
          workoutId: workout.id,
          workoutExerciseId: we.id,
          workoutSetId: maxVolSet.set.id,
          achievedAt: maxVolSet.set.completedAt || workout.completedAt || new Date(),
          actor,
        });

        if (prCheck) results.push(prCheck);
      }

      // 4. Evaluate CARDIO metrics (LONGEST_DISTANCE, FASTEST_TIME)
      const distanceSets = we.sets.filter((s) => s.actualDistance && s.actualDistance > 0);
      if (distanceSets.length > 0) {
        const maxDistSet = distanceSets.reduce((max, s) =>
          (s.actualDistance || 0) > (max.actualDistance || 0) ? s : max,
        );
        if (maxDistSet.actualDistance) {
          const prCheck = await this.checkAndRecordPR({
            organisationId,
            memberProfileId,
            exerciseId,
            recordType: 'LONGEST_DISTANCE',
            value: maxDistSet.actualDistance,
            unit: maxDistSet.distanceUnit || 'KM',
            workoutId: workout.id,
            workoutExerciseId: we.id,
            workoutSetId: maxDistSet.id,
            achievedAt: maxDistSet.completedAt || workout.completedAt || new Date(),
            actor,
          });
          if (prCheck) results.push(prCheck);
        }
      }
    }

    return results;
  }

  /**
   * Internal helper to check candidate performance against previous PR and persist if beaten.
   */
  private async checkAndRecordPR(params: {
    organisationId: string;
    memberProfileId: string;
    exerciseId: string;
    recordType: string;
    value: number;
    unit: string;
    workoutId: string;
    workoutExerciseId: string;
    workoutSetId: string;
    achievedAt: Date;
    actor?: AuthenticatedUser;
  }): Promise<EvaluatedPRResult | null> {
    const {
      organisationId,
      memberProfileId,
      exerciseId,
      recordType,
      value,
      unit,
      workoutId,
      workoutExerciseId,
      workoutSetId,
      achievedAt,
      actor,
    } = params;

    // Find current best PR for this member, exercise, and recordType
    const currentBest = await this.prisma.personalRecord.findFirst({
      where: {
        organisationId,
        memberProfileId,
        exerciseId,
        recordType,
      },
      orderBy: { value: 'desc' },
    });

    let isBetter = false;
    if (!currentBest) {
      isBetter = true;
    } else if (recordType === 'FASTEST_TIME') {
      isBetter = value < currentBest.value;
    } else {
      isBetter = value > currentBest.value;
    }

    if (!isBetter) {
      return null;
    }

    // Calculate improvement percentage
    let improvementPercentage: number | null = null;
    if (currentBest && currentBest.value > 0) {
      if (recordType === 'FASTEST_TIME') {
        improvementPercentage = Number((((currentBest.value - value) / currentBest.value) * 100).toFixed(1));
      } else {
        improvementPercentage = Number((((value - currentBest.value) / currentBest.value) * 100).toFixed(1));
      }
    }

    const pr = await this.prisma.personalRecord.create({
      data: {
        organisationId,
        memberProfileId,
        exerciseId,
        recordType,
        value,
        unit,
        workoutId,
        workoutExerciseId,
        workoutSetId,
        achievedAt,
        previousValue: currentBest ? currentBest.value : null,
        improvementPercentage,
      },
    });

    if (actor) {
      await this.auditService.log({
        organisationId,
        userId: actor.id,
        action: 'PERSONAL_RECORD_CREATED',
        resource: 'personal_records',
        resourceId: pr.id,
        metadata: {
          memberProfileId,
          exerciseId,
          recordType,
          value,
          previousValue: currentBest?.value,
        },
      });
    }

    return {
      recordType,
      isNewPR: true,
      value,
      unit,
      previousValue: currentBest ? currentBest.value : null,
      improvementPercentage,
      recordId: pr.id,
    };
  }

  /**
   * Retrieves all personal records for a member, optionally filtered by exercise.
   */
  async getMemberPRs(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
    exerciseId?: string,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    return this.prisma.personalRecord.findMany({
      where: {
        organisationId,
        memberProfileId,
        ...(exerciseId ? { exerciseId } : {}),
      },
      include: {
        exercise: true,
        workout: { select: { id: true, title: true, completedAt: true } },
      },
      orderBy: { achievedAt: 'desc' },
    });
  }

  /**
   * Retrieves the current best PR for each exercise.
   */
  async getMemberBestPRs(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    const prs = await this.prisma.personalRecord.findMany({
      where: {
        organisationId,
        memberProfileId,
      },
      include: {
        exercise: true,
      },
      orderBy: [{ value: 'desc' }, { achievedAt: 'desc' }],
    });

    // Group by exerciseId + recordType to take the best
    const bestMap = new Map<string, (typeof prs)[0]>();
    for (const pr of prs) {
      const key = `${pr.exerciseId}:${pr.recordType}`;
      if (!bestMap.has(key)) {
        bestMap.set(key, pr);
      }
    }

    return Array.from(bestMap.values());
  }

  /**
   * Recalculates personal records from all historical completed workouts.
   */
  async recalculateMemberPRs(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    const workouts = await this.prisma.workout.findMany({
      where: {
        organisationId,
        memberProfileId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'asc' },
      select: { id: true },
    });

    // Clear existing PRs for a clean chronological replay
    await this.prisma.personalRecord.deleteMany({
      where: { organisationId, memberProfileId },
    });

    let totalNewPRs = 0;
    for (const w of workouts) {
      const evaluated = await this.evaluateWorkoutForPRs(organisationId, w.id, actor);
      totalNewPRs += evaluated.length;
    }

    return {
      workoutsProcessed: workouts.length,
      totalPRsCreated: totalNewPRs,
    };
  }
}
