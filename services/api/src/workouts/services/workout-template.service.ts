import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateWorkoutTemplateDto,
  UpdateWorkoutTemplateDto,
  WorkoutTemplateQueryDto,
} from '../dto/workout-template.dto';

@Injectable()
export class WorkoutTemplateService {
  private readonly logger = new Logger(WorkoutTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organisationId: string, query: WorkoutTemplateQueryDto) {
    const { search, difficulty, category, status, page = 1, limit = 20 } = query;

    const where: any = {
      organisationId,
    };

    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (category) {
      where.goal = category;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, templates] = await Promise.all([
      this.prisma.workoutTemplate.count({ where }),
      this.prisma.workoutTemplate.findMany({
        where,
        include: {
          exercises: {
            include: {
              exercise: {
                include: { media: true },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: templates,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(organisationId: string, id: string) {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { id, organisationId },
      include: {
        exercises: {
          include: {
            exercise: {
              include: { media: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException({
        code: 'WORKOUT_TEMPLATE_NOT_FOUND',
        message: `Workout template '${id}' not found in organisation`,
      });
    }

    return template;
  }

  async create(organisationId: string, dto: CreateWorkoutTemplateDto, actor: AuthenticatedUser) {
    if (!dto.exercises || dto.exercises.length === 0) {
      throw new BadRequestException({
        code: 'WORKOUT_TEMPLATE_NO_EXERCISES',
        message: 'A workout template must contain at least one exercise',
      });
    }

    const exerciseIds = dto.exercises.map((e) => e.exerciseId);
    const validExercises = await this.prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        OR: [{ organisationId: null }, { organisationId }],
        status: 'ACTIVE',
      },
    });

    if (validExercises.length !== exerciseIds.length) {
      throw new BadRequestException({
        code: 'EXERCISE_INVALID',
        message: 'One or more referenced exercises are invalid or not accessible',
      });
    }

    const template = await this.prisma.workoutTemplate.create({
      data: {
        organisationId,
        name: dto.name,
        description: dto.description,
        estimatedDurationMinutes: dto.estimatedDurationMinutes ?? 60,
        difficulty: dto.difficulty,
        goal: dto.category,
        status: 'ACTIVE',
        exercises: {
          create: dto.exercises.map((e, idx) => ({
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
            notes: e.notes,
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_TEMPLATE_CREATED',
      resource: 'workout_templates',
      resourceId: template.id,
      metadata: {
        templateName: template.name,
        exerciseCount: template.exercises.length,
      },
    });

    return template;
  }

  async update(organisationId: string, id: string, dto: UpdateWorkoutTemplateDto, actor: AuthenticatedUser) {
    const existing = await this.findById(organisationId, id);

    let exercisesUpdate = undefined;
    if (dto.exercises) {
      if (dto.exercises.length === 0) {
        throw new BadRequestException({
          code: 'WORKOUT_TEMPLATE_NO_EXERCISES',
          message: 'Workout template must contain at least one exercise',
        });
      }

      const exerciseIds = dto.exercises.map((e) => e.exerciseId);
      const validExercises = await this.prisma.exercise.findMany({
        where: {
          id: { in: exerciseIds },
          OR: [{ organisationId: null }, { organisationId }],
          status: 'ACTIVE',
        },
      });

      if (validExercises.length !== exerciseIds.length) {
        throw new BadRequestException({
          code: 'EXERCISE_INVALID',
          message: 'One or more referenced exercises are invalid or not accessible',
        });
      }

      await this.prisma.workoutTemplateExercise.deleteMany({
        where: { workoutTemplateId: id },
      });

      exercisesUpdate = {
        create: dto.exercises.map((e, idx) => ({
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
          notes: e.notes,
        })),
      };
    }

    const updated = await this.prisma.workoutTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        estimatedDurationMinutes: dto.estimatedDurationMinutes ?? existing.estimatedDurationMinutes,
        difficulty: dto.difficulty ?? existing.difficulty,
        goal: dto.category ?? existing.goal,
        ...(exercisesUpdate ? { exercises: exercisesUpdate } : {}),
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_TEMPLATE_UPDATED',
      resource: 'workout_templates',
      resourceId: updated.id,
      metadata: {
        templateId: updated.id,
      },
    });

    return updated;
  }

  async archive(organisationId: string, id: string, actor: AuthenticatedUser) {
    const existing = await this.findById(organisationId, id);

    const archived = await this.prisma.workoutTemplate.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_TEMPLATE_ARCHIVED',
      resource: 'workout_templates',
      resourceId: archived.id,
      metadata: {
        templateId: archived.id,
      },
    });

    return archived;
  }

  /**
   * Creates a new version of an existing template (Slice 11: Template Versioning).
   * Historical workouts generated from earlier versions remain completely intact.
   */
  async createVersion(
    organisationId: string,
    templateId: string,
    dto: Partial<CreateWorkoutTemplateDto>,
    actor: AuthenticatedUser,
  ) {
    const parent = await this.findById(organisationId, templateId);

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workoutTemplate.create({
        data: {
          organisationId,
          createdByStaffId: parent.createdByStaffId,
          name: dto.name || `${parent.name} (v${parent.version + 1})`,
          description: dto.description !== undefined ? dto.description : parent.description,
          goal: dto.category !== undefined ? dto.category : (parent as any).goal,
          difficulty: dto.difficulty || parent.difficulty,
          estimatedDurationMinutes:
            dto.estimatedDurationMinutes !== undefined
              ? dto.estimatedDurationMinutes
              : parent.estimatedDurationMinutes,
          status: 'ACTIVE',
          version: parent.version + 1,
          parentTemplateId: parent.id,
        },
      });

      // If dto provides exercises, use them; otherwise clone parent exercises
      if (dto.exercises && dto.exercises.length > 0) {
        for (let i = 0; i < dto.exercises.length; i++) {
          const e = dto.exercises[i];
          await tx.workoutTemplateExercise.create({
            data: {
              workoutTemplateId: created.id,
              exerciseId: e.exerciseId,
              orderIndex: e.sortOrder ?? i,
              sectionName: (e as any).sectionName || 'MAIN',
              prescriptionType: e.prescriptionType || 'REPETITIONS',
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetLoad: e.targetLoad,
              targetRPE: e.targetRpe,
              targetDurationSeconds: e.targetDurationSeconds,
              targetDistance: e.targetDistance,
              restSeconds: e.restSeconds || 90,
              notes: e.notes,
            },
          });
        }
      } else {
        for (const pe of parent.exercises) {
          await tx.workoutTemplateExercise.create({
            data: {
              workoutTemplateId: created.id,
              exerciseId: pe.exerciseId,
              orderIndex: pe.orderIndex,
              sectionName: pe.sectionName,
              prescriptionType: pe.prescriptionType,
              targetSets: pe.targetSets,
              targetReps: pe.targetReps,
              targetLoad: pe.targetLoad,
              targetRPE: pe.targetRPE,
              targetDurationSeconds: pe.targetDurationSeconds,
              targetDistance: pe.targetDistance,
              restSeconds: pe.restSeconds,
              notes: pe.notes,
            },
          });
        }
      }

      return created;
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_TEMPLATE_VERSION_CREATED',
      resource: 'workout_templates',
      resourceId: newVersion.id,
      metadata: { parentTemplateId: parent.id, newTemplateId: newVersion.id, version: newVersion.version },
    });

    return this.findById(organisationId, newVersion.id);
  }
}
