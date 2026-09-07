import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateTrainingPlanDto,
  UpdateTrainingPlanDto,
  CreateTrainingPlanWeekDto,
  UpdateTrainingPlanWeekDto,
  CreateTrainingPlanDayDto,
  UpdateTrainingPlanDayDto,
  TrainingPlanQueryDto,
  TrainingPlanStatusEnum,
} from '../dto/training-plan.dto';
import {
  CreateProgressionRuleDto,
  UpdateProgressionRuleDto,
} from '../dto/progression-rule.dto';

@Injectable()
export class TrainingPlansService {
  private readonly logger = new Logger(TrainingPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private hasRole(actor: AuthenticatedUser, role: string, organisationId?: string): boolean {
    return (
      actor.isSuperAdmin ||
      actor.roles?.some((r) => r.role === role && (!organisationId || r.organisationId === organisationId)) ||
      false
    );
  }

  private hasAnyRole(actor: AuthenticatedUser, roles: string[], organisationId?: string): boolean {
    return (
      actor.isSuperAdmin ||
      actor.roles?.some((r) => roles.includes(r.role) && (!organisationId || r.organisationId === organisationId)) ||
      false
    );
  }

  /**
   * Resolves the trainer profile ID for the actor if they are a trainer,
   * or validates that an explicit trainerProfileId is provided by management.
   */
  async resolveTrainerProfileId(
    organisationId: string,
    explicitTrainerId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const isTrainerRole =
      this.hasRole(actor, 'TRAINER') &&
      !this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER']);

    if (isTrainerRole) {
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
          message: 'Active trainer profile not found for authenticated user',
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

    // Default to first active trainer in org for managers if none specified
    const defaultTrainer = await this.prisma.trainerProfile.findFirst({
      where: { organisationId, status: 'ACTIVE' },
    });
    if (defaultTrainer) {
      return defaultTrainer.id;
    }

    throw new BadRequestException({
      code: 'TRAINER_REQUIRED',
      message: 'trainerProfileId is required when creating a training plan',
    });
  }

  /**
   * Asserts coaching authority between trainer and member.
   * Superadmin, Organisation Owner, and Outlet Manager bypass the 1:1 assignment check.
   */
  async assertCoachingAccess(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
    requireTrainerAuthority: boolean = false,
  ): Promise<{ member: any; trainerProfileId?: string }> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberProfileId, organisationId, deletedAt: null },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: `Member '${memberProfileId}' not found in organisation`,
      });
    }

    const isPrivilegedStaff = this.hasAnyRole(
      actor,
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'],
      organisationId,
    );
    if (isPrivilegedStaff) {
      return { member };
    }

    const isMemberActor = this.hasRole(actor, 'MEMBER') && member.userId === actor.id;
    if (isMemberActor && !requireTrainerAuthority) {
      return { member };
    }

    const isTrainerActor = this.hasRole(actor, 'TRAINER');
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
          message: 'Active trainer profile not found for authenticated user',
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
          message: 'You are not assigned to coach this member',
        });
      }

      return { member, trainerProfileId: trainer.id };
    }

    throw new ForbiddenException({
      code: 'UNAUTHORIZED_COACHING_ACCESS',
      message: 'You do not have permission to access or manage this member training plan',
    });
  }

  async create(
    organisationId: string,
    dto: CreateTrainingPlanDto,
    actor: AuthenticatedUser,
  ) {
    const { member } = await this.assertCoachingAccess(organisationId, dto.memberProfileId, actor, true);
    const trainerProfileId = await this.resolveTrainerProfileId(organisationId, undefined, actor);

    // Validate TrainingProgram if provided
    if (dto.trainingProgramId) {
      const program = await this.prisma.trainingProgram.findFirst({
        where: {
          id: dto.trainingProgramId,
          organisationId,
          memberProfileId: member.id,
        },
      });
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Training program '${dto.trainingProgramId}' not found for member in this organisation`,
        });
      }
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + dto.durationWeeks * 7 * 24 * 60 * 60 * 1000);

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trainingPlan.create({
        data: {
          organisationId,
          trainingProgramId: dto.trainingProgramId,
          memberProfileId: dto.memberProfileId,
          trainerProfileId,
          name: dto.name,
          description: dto.description,
          objective: dto.objective,
          durationWeeks: dto.durationWeeks,
          startDate,
          endDate,
          status: 'DRAFT',
        },
      });

      // Automatically generate initial weeks structure
      for (let w = 1; w <= dto.durationWeeks; w++) {
        const weekStartDate = new Date(startDate.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);

        await tx.trainingPlanWeek.create({
          data: {
            trainingPlanId: created.id,
            weekNumber: w,
            name: `Week ${w}`,
            focus: w === dto.durationWeeks ? 'Deload & Peak' : 'Progressive Accumulation',
            startDate: weekStartDate,
            endDate: weekEndDate,
            status: 'PENDING',
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TRAINING_PLAN_CREATED',
      resource: 'training_plans',
      resourceId: plan.id,
      metadata: { planId: plan.id, memberProfileId: dto.memberProfileId, trainerProfileId },
    });

    return this.findOne(organisationId, plan.id, actor);
  }

  async findAll(
    organisationId: string,
    query: TrainingPlanQueryDto,
    actor: AuthenticatedUser,
  ) {
    const isMember = this.hasRole(actor, 'MEMBER') && !this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER']);
    const isTrainer = this.hasRole(actor, 'TRAINER') && !this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER']);

    const where: any = { organisationId };

    if (isMember) {
      const member = await this.prisma.memberProfile.findFirst({
        where: { userId: actor.id, organisationId },
      });
      if (!member) return { items: [], total: 0, page: query.page || 1, limit: query.limit || 20 };
      where.memberProfileId = member.id;
    } else if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId: actor.id } },
      });
      if (!trainer) return { items: [], total: 0, page: query.page || 1, limit: query.limit || 20 };

      // Allow trainer to see plans of assigned clients
      const assignments = await this.prisma.trainerClientAssignment.findMany({
        where: { organisationId, trainerProfileId: trainer.id, status: 'ACTIVE' },
        select: { memberProfileId: true },
      });
      const assignedMemberIds = assignments.map((a) => a.memberProfileId);

      if (query.memberProfileId) {
        if (!assignedMemberIds.includes(query.memberProfileId)) {
          throw new ForbiddenException('Not authorized to access training plans for this client');
        }
        where.memberProfileId = query.memberProfileId;
      } else {
        where.OR = [
          { trainerProfileId: trainer.id },
          { memberProfileId: { in: assignedMemberIds } },
        ];
      }
    } else {
      if (query.memberProfileId) where.memberProfileId = query.memberProfileId;
      if (query.trainerProfileId) where.trainerProfileId = query.trainerProfileId;
    }

    if (query.trainingProgramId) where.trainingProgramId = query.trainingProgramId;
    if (query.status) where.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.trainingPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          memberProfile: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
          trainerProfile: {
            include: { staffProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
          trainingProgram: { select: { id: true, name: true, status: true } },
          weeks: { orderBy: { weekNumber: 'asc' }, take: 1 },
          _count: { select: { weeks: true, workouts: true } },
        },
      }),
      this.prisma.trainingPlan.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(organisationId: string, id: string, actor: AuthenticatedUser) {
    const plan = await this.prisma.trainingPlan.findFirst({
      where: { id, organisationId },
      include: {
        memberProfile: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        trainerProfile: {
          include: { staffProfile: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
        },
        trainingProgram: { select: { id: true, name: true, status: true } },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              orderBy: { dayNumber: 'asc' },
              include: {
                workout: {
                  include: {
                    exerciseGroups: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        exercises: {
                          orderBy: { orderIndex: 'asc' },
                          include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
                        },
                      },
                    },
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
                    },
                  },
                },
              },
            },
          },
        },
        progressionRules: {
          where: { active: true },
          include: { exercise: { select: { id: true, name: true } } },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException({
        code: 'TRAINING_PLAN_NOT_FOUND',
        message: `Training plan '${id}' not found in organisation`,
      });
    }

    // Access check
    await this.assertCoachingAccess(organisationId, plan.memberProfileId, actor);

    return plan;
  }

  async update(
    organisationId: string,
    id: string,
    dto: UpdateTrainingPlanDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, id, actor);
    await this.assertCoachingAccess(organisationId, plan.memberProfileId, actor, true);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.objective !== undefined) data.objective = dto.objective;
    if (dto.durationWeeks !== undefined) data.durationWeeks = dto.durationWeeks;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.trainingPlan.update({
      where: { id: plan.id },
      data,
    });

    let auditAction = 'TRAINING_PLAN_UPDATED';
    if (dto.status) {
      switch (dto.status) {
        case TrainingPlanStatusEnum.ACTIVE:
          auditAction = 'TRAINING_PLAN_ACTIVATED';
          break;
        case TrainingPlanStatusEnum.PAUSED:
          auditAction = 'TRAINING_PLAN_PAUSED';
          break;
        case TrainingPlanStatusEnum.COMPLETED:
          auditAction = 'TRAINING_PLAN_COMPLETED';
          break;
        case TrainingPlanStatusEnum.ARCHIVED:
          auditAction = 'TRAINING_PLAN_ARCHIVED';
          break;
      }
    }

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: auditAction,
      resource: 'training_plans',
      resourceId: plan.id,
      metadata: { planId: plan.id, status: updated.status },
    });

    return this.findOne(organisationId, plan.id, actor);
  }

  async addWeek(
    organisationId: string,
    planId: string,
    dto: CreateTrainingPlanWeekDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);

    const existing = await this.prisma.trainingPlanWeek.findFirst({
      where: { trainingPlanId: plan.id, weekNumber: dto.weekNumber },
    });

    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_WEEK',
        message: `Week ${dto.weekNumber} already exists in training plan '${plan.name}'`,
      });
    }

    const week = await this.prisma.trainingPlanWeek.create({
      data: {
        trainingPlanId: plan.id,
        weekNumber: dto.weekNumber,
        name: dto.name || `Week ${dto.weekNumber}`,
        focus: dto.focus,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status || 'PENDING',
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TRAINING_PLAN_WEEK_CREATED',
      resource: 'training_plans',
      resourceId: week.id,
      metadata: { planId: plan.id, weekNumber: week.weekNumber },
    });

    return week;
  }

  async updateWeek(
    organisationId: string,
    planId: string,
    weekId: string,
    dto: UpdateTrainingPlanWeekDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);

    const week = await this.prisma.trainingPlanWeek.findFirst({
      where: { id: weekId, trainingPlanId: plan.id },
    });

    if (!week) {
      throw new NotFoundException(`Week '${weekId}' not found in training plan`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.focus !== undefined) data.focus = dto.focus;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.trainingPlanWeek.update({
      where: { id: week.id },
      data,
    });
  }

  async addDay(
    organisationId: string,
    planId: string,
    weekId: string,
    dto: CreateTrainingPlanDayDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);

    const week = await this.prisma.trainingPlanWeek.findFirst({
      where: { id: weekId, trainingPlanId: plan.id },
    });

    if (!week) {
      throw new NotFoundException(`Week '${weekId}' not found in training plan`);
    }

    const existing = await this.prisma.trainingPlanDay.findFirst({
      where: { trainingPlanWeekId: week.id, dayNumber: dto.dayNumber },
    });

    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_DAY',
        message: `Day ${dto.dayNumber} already exists in week ${week.weekNumber}`,
      });
    }

    // Verify workout if provided
    if (dto.workoutId) {
      const workout = await this.prisma.workout.findFirst({
        where: { id: dto.workoutId, organisationId, memberProfileId: plan.memberProfileId },
      });
      if (!workout) {
        throw new NotFoundException(`Workout '${dto.workoutId}' not found for member in organisation`);
      }
    }

    const day = await this.prisma.trainingPlanDay.create({
      data: {
        trainingPlanWeekId: week.id,
        dayNumber: dto.dayNumber,
        date: dto.date ? new Date(dto.date) : null,
        name: dto.name,
        focus: dto.focus,
        workoutId: dto.workoutId,
        restDay: dto.restDay || false,
        notes: dto.notes,
      },
    });

    // Link workout to training plan
    if (dto.workoutId) {
      await this.prisma.workout.update({
        where: { id: dto.workoutId },
        data: { trainingPlanId: plan.id },
      });
    }

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TRAINING_PLAN_DAY_CREATED',
      resource: 'training_plans',
      resourceId: day.id,
      metadata: { planId: plan.id, weekId: week.id, dayNumber: day.dayNumber, restDay: day.restDay },
    });

    return day;
  }

  async updateDay(
    organisationId: string,
    planId: string,
    dayId: string,
    dto: UpdateTrainingPlanDayDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);

    const day = await this.prisma.trainingPlanDay.findFirst({
      where: { id: dayId, trainingPlanWeek: { trainingPlanId: plan.id } },
    });

    if (!day) {
      throw new NotFoundException(`Training plan day '${dayId}' not found`);
    }

    if (dto.workoutId) {
      const workout = await this.prisma.workout.findFirst({
        where: { id: dto.workoutId, organisationId, memberProfileId: plan.memberProfileId },
      });
      if (!workout) {
        throw new NotFoundException(`Workout '${dto.workoutId}' not found for member`);
      }
      await this.prisma.workout.update({
        where: { id: dto.workoutId },
        data: { trainingPlanId: plan.id },
      });
    }

    const data: any = {};
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.focus !== undefined) data.focus = dto.focus;
    if (dto.workoutId !== undefined) data.workoutId = dto.workoutId;
    if (dto.restDay !== undefined) data.restDay = dto.restDay;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.trainingPlanDay.update({
      where: { id: day.id },
      data,
      include: { workout: true },
    });
  }

  async addProgressionRule(
    organisationId: string,
    planId: string,
    dto: CreateProgressionRuleDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);
    await this.assertCoachingAccess(organisationId, plan.memberProfileId, actor, true);

    const rule = await this.prisma.workoutProgressionRule.create({
      data: {
        organisationId,
        trainingPlanId: plan.id,
        workoutTemplateId: dto.workoutTemplateId,
        exerciseId: dto.exerciseId,
        progressionType: dto.progressionType,
        configuration: dto.configuration,
        notes: dto.notes,
        active: dto.active !== undefined ? dto.active : true,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_PROGRESSION_CREATED',
      resource: 'training_plans',
      resourceId: rule.id,
      metadata: { planId: plan.id, ruleId: rule.id, type: rule.progressionType },
    });

    return rule;
  }

  async updateProgressionRule(
    organisationId: string,
    planId: string,
    ruleId: string,
    dto: UpdateProgressionRuleDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.findOne(organisationId, planId, actor);
    await this.assertCoachingAccess(organisationId, plan.memberProfileId, actor, true);

    const rule = await this.prisma.workoutProgressionRule.findFirst({
      where: { id: ruleId, trainingPlanId: plan.id, organisationId },
    });

    if (!rule) {
      throw new NotFoundException(`Progression rule '${ruleId}' not found in training plan`);
    }

    const data: any = {};
    if (dto.progressionType !== undefined) data.progressionType = dto.progressionType;
    if (dto.configuration !== undefined) data.configuration = dto.configuration;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.workoutProgressionRule.update({
      where: { id: rule.id },
      data,
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_PROGRESSION_UPDATED',
      resource: 'training_plans',
      resourceId: rule.id,
      metadata: { planId: plan.id, ruleId: rule.id },
    });

    return updated;
  }

  async getCalendar(
    organisationId: string,
    planId: string,
    startDate?: string,
    endDate?: string,
    actor?: AuthenticatedUser,
  ) {
    if (actor) {
      await this.assertCoachingAccess(organisationId, (await this.findOne(organisationId, planId, actor)).memberProfileId, actor);
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = {
      trainingPlanWeek: { trainingPlanId: planId },
    };
    if (startDate || endDate) {
      where.date = dateFilter;
    }

    const days = await this.prisma.trainingPlanDay.findMany({
      where,
      orderBy: [{ date: 'asc' }, { dayNumber: 'asc' }],
      include: {
        trainingPlanWeek: { select: { id: true, weekNumber: true, name: true, focus: true } },
        workout: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledDate: true,
            completedAt: true,
            estimatedDurationMinutes: true,
            exercises: {
              select: {
                id: true,
                exerciseNameSnapshot: true,
                targetSets: true,
                targetReps: true,
                targetLoad: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return days;
  }
}
