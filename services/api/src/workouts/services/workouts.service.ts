import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  AssignWorkoutDto,
  CompleteWorkoutDto,
  WorkoutQueryDto,
} from '../dto/workout.dto';

@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private hasRole(actor: AuthenticatedUser, role: string, organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => r.role === role && (!organisationId || r.organisationId === organisationId));
  }

  private hasAnyRole(actor: AuthenticatedUser, roles: string[], organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => roles.includes(r.role) && (!organisationId || r.organisationId === organisationId));
  }

  /**
   * Resolve trainer profile for actor or validate explicit trainer ID
   */
  private async resolveTrainerProfile(
    organisationId: string,
    explicitTrainerId: string | undefined,
    actor: AuthenticatedUser,
  ) {
    const isTrainerActor = this.hasRole(actor, 'TRAINER') && !this.hasAnyRole(actor, [
      'SUPERADMIN',
      'ORGANISATION_OWNER',
      'OUTLET_MANAGER',
    ]);

    if (isTrainerActor) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: {
          organisationId,
          staffProfile: { userId: actor.id },
          status: 'ACTIVE',
        },
      });
      if (!trainer) {
        throw new ForbiddenException({
          code: 'TRAINER_NOT_FOUND',
          message: 'Active trainer profile not found for user',
        });
      }
      return trainer.id;
    }

    if (explicitTrainerId) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { id: explicitTrainerId, organisationId },
      });
      if (!trainer) {
        throw new NotFoundException({
          code: 'TRAINER_NOT_FOUND',
          message: `Trainer '${explicitTrainerId}' not found in organisation`,
        });
      }
      return trainer.id;
    }

    return null;
  }

  /**
   * Asserts actor has authorization to program/assign or access workouts for a member
   */
  async assertMemberAccess(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberProfileId, organisationId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: `Member '${memberProfileId}' not found in organisation`,
      });
    }

    const isManagement = this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'], organisationId);
    if (isManagement) {
      return { member };
    }

    const isMemberSelf = this.hasRole(actor, 'MEMBER') && member.userId === actor.id;
    if (isMemberSelf) {
      return { member };
    }

    const isTrainer = this.hasRole(actor, 'TRAINER');
    if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: {
          organisationId,
          staffProfile: { userId: actor.id },
          status: 'ACTIVE',
        },
      });

      if (!trainer) {
        throw new ForbiddenException({
          code: 'TRAINER_NOT_FOUND',
          message: 'Active trainer profile not found for user',
        });
      }

      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: {
          organisationId,
          memberProfileId,
          trainerProfileId: trainer.id,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new ForbiddenException({
          code: 'TRAINER_CLIENT_NOT_ASSIGNED',
          message: 'Trainer is not actively assigned to this member',
        });
      }

      return { member, trainerProfileId: trainer.id };
    }

    throw new ForbiddenException({
      code: 'UNAUTHORIZED_MEMBER_ACCESS',
      message: 'Not authorized to access or manage this member workouts',
    });
  }

  /**
   * Assign / Create a Workout for a Member
   * Copies exercise definitions into immutable snapshots!
   */
  async assignWorkout(organisationId: string, dto: AssignWorkoutDto, actor: AuthenticatedUser) {
    const { member, trainerProfileId: resolvedTrainerFromAssignment } = await this.assertMemberAccess(
      organisationId,
      dto.memberProfileId,
      actor,
    );

    const trainerProfileId = resolvedTrainerFromAssignment || (await this.resolveTrainerProfile(
      organisationId,
      dto.trainerProfileId,
      actor,
    ));

    // Validate training program link if supplied
    if (dto.trainingProgramId) {
      const prog = await this.prisma.trainingProgram.findFirst({
        where: { id: dto.trainingProgramId, organisationId, memberProfileId: member.id },
      });
      if (!prog) {
        throw new BadRequestException({
          code: 'TRAINING_PROGRAM_INVALID',
          message: 'Referenced training program does not belong to this member/organisation',
        });
      }
    }

    // Validate PT session link if supplied
    if (dto.personalTrainingSessionId) {
      const session = await this.prisma.personalTrainingSession.findFirst({
        where: { id: dto.personalTrainingSessionId, organisationId, memberProfileId: member.id },
      });
      if (!session) {
        throw new BadRequestException({
          code: 'PT_SESSION_INVALID',
          message: 'Referenced PT session does not belong to this member/organisation',
        });
      }
    }

    // Determine exercises to instantiate (either from template or from explicit list)
    let exercisesToCreate: any[] = [];

    if (dto.templateId) {
      const template = await this.prisma.workoutTemplate.findFirst({
        where: { id: dto.templateId, organisationId },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!template) {
        throw new NotFoundException({
          code: 'WORKOUT_TEMPLATE_NOT_FOUND',
          message: `Template '${dto.templateId}' not found`,
        });
      }

      exercisesToCreate = template.exercises.map((te) => ({
        exerciseId: te.exerciseId,
        orderIndex: te.orderIndex,
        prescriptionType: te.prescriptionType,
        targetSets: te.targetSets,
        targetReps: te.targetReps,
        targetRPE: te.targetRPE,
        targetLoad: te.targetLoad,
        targetDurationSeconds: te.targetDurationSeconds,
        targetDistance: te.targetDistance,
        restSeconds: te.restSeconds,
        notes: te.notes,
        // Immutable snapshots
        exerciseNameSnapshot: te.exercise.name,
        instructionSnapshot: te.exercise.instructions,
        coachingCueSnapshot: te.exercise.coachingCues ? JSON.stringify(te.exercise.coachingCues) : null,
      }));
    } else if (dto.exercises && dto.exercises.length > 0) {
      const exerciseIds = dto.exercises.map((e) => e.exerciseId);
      const exercises = await this.prisma.exercise.findMany({
        where: {
          id: { in: exerciseIds },
          OR: [{ organisationId: null }, { organisationId }],
        },
      });

      const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

      exercisesToCreate = dto.exercises.map((e, idx) => {
        const ex = exerciseMap.get(e.exerciseId);
        if (!ex) {
          throw new BadRequestException({
            code: 'EXERCISE_INVALID',
            message: `Exercise '${e.exerciseId}' not found or not accessible`,
          });
        }
        return {
          exerciseId: e.exerciseId,
          orderIndex: e.sortOrder ?? idx,
          prescriptionType: e.prescriptionType,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetRPE: e.targetRpe,
          targetLoad: e.targetLoad,
          targetDurationSeconds: e.targetDurationSeconds,
          targetDistance: e.targetDistance,
          restSeconds: e.restSeconds ?? 90,
          notes: e.trainerNotes,
          // Immutable snapshots
          exerciseNameSnapshot: ex.name,
          instructionSnapshot: ex.instructions,
          coachingCueSnapshot: ex.coachingCues ? JSON.stringify(ex.coachingCues) : null,
        };
      });
    } else {
      throw new BadRequestException({
        code: 'WORKOUT_NO_EXERCISES',
        message: 'Must provide either templateId or an exercises list',
      });
    }

    const scheduledDate = new Date(dto.scheduledDate);

    const workout = await this.prisma.workout.create({
      data: {
        organisationId,
        memberProfileId: member.id,
        trainerProfileId,
        workoutTemplateId: dto.templateId,
        trainingProgramId: dto.trainingProgramId,
        personalTrainingSessionId: dto.personalTrainingSessionId,
        title: dto.name,
        description: dto.description,
        scheduledDate,
        estimatedDurationMinutes: dto.estimatedDurationMinutes ?? 60,
        status: 'SCHEDULED',
        exercises: {
          create: exercisesToCreate,
        },
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: { media: true },
            },
            sets: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        trainerProfile: {
          include: { staffProfile: { include: { user: true } } },
        },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_ASSIGNED',
      resource: 'workouts',
      resourceId: workout.id,
      metadata: {
        memberProfileId: member.id,
        trainerProfileId,
        scheduledDate: workout.scheduledDate,
        exerciseCount: workout.exercises.length,
      },
    });

    return workout;
  }

  /**
   * Find workouts matching query filters
   */
  async findAll(organisationId: string, query: WorkoutQueryDto, actor: AuthenticatedUser) {
    const {
      memberProfileId,
      trainerProfileId,
      trainingProgramId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const where: any = { organisationId };

    const isSuperOrOrgManager = this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'], organisationId);
    const isTrainer = this.hasRole(actor, 'TRAINER');
    const isMember = this.hasRole(actor, 'MEMBER');

    if (isMember && !isSuperOrOrgManager && !isTrainer) {
      const member = await this.prisma.memberProfile.findFirst({
        where: { userId: actor.id, organisationId },
      });
      if (!member) {
        return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      where.memberProfileId = member.id;
    } else if (memberProfileId) {
      where.memberProfileId = memberProfileId;
    }

    if (trainerProfileId) {
      where.trainerProfileId = trainerProfileId;
    } else if (isTrainer && !isSuperOrOrgManager && !isMember) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId: actor.id } },
      });
      if (trainer) {
        where.trainerProfileId = trainer.id;
      }
    }

    if (trainingProgramId) {
      where.trainingProgramId = trainingProgramId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [total, workouts] = await Promise.all([
      this.prisma.workout.count({ where }),
      this.prisma.workout.findMany({
        where,
        include: {
          exercises: {
            include: {
              exercise: { include: { media: true } },
              sets: { orderBy: { setNumber: 'asc' } },
            },
            orderBy: { orderIndex: 'asc' },
          },
          memberProfile: { include: { user: true } },
          trainerProfile: { include: { staffProfile: { include: { user: true } } } },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: workouts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single workout by ID
   */
  async findById(organisationId: string, id: string, actor: AuthenticatedUser) {
    const workout = await this.prisma.workout.findFirst({
      where: { id, organisationId },
      include: {
        exercises: {
          include: {
            exercise: { include: { media: true } },
            sets: {
              include: { corrections: true },
              orderBy: { setNumber: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        memberProfile: { include: { user: true } },
        trainerProfile: { include: { staffProfile: { include: { user: true } } } },
        trainingProgram: true,
        trainingPlan: true,
        exerciseGroups: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!workout) {
      throw new NotFoundException({
        code: 'WORKOUT_NOT_FOUND',
        message: `Workout '${id}' not found in organisation`,
      });
    }

    // Verify actor access
    await this.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    return workout;
  }

  /**
   * Start a workout
   */
  async startWorkout(organisationId: string, id: string, actor: AuthenticatedUser) {
    const workout = await this.findById(organisationId, id, actor);

    if (workout.status === 'COMPLETED') {
      throw new BadRequestException({
        code: 'WORKOUT_ALREADY_COMPLETED',
        message: 'Cannot start an already completed workout',
      });
    }

    const updated = await this.prisma.workout.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: workout.startedAt || new Date(),
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_STARTED',
      resource: 'workouts',
      resourceId: updated.id,
      metadata: {
        workoutId: updated.id,
        startedAt: updated.startedAt,
      },
    });

    return updated;
  }

  /**
   * Complete a workout transactionally
   */
  async completeWorkout(
    organisationId: string,
    id: string,
    dto: CompleteWorkoutDto,
    actor: AuthenticatedUser,
  ) {
    const workout = await this.findById(organisationId, id, actor);

    if (workout.status === 'COMPLETED') {
      return workout;
    }

    const now = new Date();
    const startedAt = workout.startedAt || now;

    // Transactional completion
    const completed = await this.prisma.$transaction(async (tx) => {
      await tx.workoutExercise.updateMany({
        where: { workoutId: id, status: 'IN_PROGRESS' },
        data: { status: 'COMPLETED' },
      });

      return tx.workout.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          startedAt,
          notes: dto.memberNotes ?? workout.notes,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: { orderBy: { setNumber: 'asc' } },
            },
            orderBy: { orderIndex: 'asc' },
          },
          memberProfile: { include: { user: true } },
          trainerProfile: { include: { staffProfile: { include: { user: true } } } },
        },
      });
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_COMPLETED',
      resource: 'workouts',
      resourceId: completed.id,
      metadata: {
        completedAt: now,
      },
    });

    return completed;
  }

  /**
   * Cancel a workout
   */
  async cancelWorkout(organisationId: string, id: string, actor: AuthenticatedUser) {
    const workout = await this.findById(organisationId, id, actor);

    if (workout.status === 'COMPLETED') {
      throw new BadRequestException({
        code: 'WORKOUT_ALREADY_COMPLETED',
        message: 'Cannot cancel a completed workout',
      });
    }

    const cancelled = await this.prisma.workout.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_CANCELLED',
      resource: 'workouts',
      resourceId: cancelled.id,
      metadata: {
        workoutId: cancelled.id,
      },
    });

    return cancelled;
  }

  /**
   * Create an exercise group (superset, circuit, etc.) inside a workout
   */
  async createExerciseGroup(
    organisationId: string,
    workoutId: string,
    dto: {
      name: string;
      type: string;
      section?: string;
      orderIndex?: number;
      rounds?: number;
      restBetweenExercises?: number;
      restBetweenRounds?: number;
      durationSeconds?: number;
      notes?: string;
      exerciseIds?: string[];
    },
    actor: AuthenticatedUser,
  ) {
    const workout = await this.findById(organisationId, workoutId, actor);
    await this.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workoutExerciseGroup.create({
        data: {
          workoutId: workout.id,
          name: dto.name,
          type: dto.type,
          section: dto.section || 'MAIN',
          orderIndex: dto.orderIndex || 0,
          rounds: dto.rounds || 1,
          restBetweenExercises: dto.restBetweenExercises,
          restBetweenRounds: dto.restBetweenRounds,
          durationSeconds: dto.durationSeconds,
          notes: dto.notes,
        },
      });

      if (dto.exerciseIds && dto.exerciseIds.length > 0) {
        await tx.workoutExercise.updateMany({
          where: {
            id: { in: dto.exerciseIds },
            workoutId: workout.id,
          },
          data: {
            workoutExerciseGroupId: created.id,
            sectionName: dto.section || 'MAIN',
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_GROUP_CREATED',
      resource: 'workouts',
      resourceId: workout.id,
      metadata: { workoutId: workout.id, groupId: group.id, type: group.type },
    });

    return this.findById(organisationId, workoutId, actor);
  }

  /**
   * Update an exercise group
   */
  async updateExerciseGroup(
    organisationId: string,
    workoutId: string,
    groupId: string,
    dto: any,
    actor: AuthenticatedUser,
  ) {
    const workout = await this.findById(organisationId, workoutId, actor);
    await this.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    const existingGroup = await this.prisma.workoutExerciseGroup.findFirst({
      where: { id: groupId, workoutId: workout.id },
    });

    if (!existingGroup) {
      throw new NotFoundException(`Exercise group '${groupId}' not found in workout`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.section !== undefined) data.section = dto.section;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.rounds !== undefined) data.rounds = dto.rounds;
    if (dto.restBetweenExercises !== undefined) data.restBetweenExercises = dto.restBetweenExercises;
    if (dto.restBetweenRounds !== undefined) data.restBetweenRounds = dto.restBetweenRounds;
    if (dto.durationSeconds !== undefined) data.durationSeconds = dto.durationSeconds;
    if (dto.notes !== undefined) data.notes = dto.notes;

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutExerciseGroup.update({
        where: { id: groupId },
        data,
      });

      if (dto.exerciseIds !== undefined) {
        // Detach old exercises
        await tx.workoutExercise.updateMany({
          where: { workoutExerciseGroupId: groupId },
          data: { workoutExerciseGroupId: null },
        });

        // Attach new exercises
        if (dto.exerciseIds.length > 0) {
          await tx.workoutExercise.updateMany({
            where: { id: { in: dto.exerciseIds }, workoutId: workout.id },
            data: {
              workoutExerciseGroupId: groupId,
              ...(dto.section ? { sectionName: dto.section } : {}),
            },
          });
        }
      }
    });

    return this.findById(organisationId, workoutId, actor);
  }

  /**
   * Delete an exercise group (exercises are unlinked, not deleted)
   */
  async deleteExerciseGroup(
    organisationId: string,
    workoutId: string,
    groupId: string,
    actor: AuthenticatedUser,
  ) {
    const workout = await this.findById(organisationId, workoutId, actor);
    await this.assertMemberAccess(organisationId, workout.memberProfileId, actor);

    const group = await this.prisma.workoutExerciseGroup.findFirst({
      where: { id: groupId, workoutId: workout.id },
    });

    if (!group) {
      throw new NotFoundException(`Exercise group '${groupId}' not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutExercise.updateMany({
        where: { workoutExerciseGroupId: groupId },
        data: { workoutExerciseGroupId: null },
      });

      await tx.workoutExerciseGroup.delete({
        where: { id: groupId },
      });
    });

    return { message: `Exercise group '${groupId}' deleted successfully` };
  }

  /**
   * Process overdue workouts - mark as EXPIRED if past due threshold
   * Slice 16: Background job / service for identifying overdue workouts
   */
  async processOverdueWorkouts(organisationId: string, thresholdDays: number = 2) {
    const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    const overdueWorkouts = await this.prisma.workout.findMany({
      where: {
        organisationId,
        status: { in: ['ASSIGNED', 'SCHEDULED'] },
        scheduledDate: { lt: cutoffDate },
      },
      select: { id: true, title: true, scheduledDate: true },
    });

    if (overdueWorkouts.length === 0) {
      return { processedCount: 0, expiredWorkoutIds: [] };
    }

    const ids = overdueWorkouts.map((w) => w.id);

    await this.prisma.workout.updateMany({
      where: { id: { in: ids } },
      data: { status: 'EXPIRED' },
    });

    this.logger.log(
      `Processed ${ids.length} overdue workouts as EXPIRED for organisation ${organisationId}`,
    );

    return {
      processedCount: ids.length,
      expiredWorkoutIds: ids,
    };
  }
}
