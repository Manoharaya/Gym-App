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
  CreateTrainingProgramDto,
  UpdateTrainingProgramDto,
  ProgramActionDto,
} from '../dto/personal-training.dto';
import type { TrainingProgramStatus } from '@fitcore/types';

@Injectable()
export class TrainingProgramService {
  private readonly logger = new Logger(TrainingProgramService.name);

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
   * Resolves the trainer profile id for the actor if they are a trainer,
   * or validates that an explicit trainerProfileId is provided by management.
   */
  private async resolveTrainerProfileId(
    organisationId: string,
    explicitTrainerId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const isTrainerRole = this.hasRole(actor, 'TRAINER') && !this.hasAnyRole(actor, [
      'SUPERADMIN',
      'ORGANISATION_OWNER',
      'OUTLET_MANAGER',
    ]);

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

    throw new BadRequestException({
      code: 'TRAINER_REQUIRED',
      message: 'trainerProfileId is required when creating a training program',
    });
  }

  /**
   * Asserts that the actor is authorized to access or manage this member's coaching information.
   * If actor is a member, they can only access their own profile.
   * If actor is a trainer, they must have an active assignment to this member.
   */
  async assertMemberCoachingAccess(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
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

    const isPrivilegedStaff = this.hasAnyRole(actor, [
      'SUPERADMIN',
      'ORGANISATION_OWNER',
      'OUTLET_MANAGER',
    ], organisationId);
    if (isPrivilegedStaff) {
      return { member };
    }

    const isMemberActor = this.hasRole(actor, 'MEMBER') && member.userId === actor.id;
    if (isMemberActor) {
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

      // Check active assignment
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
          code: 'TRAINER_NOT_ASSIGNED',
          message: `Trainer is not actively assigned to coach member '${memberProfileId}'`,
        });
      }

      return { member, trainerProfileId: trainer.id };
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Access to member coaching programs is restricted',
    });
  }

  /**
   * Creates a new training program for a member.
   */
  async createProgram(
    organisationId: string,
    memberProfileId: string,
    dto: CreateTrainingProgramDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertMemberCoachingAccess(organisationId, memberProfileId, actor);
    const trainerProfileId = await this.resolveTrainerProfileId(
      organisationId,
      dto.trainerProfileId,
      actor,
    );

    const program = await this.prisma.trainingProgram.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId,
        trainerProfileId,
        name: dto.name,
        description: dto.description,
        status: 'DRAFT',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
      include: {
        memberProfile: { include: { user: true } },
        trainerProfile: true,
        goals: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_CREATED',
      resource: 'training_programs',
      resourceId: program.id,
      metadata: {
        memberProfileId,
        trainerProfileId,
        programName: program.name,
      },
    });

    return program;
  }

  /**
   * Retrieves all training programs for a member.
   */
  async findMemberPrograms(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertMemberCoachingAccess(organisationId, memberProfileId, actor);

    return this.prisma.trainingProgram.findMany({
      where: { organisationId, memberProfileId },
      include: {
        trainerProfile: true,
        goals: { orderBy: { priority: 'asc' } },
        sessions: {
          orderBy: { scheduledStart: 'desc' },
          take: 5,
        },
        _count: { select: { sessions: true, goals: true, notes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single training program by ID.
   */
  async findProgramById(organisationId: string, programId: string, actor: AuthenticatedUser) {
    const program = await this.prisma.trainingProgram.findFirst({
      where: { id: programId, organisationId },
      include: {
        memberProfile: { include: { user: true } },
        trainerProfile: true,
        goals: { orderBy: { priority: 'asc' } },
        sessions: { orderBy: { scheduledStart: 'asc' } },
        _count: { select: { sessions: true, goals: true, notes: true } },
      },
    });

    if (!program) {
      throw new NotFoundException({
        code: 'TRAINING_PROGRAM_NOT_FOUND',
        message: `Training program '${programId}' not found`,
      });
    }

    await this.assertMemberCoachingAccess(organisationId, program.memberProfileId, actor);
    return program;
  }

  /**
   * Updates program metadata.
   */
  async updateProgram(
    organisationId: string,
    programId: string,
    dto: UpdateTrainingProgramDto,
    actor: AuthenticatedUser,
  ) {
    const program = await this.findProgramById(organisationId, programId, actor);

    if (['COMPLETED', 'CANCELLED'].includes(program.status)) {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot update a program with terminal status '${program.status}'`,
      });
    }

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        name: dto.name,
        description: dto.description,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
      include: {
        trainerProfile: true,
        goals: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_UPDATED',
      resource: 'training_programs',
      resourceId: programId,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Activates a program (DRAFT -> ACTIVE or PAUSED -> ACTIVE).
   */
  async activateProgram(organisationId: string, programId: string, actor: AuthenticatedUser) {
    const program = await this.findProgramById(organisationId, programId, actor);

    if (!['DRAFT', 'PAUSED'].includes(program.status)) {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot activate program from status '${program.status}'. Only DRAFT or PAUSED programs can be activated.`,
      });
    }

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        status: 'ACTIVE',
        activatedAt: program.activatedAt || new Date(),
      },
      include: { trainerProfile: true, goals: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_ACTIVATED',
      resource: 'training_programs',
      resourceId: programId,
      metadata: { previousStatus: program.status, newStatus: 'ACTIVE' },
    });

    return updated;
  }

  /**
   * Pauses an active program (ACTIVE -> PAUSED).
   */
  async pauseProgram(organisationId: string, programId: string, actor: AuthenticatedUser) {
    const program = await this.findProgramById(organisationId, programId, actor);

    if (program.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot pause program from status '${program.status}'. Only ACTIVE programs can be paused.`,
      });
    }

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: { status: 'PAUSED' },
      include: { trainerProfile: true, goals: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_PAUSED',
      resource: 'training_programs',
      resourceId: programId,
      metadata: { previousStatus: 'ACTIVE', newStatus: 'PAUSED' },
    });

    return updated;
  }

  /**
   * Completes an active program (ACTIVE -> COMPLETED).
   */
  async completeProgram(organisationId: string, programId: string, actor: AuthenticatedUser) {
    const program = await this.findProgramById(organisationId, programId, actor);

    if (program.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot complete program from status '${program.status}'. Only ACTIVE programs can be completed.`,
      });
    }

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { trainerProfile: true, goals: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_COMPLETED',
      resource: 'training_programs',
      resourceId: programId,
      metadata: { previousStatus: 'ACTIVE', newStatus: 'COMPLETED' },
    });

    return updated;
  }

  /**
   * Cancels a program (DRAFT or ACTIVE or PAUSED -> CANCELLED).
   */
  async cancelProgram(
    organisationId: string,
    programId: string,
    dto: ProgramActionDto,
    actor: AuthenticatedUser,
  ) {
    if (!dto?.reason || !dto.reason.trim()) {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'Cancellation reason is required',
      });
    }

    const program = await this.findProgramById(organisationId, programId, actor);

    if (['COMPLETED', 'CANCELLED'].includes(program.status)) {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot cancel a program with status '${program.status}'`,
      });
    }

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: dto.reason || 'Cancelled by staff/member',
      },
      include: { trainerProfile: true, goals: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_PROGRAM_CANCELLED',
      resource: 'training_programs',
      resourceId: programId,
      metadata: {
        previousStatus: program.status,
        newStatus: 'CANCELLED',
        reason: dto.reason,
      },
    });

    return updated;
  }
}
