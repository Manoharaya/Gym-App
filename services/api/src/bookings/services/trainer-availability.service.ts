import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTrainerAvailabilityDto, RecordTrainerUnavailabilityDto } from '../dto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TrainerAvailabilityService {
  private readonly logger = new Logger(TrainerAvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records regular recurring availability for a trainer (e.g. Mon 09:00 - 17:00).
   */
  async setAvailability(organisationId: string, dto: CreateTrainerAvailabilityDto) {
    const trainer = await this.prisma.user.findFirst({
      where: {
        id: dto.trainerId,
        userRoles: { some: { role: { name: { in: ['TRAINER', 'SUPERADMIN', 'OUTLET_MANAGER', 'ORGANISATION_OWNER'] } } } },
      },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found or user does not possess trainer role');
    }

    return this.prisma.trainerAvailability.create({
      data: {
        organisationId,
        trainerId: dto.trainerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        specificDate: dto.specificDate ? new Date(dto.specificDate) : undefined,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
        notes: dto.notes,
      },
    });
  }

  /**
   * Records trainer unavailability, leave, vacation, or blockout.
   */
  async recordUnavailability(
    organisationId: string,
    dto: RecordTrainerUnavailabilityDto,
    recordedByUserId?: string,
  ) {
    const trainer = await this.prisma.user.findFirst({
      where: { id: dto.trainerId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : startDate;

    const record = await this.prisma.trainerAvailability.create({
      data: {
        organisationId,
        trainerId: dto.trainerId,
        specificDate: startDate,
        endDate: dto.endDate ? endDate : undefined,
        isAvailable: false,
        reason: dto.reason || 'UNAVAILABLE',
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      userId: recordedByUserId,
      organisationId,
      action: 'TRAINER_UNAVAILABILITY_RECORDED',
      resource: 'TRAINER_AVAILABILITY',
      resourceId: record.id,
      metadata: {
        trainerId: dto.trainerId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `[TRAINER] Recorded unavailability for trainer ${dto.trainerId} from ${dto.startDate} to ${dto.endDate || dto.startDate} (${dto.reason})`,
    );

    return record;
  }

  /**
   * Checks whether a trainer is available during a given time window.
   * Supports authorized staff override with audit trail.
   */
  async isTrainerAvailable(
    trainerId: string,
    startsAt: Date,
    endsAt: Date,
    options?: {
      allowOverride?: boolean;
      staffUserId?: string;
      organisationId?: string;
      sessionId?: string;
    },
  ): Promise<{ available: boolean; reason?: string; wasOverridden?: boolean }> {
    // 1. Check for specific date blockout or multi-day leave
    const leaveBlockout = await this.prisma.trainerAvailability.findFirst({
      where: {
        trainerId,
        isAvailable: false,
        OR: [
          // Single specific date match
          {
            specificDate: {
              gte: new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()),
              lt: new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate() + 1),
            },
            endDate: null,
          },
          // Multi-day leave window overlap
          {
            specificDate: { lte: endsAt },
            endDate: { gte: startsAt },
          },
        ],
      },
    });

    if (leaveBlockout) {
      const reasonMsg =
        leaveBlockout.reason || leaveBlockout.notes || 'Trainer is marked unavailable for this period';

      if (options?.allowOverride && options.staffUserId) {
        await this.auditService.log({
          userId: options.staffUserId,
          organisationId: options.organisationId,
          action: 'TRAINER_CONFLICT_OVERRIDDEN',
          resource: 'CLASS_SESSION',
          resourceId: options.sessionId,
          metadata: {
            trainerId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            originalBlockoutReason: reasonMsg,
          },
        });

        this.logger.warn(
          `[TRAINER OVERRIDE] Staff ${options.staffUserId} authorized override for unavailable trainer ${trainerId}`,
        );

        return { available: true, wasOverridden: true };
      }

      return {
        available: false,
        reason: `Trainer unavailable: ${reasonMsg}`,
      };
    }

    // 2. Check for conflicting active scheduled class session
    const conflictingSession = await this.prisma.classSession.findFirst({
      where: {
        trainerId,
        status: { not: 'CANCELLED' },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(options?.sessionId ? { id: { not: options.sessionId } } : {}),
      },
      include: { outlet: true },
    });

    if (conflictingSession) {
      const conflictMsg = `Trainer already has a conflicting class "${conflictingSession.name}" at ${conflictingSession.outlet.name}`;

      if (options?.allowOverride && options.staffUserId) {
        await this.auditService.log({
          userId: options.staffUserId,
          organisationId: options.organisationId,
          action: 'TRAINER_SESSION_CONFLICT_OVERRIDDEN',
          resource: 'CLASS_SESSION',
          resourceId: options.sessionId,
          metadata: {
            trainerId,
            conflictingSessionId: conflictingSession.id,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });

        return { available: true, wasOverridden: true };
      }

      return {
        available: false,
        reason: conflictMsg,
      };
    }

    return { available: true };
  }

  /**
   * Fetches full trainer schedule for staff/trainer calendar view.
   */
  async getTrainerSchedule(trainerId: string, startDate: Date, endDate: Date) {
    const [sessions, availability] = await Promise.all([
      this.prisma.classSession.findMany({
        where: {
          trainerId,
          startsAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        include: {
          classType: true,
          outlet: { select: { id: true, name: true, code: true } },
          resource: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.trainerAvailability.findMany({
        where: {
          trainerId,
          OR: [
            { dayOfWeek: { not: null } },
            { specificDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      trainerId,
      startDate,
      endDate,
      sessions,
      availability,
    };
  }
}
