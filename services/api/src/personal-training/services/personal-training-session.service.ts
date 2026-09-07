import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  SchedulePTSessionDto,
  CancelPTSessionDto,
  QueryPTSessionsDto,
} from '../dto/personal-training.dto';
import { TrainerAvailabilityService } from '../../bookings/services/trainer-availability.service';
import { TrainingProgramService } from './training-program.service';

@Injectable()
export class PersonalTrainingSessionService {
  private readonly logger = new Logger(PersonalTrainingSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly availabilityService: TrainerAvailabilityService,
    private readonly programService: TrainingProgramService,
  ) {}

  private hasRole(actor: AuthenticatedUser, role: string, organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => r.role === role && (!organisationId || r.organisationId === organisationId));
  }

  private hasAnyRole(actor: AuthenticatedUser, roles: string[], organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => roles.includes(r.role) && (!organisationId || r.organisationId === organisationId));
  }

  /**
   * Resolves trainerProfileId for caller.
   */
  private async resolveTrainer(
    organisationId: string,
    explicitTrainerId: string | undefined,
    actor: AuthenticatedUser,
  ) {
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
        include: { staffProfile: { include: { user: true } } },
      });
      if (!trainer) {
        throw new ForbiddenException({
          code: 'TRAINER_NOT_FOUND',
          message: 'Active trainer profile not found for authenticated user',
        });
      }
      return trainer;
    }

    if (explicitTrainerId) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { id: explicitTrainerId, organisationId },
        include: { staffProfile: { include: { user: true } } },
      });
      if (!trainer) {
        throw new NotFoundException({
          code: 'TRAINER_NOT_FOUND',
          message: `Trainer '${explicitTrainerId}' not found in organisation`,
        });
      }
      return trainer;
    }

    throw new BadRequestException({
      code: 'TRAINER_REQUIRED',
      message: 'trainerProfileId is required',
    });
  }

  /**
   * Schedules a new 1-on-1 personal training session.
   * Enforces:
   * 1. Trainer Conflict Check (overlapping PT or group class sessions)
   * 2. Member Conflict Check (overlapping PT sessions -> TRAINING_SESSION_CONFLICT)
   * 3. Trainer-Client coaching assignment validation
   */
  async scheduleSession(
    organisationId: string,
    dto: SchedulePTSessionDto,
    actor: AuthenticatedUser,
  ) {
    const startsAt = new Date(dto.scheduledStart);
    const endsAt = new Date(dto.scheduledEnd);

    if (endsAt <= startsAt) {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'Session end time must be after start time',
      });
    }

    // 1. Verify Member & Coaching Access
    await this.programService.assertMemberCoachingAccess(organisationId, dto.memberProfileId, actor);

    // 2. Resolve Trainer
    const trainer = await this.resolveTrainer(organisationId, dto.trainerProfileId, actor);

    // 3. Verify Outlet
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });
    if (!outlet) {
      throw new NotFoundException({
        code: 'OUTLET_NOT_FOUND',
        message: `Outlet '${dto.outletId}' not found in organisation`,
      });
    }

    // 4. MEMBER CONFLICT CHECK: Does this member have an overlapping PT session?
    const memberConflict = await this.prisma.personalTrainingSession.findFirst({
      where: {
        memberProfileId: dto.memberProfileId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        scheduledStart: { lt: endsAt },
        scheduledEnd: { gt: startsAt },
      },
    });

    if (memberConflict) {
      throw new ConflictException({
        code: 'TRAINING_SESSION_CONFLICT',
        message: 'Member already has another scheduled personal training session during this time window',
      });
    }

    // 5. TRAINER CONFLICT CHECK (Existing PT Sessions)
    const trainerPtConflict = await this.prisma.personalTrainingSession.findFirst({
      where: {
        trainerProfileId: trainer.id,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        scheduledStart: { lt: endsAt },
        scheduledEnd: { gt: startsAt },
      },
    });

    if (trainerPtConflict && !dto.allowConflictOverride) {
      throw new ConflictException({
        code: 'TRAINER_UNAVAILABLE',
        message: `Trainer already has a conflicting PT session from ${trainerPtConflict.scheduledStart.toISOString()} to ${trainerPtConflict.scheduledEnd.toISOString()}`,
      });
    }

    // 6. TRAINER CONFLICT CHECK (Day 9 Availability & Group Classes)
    if (trainer.staffProfile?.userId) {
      const availabilityCheck = await this.availabilityService.isTrainerAvailable(
        trainer.staffProfile.userId,
        startsAt,
        endsAt,
        {
          allowOverride: dto.allowConflictOverride,
          staffUserId: actor.id,
          organisationId,
        },
      );

      if (!availabilityCheck.available) {
        throw new ConflictException({
          code: 'TRAINER_UNAVAILABLE',
          message: availabilityCheck.reason || 'Trainer is marked unavailable for this scheduled window',
        });
      }
    }

    // 7. Atomic Session Creation
    const session = await this.prisma.personalTrainingSession.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId: dto.memberProfileId,
        trainerProfileId: trainer.id,
        trainingProgramId: dto.trainingProgramId,
        scheduledStart: startsAt,
        scheduledEnd: endsAt,
        status: 'SCHEDULED',
        sessionType: dto.sessionType || 'ONE_ON_ONE',
        location: dto.location,
        notes: dto.notes,
      },
      include: {
        memberProfile: { include: { user: true } },
        trainerProfile: true,
        outlet: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      outletId: dto.outletId,
      action: 'PT_SESSION_CREATED',
      resource: 'pt_sessions',
      resourceId: session.id,
      metadata: {
        memberProfileId: dto.memberProfileId,
        trainerProfileId: trainer.id,
        scheduledStart: startsAt.toISOString(),
        scheduledEnd: endsAt.toISOString(),
      },
    });

    return session;
  }

  /**
   * Retrieves a single PT session by ID.
   */
  async findSessionById(organisationId: string, sessionId: string, actor: AuthenticatedUser) {
    const session = await this.prisma.personalTrainingSession.findFirst({
      where: { id: sessionId, organisationId },
      include: {
        memberProfile: { include: { user: true } },
        trainerProfile: true,
        outlet: true,
        trainingProgram: true,
        attendanceRecord: true,
        notesList: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'TRAINING_SESSION_NOT_FOUND',
        message: `Personal training session '${sessionId}' not found`,
      });
    }

    await this.programService.assertMemberCoachingAccess(
      organisationId,
      session.memberProfileId,
      actor,
    );

    return session;
  }

  /**
   * Starts a PT session (SCHEDULED or CONFIRMED -> IN_PROGRESS).
   */
  async startSession(organisationId: string, sessionId: string, actor: AuthenticatedUser) {
    const session = await this.findSessionById(organisationId, sessionId, actor);

    if (!['SCHEDULED', 'CONFIRMED'].includes(session.status)) {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot start a session with status '${session.status}'`,
      });
    }

    const updated = await this.prisma.personalTrainingSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        actualStart: new Date(),
      },
      include: { memberProfile: { include: { user: true } }, trainerProfile: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'PT_SESSION_STARTED',
      resource: 'pt_sessions',
      resourceId: sessionId,
      metadata: { memberProfileId: session.memberProfileId },
    });

    return updated;
  }

  /**
   * Completes a PT session and integrates with AttendanceRecord.
   */
  async completeSession(organisationId: string, sessionId: string, actor: AuthenticatedUser) {
    const session = await this.findSessionById(organisationId, sessionId, actor);

    if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
      throw new BadRequestException({
        code: 'SESSION_ALREADY_COMPLETED',
        message: `Session is already '${session.status}'`,
      });
    }

    const now = new Date();
    const actualStart = session.actualStart || session.scheduledStart;
    const durationMinutes = Math.round((now.getTime() - actualStart.getTime()) / 60000);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create linked AttendanceRecord for facility participation audit
      const attendance = await tx.attendanceRecord.create({
        data: {
          organisationId,
          outletId: session.outletId,
          memberProfileId: session.memberProfileId,
          status: 'COMPLETED',
          checkInMethod: 'STAFF',
          checkedInAt: actualStart,
          checkedOutAt: now,
          durationMinutes,
          markedByUserId: actor.id,
          notes: `Personal Training 1-on-1 with ${session.trainerProfile.professionalName}`,
        },
      });

      // 2. Update session status
      const updated = await tx.personalTrainingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          actualEnd: now,
          actualStart,
          attendanceRecordId: attendance.id,
        },
        include: {
          memberProfile: { include: { user: true } },
          trainerProfile: true,
          attendanceRecord: true,
        },
      });

      await this.auditService.log({
        userId: actor.id,
        organisationId,
        action: 'PT_SESSION_COMPLETED',
        resource: 'pt_sessions',
        resourceId: sessionId,
        metadata: {
          memberProfileId: session.memberProfileId,
          attendanceRecordId: attendance.id,
          durationMinutes,
        },
      });

      return updated;
    });
  }

  /**
   * Cancels a PT session. Preserves cancellation actor, timestamp, and reason.
   */
  async cancelSession(
    organisationId: string,
    sessionId: string,
    dto: CancelPTSessionDto,
    actor: AuthenticatedUser,
  ) {
    const session = await this.findSessionById(organisationId, sessionId, actor);

    if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
      throw new BadRequestException({
        code: 'TRAINING_PROGRAM_INVALID_STATE',
        message: `Cannot cancel a session with status '${session.status}'`,
      });
    }

    const updated = await this.prisma.personalTrainingSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: actor.id,
        cancellationReason: dto.reason,
      },
      include: {
        memberProfile: { include: { user: true } },
        trainerProfile: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'PT_SESSION_CANCELLED',
      resource: 'pt_sessions',
      resourceId: sessionId,
      metadata: {
        memberProfileId: session.memberProfileId,
        reason: dto.reason,
      },
    });

    return updated;
  }

  /**
   * Queries personal training sessions with pagination and filters.
   */
  async querySessions(
    organisationId: string,
    query: QueryPTSessionsDto,
    actor: AuthenticatedUser,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { organisationId };

    if (query.memberProfileId) {
      await this.programService.assertMemberCoachingAccess(
        organisationId,
        query.memberProfileId,
        actor,
      );
      where.memberProfileId = query.memberProfileId;
    } else if (this.hasRole(actor, 'MEMBER')) {
      const member = await this.prisma.memberProfile.findFirst({
        where: { userId: actor.id, organisationId },
      });
      if (member) where.memberProfileId = member.id;
    }

    if (query.trainerProfileId) {
      where.trainerProfileId = query.trainerProfileId;
    } else if (this.hasRole(actor, 'TRAINER') && !this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'])) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId: actor.id } },
      });
      if (trainer) where.trainerProfileId = trainer.id;
    }

    if (query.outletId) {
      where.outletId = query.outletId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.scheduledStart = {};
      if (query.startDate) where.scheduledStart.gte = new Date(query.startDate);
      if (query.endDate) where.scheduledStart.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.personalTrainingSession.findMany({
        where,
        include: {
          memberProfile: { include: { user: true } },
          trainerProfile: true,
          outlet: true,
        },
        orderBy: { scheduledStart: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.personalTrainingSession.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
