import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SubstituteTrainerDto } from '../dto/substitute-trainer.dto';

@Injectable()
export class TrainerOperationsService {
  private readonly logger = new Logger(TrainerOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records trainer check-in for a scheduled class session.
   * Allows either assigned trainer, substitute trainer, or staff on their behalf.
   */
  async trainerCheckIn(
    classSessionId: string,
    organisationId: string,
    callerUserId: string,
    isStaffOverride = false,
  ) {
    const now = new Date();

    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found in this organisation',
      });
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'SESSION_CANCELLED',
        message: 'Cannot record trainer check-in for a cancelled session',
      });
    }

    // Permission check: caller must be assigned trainer, substitute trainer, or staff override
    const effectiveTrainerId = session.substituteTrainerId || session.trainerId;
    const isAssignedTrainer =
      session.trainerId === callerUserId || session.substituteTrainerId === callerUserId;

    if (!isAssignedTrainer && !isStaffOverride) {
      throw new ForbiddenException({
        code: 'NOT_ASSIGNED_TRAINER',
        message: 'Only the assigned or substitute trainer (or authorized staff) can check in',
      });
    }

    const trainerStatus = session.substituteTrainerId ? 'SUBSTITUTE' : 'CHECKED_IN';

    const updated = await this.prisma.classSession.update({
      where: { id: classSessionId },
      data: {
        trainerCheckedInAt: now,
        trainerAttendanceStatus: trainerStatus,
      },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true } },
        outlet: { select: { id: true, name: true } },
        classType: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      userId: callerUserId,
      organisationId,
      outletId: session.outletId,
      action: 'TRAINER_CHECK_IN',
      resource: 'CLASS_SESSION',
      resourceId: classSessionId,
      metadata: {
        trainerId: session.trainerId,
        substituteTrainerId: session.substituteTrainerId,
        effectiveTrainerId,
        trainerStatus,
        isStaffOverride,
      },
    });

    this.logger.log(
      `[TRAINER] Trainer check-in recorded for session ${classSessionId} (Trainer: ${effectiveTrainerId})`,
    );

    return updated;
  }

  /**
   * Records trainer check-out for a scheduled class session.
   */
  async trainerCheckOut(
    classSessionId: string,
    organisationId: string,
    callerUserId: string,
    isStaffOverride = false,
  ) {
    const now = new Date();

    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found in this organisation',
      });
    }

    const isAssignedTrainer =
      session.trainerId === callerUserId || session.substituteTrainerId === callerUserId;

    if (!isAssignedTrainer && !isStaffOverride) {
      throw new ForbiddenException({
        code: 'NOT_ASSIGNED_TRAINER',
        message: 'Only the assigned or substitute trainer (or authorized staff) can check out',
      });
    }

    if (!session.trainerCheckedInAt) {
      throw new BadRequestException({
        code: 'TRAINER_NOT_CHECKED_IN',
        message: 'Trainer has not checked in to this class session yet',
      });
    }

    const updated = await this.prisma.classSession.update({
      where: { id: classSessionId },
      data: {
        trainerCheckedOutAt: now,
        trainerAttendanceStatus: 'COMPLETED',
      },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      userId: callerUserId,
      organisationId,
      outletId: session.outletId,
      action: 'TRAINER_CHECK_OUT',
      resource: 'CLASS_SESSION',
      resourceId: classSessionId,
      metadata: {
        trainerId: session.trainerId,
        substituteTrainerId: session.substituteTrainerId,
        checkedInAt: session.trainerCheckedInAt,
        checkedOutAt: now,
      },
    });

    this.logger.log(
      `[TRAINER] Trainer check-out recorded for session ${classSessionId}`,
    );

    return updated;
  }

  /**
   * Substitutes the trainer for a specific class session instance.
   * Strict invariant: Mutates only the single ClassSession record.
   * Never mutates the parent recurring schedule or other session instances.
   */
  async substituteTrainer(
    classSessionId: string,
    organisationId: string,
    dto: SubstituteTrainerDto,
    staffUserId: string,
  ) {
    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        recurringSchedule: { select: { id: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found in this organisation',
      });
    }

    // Verify substitute trainer user exists and is active in organisation
    const substitute = await this.prisma.user.findFirst({
      where: {
        id: dto.substituteTrainerId,
        userRoles: {
          some: {
            organisationId,
          },
        },
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!substitute) {
      throw new NotFoundException({
        code: 'SUBSTITUTE_TRAINER_NOT_FOUND',
        message: 'Substitute trainer not found or inactive in this organisation',
      });
    }

    const originalTrainerId = session.trainerId;

    // Mutate ONLY this individual session
    const updated = await this.prisma.classSession.update({
      where: { id: classSessionId },
      data: {
        substituteTrainerId: dto.substituteTrainerId,
        trainerAttendanceStatus: 'SUBSTITUTE',
      },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        outlet: { select: { id: true, name: true } },
        classType: { select: { id: true, name: true } },
      },
    });

    // Audit Logging with complete rationale
    await this.auditService.log({
      userId: staffUserId,
      organisationId,
      outletId: session.outletId,
      action: 'TRAINER_SUBSTITUTED',
      resource: 'CLASS_SESSION',
      resourceId: classSessionId,
      metadata: {
        originalTrainerId,
        substituteTrainerId: dto.substituteTrainerId,
        reason: dto.reason,
        notes: dto.notes,
        recurringScheduleId: session.recurringScheduleId, // Logged to prove template was not mutated
      },
    });

    this.logger.log(
      `[TRAINER] Session ${classSessionId} trainer substituted: ${originalTrainerId} -> ${dto.substituteTrainerId} (Reason: ${dto.reason})`,
    );

    return updated;
  }
}
