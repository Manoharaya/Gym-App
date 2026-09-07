import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { LogWorkoutSetDto, CorrectWorkoutSetDto } from '../dto/workout.dto';
import { WorkoutsService } from './workouts.service';

@Injectable()
export class WorkoutPerformanceService {
  private readonly logger = new Logger(WorkoutPerformanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workoutsService: WorkoutsService,
  ) {}

  /**
   * Record a performed set for an assigned workout exercise.
   * Features:
   * - Idempotency deduplication via idempotencyKey
   * - Auto-transitions parent workout to IN_PROGRESS if SCHEDULED
   * - Sets completedAt timestamp
   */
  async logSet(
    organisationId: string,
    workoutExerciseId: string,
    dto: LogWorkoutSetDto,
    actor: AuthenticatedUser,
  ) {
    const workoutExercise = await this.prisma.workoutExercise.findFirst({
      where: { id: workoutExerciseId },
      include: {
        workout: true,
      },
    });

    if (!workoutExercise || workoutExercise.workout.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'WORKOUT_EXERCISE_NOT_FOUND',
        message: `Workout exercise '${workoutExerciseId}' not found`,
      });
    }

    const { workout } = workoutExercise;

    if (workout.status === 'COMPLETED' || workout.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'WORKOUT_IMMUTABLE',
        message: `Cannot log sets to a ${workout.status} workout`,
      });
    }

    // Verify actor access
    await this.workoutsService.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    // Check idempotency key for network replay safety
    if (dto.idempotencyKey) {
      const existing = await this.prisma.workoutSet.findFirst({
        where: {
          workoutExerciseId,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const now = new Date();

    try {
      // Transaction to create set and update parent states
      const set = await this.prisma.$transaction(async (tx) => {
        // Auto-start workout if still scheduled
        if (workout.status === 'SCHEDULED' || workout.status === 'ASSIGNED') {
          await tx.workout.update({
            where: { id: workout.id },
            data: {
              status: 'IN_PROGRESS',
              startedAt: now,
            },
          });
        }

        // Update exercise status to IN_PROGRESS
        if (workoutExercise.status === 'PENDING') {
          await tx.workoutExercise.update({
            where: { id: workoutExercise.id },
            data: { status: 'IN_PROGRESS' },
          });
        }

        return tx.workoutSet.create({
          data: {
            workoutExerciseId,
            setNumber: dto.setNumber,
            targetReps: dto.targetReps ?? workoutExercise.targetReps,
            actualReps: dto.actualReps,
            targetLoad: dto.targetLoad ?? workoutExercise.targetLoad,
            actualLoad: dto.actualLoad,
            loadUnit: dto.loadUnit ?? 'KG',
            targetDurationSeconds: dto.actualDurationSeconds ?? workoutExercise.targetDurationSeconds,
            actualDurationSeconds: dto.actualDurationSeconds,
            targetDistance: dto.actualDistance ?? workoutExercise.targetDistance,
            actualDistance: dto.actualDistance,
            distanceUnit: dto.distanceUnit,
            targetRPE: dto.actualRpe ?? workoutExercise.targetRPE,
            actualRPE: dto.actualRpe,
            completed: dto.isCompleted ?? true,
            completedAt: now,
            notes: dto.notes,
            idempotencyKey: dto.idempotencyKey,
          },
        });
      });

      return set;
    } catch (error: any) {
      if (dto.idempotencyKey && (error.code === 'P2002' || error.message?.includes('idempotencyKey'))) {
        const existing = await this.prisma.workoutSet.findFirst({
          where: {
            workoutExerciseId,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Retroactive set correction with audit trail
   */
  async correctSet(
    organisationId: string,
    setId: string,
    dto: CorrectWorkoutSetDto,
    actor: AuthenticatedUser,
  ) {
    const set = await this.prisma.workoutSet.findFirst({
      where: { id: setId },
      include: {
        workoutExercise: {
          include: { workout: true },
        },
      },
    });

    if (!set || set.workoutExercise.workout.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'WORKOUT_SET_NOT_FOUND',
        message: `Workout set '${setId}' not found`,
      });
    }

    const { workout } = set.workoutExercise;

    // Verify actor access
    await this.workoutsService.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    // Create correction audit record and update set in a transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workoutSetCorrection.create({
        data: {
          workoutSetId: set.id,
          correctedByUserId: actor.id,
          previousReps: set.actualReps,
          newReps: dto.actualReps ?? set.actualReps,
          previousLoad: set.actualLoad,
          newLoad: dto.actualLoad ?? set.actualLoad,
          previousRPE: set.actualRPE,
          newRPE: dto.actualRpe ?? set.actualRPE,
          reason: dto.reason,
        },
      });

      return tx.workoutSet.update({
        where: { id: setId },
        data: {
          actualReps: dto.actualReps ?? set.actualReps,
          actualLoad: dto.actualLoad ?? set.actualLoad,
          loadUnit: dto.loadUnit ?? set.loadUnit,
          actualDurationSeconds: dto.actualDurationSeconds ?? set.actualDurationSeconds,
          actualDistance: dto.actualDistance ?? set.actualDistance,
          distanceUnit: dto.distanceUnit ?? set.distanceUnit,
          actualRPE: dto.actualRpe ?? set.actualRPE,
          completed: dto.isCompleted ?? set.completed,
        },
        include: {
          corrections: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_SET_CORRECTED',
      resource: 'workouts',
      resourceId: workout.id,
      metadata: {
        setId: set.id,
        reason: dto.reason,
      },
    });

    return updated;
  }

  /**
   * Delete set
   */
  async deleteSet(organisationId: string, setId: string, actor: AuthenticatedUser) {
    const set = await this.prisma.workoutSet.findFirst({
      where: { id: setId },
      include: {
        workoutExercise: {
          include: { workout: true },
        },
      },
    });

    if (!set || set.workoutExercise.workout.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'WORKOUT_SET_NOT_FOUND',
        message: `Workout set '${setId}' not found`,
      });
    }

    const { workout } = set.workoutExercise;
    if (workout.status === 'COMPLETED') {
      throw new BadRequestException({
        code: 'WORKOUT_ALREADY_COMPLETED',
        message: 'Cannot delete sets from a completed workout',
      });
    }

    await this.workoutsService.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    await this.prisma.workoutSet.delete({
      where: { id: setId },
    });

    return { success: true };
  }
}
