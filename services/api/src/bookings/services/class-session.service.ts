import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClassSessionDto, UpdateClassSessionDto, QuerySessionsDto } from '../dto';
import { ClassSession } from '@fitcore/types';
import { TrainerAvailabilityService } from './trainer-availability.service';
import { ResourceService } from './resource.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ClassSessionService {
  private readonly logger = new Logger(ClassSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trainerAvailabilityService: TrainerAvailabilityService,
    private readonly resourceService: ResourceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Schedules a new class session with conflict detection for trainer and room.
   */
  async createSession(organisationId: string, dto: CreateClassSessionDto) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });

    if (!outlet) {
      throw new NotFoundException({
        code: 'OUTLET_NOT_FOUND',
        message: 'Outlet not found in this organisation',
      });
    }

    const classType = await this.prisma.classType.findFirst({
      where: { id: dto.classTypeId, organisationId },
    });

    if (!classType) {
      throw new NotFoundException({
        code: 'CLASS_TYPE_NOT_FOUND',
        message: 'Class type not found in this organisation',
      });
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException({
        code: 'INVALID_SESSION_TIMES',
        message: 'Session end time must be after start time',
      });
    }

    // 1. Conflict Check: Trainer Overlapping Schedule & Availability
    if (dto.trainerId) {
      const trainerCheck = await this.trainerAvailabilityService.isTrainerAvailable(
        dto.trainerId,
        startsAt,
        endsAt,
      );

      if (!trainerCheck.available) {
        throw new ConflictException({
          code: 'TRAINER_SCHEDULE_CONFLICT',
          message: trainerCheck.reason || 'Trainer is not available during this time slot',
        });
      }
    }

    // 2. Conflict Check: Exclusive Resource / Room Overlap
    if (dto.resourceId) {
      const resourceCheck = await this.resourceService.isResourceAvailable(
        dto.resourceId,
        startsAt,
        endsAt,
      );

      if (!resourceCheck.available) {
        throw new ConflictException({
          code: 'RESOURCE_SCHEDULE_CONFLICT',
          message: `Resource is already booked by session "${resourceCheck.conflictingSessionName}"`,
        });
      }
    }

    // Default booking windows if not specified
    const bookingOpensAt = dto.bookingOpensAt
      ? new Date(dto.bookingOpensAt)
      : new Date(startsAt.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days prior

    const bookingClosesAt = dto.bookingClosesAt
      ? new Date(dto.bookingClosesAt)
      : new Date(startsAt.getTime() - 30 * 60 * 1000); // 30 min prior

    const cancellationClosesAt = dto.cancellationClosesAt
      ? new Date(dto.cancellationClosesAt)
      : new Date(startsAt.getTime() - 2 * 60 * 60 * 1000); // 2 hours prior

    return this.prisma.classSession.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        classTemplateId: dto.classTemplateId,
        classTypeId: dto.classTypeId,
        trainerId: dto.trainerId,
        resourceId: dto.resourceId,
        bookingPolicyId: dto.bookingPolicyId,
        name: dto.name || classType.name,
        startsAt,
        endsAt,
        capacity: dto.capacity || classType.defaultCapacity || 20,
        status: 'OPEN',
        isOverride: false,
        bookingOpensAt,
        bookingClosesAt,
        cancellationClosesAt,
      },
      include: {
        classType: true,
        classTemplate: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        outlet: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Updates a scheduled class session.
   * If modifying an occurrence from a recurring schedule, flags `isOverride: true`.
   */
  async updateSession(
    sessionId: string,
    dto: UpdateClassSessionDto,
    staffUserId?: string,
  ) {
    const existing = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { outlet: true, classType: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'CLASS_SESSION_NOT_FOUND',
        message: 'Class session not found',
      });
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;

    if (endsAt <= startsAt) {
      throw new BadRequestException({
        code: 'INVALID_SESSION_TIMES',
        message: 'Session end time must be after start time',
      });
    }

    // Capacity check: ensure capacity is not reduced below existing confirmed bookings
    if (dto.capacity !== undefined) {
      const confirmedCount = await this.prisma.booking.count({
        where: {
          classSessionId: sessionId,
          status: 'CONFIRMED',
        },
      });

      if (dto.capacity < confirmedCount) {
        throw new BadRequestException({
          code: 'CAPACITY_BELOW_CONFIRMED_BOOKINGS',
          message: `Cannot reduce capacity to ${dto.capacity} because ${confirmedCount} bookings are already confirmed`,
        });
      }
    }

    // Check trainer conflict only if time or trainer changed
    const timeOrTrainerChanged =
      (dto.startsAt && new Date(dto.startsAt).getTime() !== existing.startsAt.getTime()) ||
      (dto.endsAt && new Date(dto.endsAt).getTime() !== existing.endsAt.getTime()) ||
      (dto.trainerId !== undefined && dto.trainerId !== existing.trainerId);

    const targetTrainerId = dto.trainerId !== undefined ? dto.trainerId : existing.trainerId;
    if (timeOrTrainerChanged && targetTrainerId) {
      const trainerCheck = await this.trainerAvailabilityService.isTrainerAvailable(
        targetTrainerId,
        startsAt,
        endsAt,
        {
          sessionId,
          staffUserId,
          organisationId: existing.organisationId,
          allowOverride: true, // Allow authorized staff override
        },
      );

      if (!trainerCheck.available) {
        throw new ConflictException({
          code: 'TRAINER_SCHEDULE_CONFLICT',
          message: trainerCheck.reason || 'Trainer is not available during this time slot',
        });
      }
    }

    // Check resource conflict only if time or resource changed
    const timeOrResourceChanged =
      (dto.startsAt && new Date(dto.startsAt).getTime() !== existing.startsAt.getTime()) ||
      (dto.endsAt && new Date(dto.endsAt).getTime() !== existing.endsAt.getTime()) ||
      (dto.resourceId !== undefined && dto.resourceId !== existing.resourceId);

    const targetResourceId = dto.resourceId !== undefined ? dto.resourceId : existing.resourceId;
    if (timeOrResourceChanged && targetResourceId) {
      const resourceCheck = await this.resourceService.isResourceAvailable(
        targetResourceId,
        startsAt,
        endsAt,
        { excludeSessionId: sessionId },
      );

      if (!resourceCheck.available) {
        throw new ConflictException({
          code: 'RESOURCE_SCHEDULE_CONFLICT',
          message: `Resource is already booked by session "${resourceCheck.conflictingSessionName}"`,
        });
      }
    }

    // Track override
    const isOverride = Boolean(
      existing.recurringScheduleId &&
        (dto.startsAt || dto.endsAt || dto.trainerId || dto.resourceId || dto.capacity),
    );

    const updated = await this.prisma.classSession.update({
      where: { id: sessionId },
      data: {
        name: dto.name,
        trainerId: dto.trainerId,
        resourceId: dto.resourceId,
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        capacity: dto.capacity,
        status: dto.status,
        isOverride: isOverride || existing.isOverride,
        originalStartsAt: isOverride && !existing.originalStartsAt ? existing.startsAt : existing.originalStartsAt,
        cancellationReason: dto.cancellationReason,
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        outlet: true,
      },
    });

    if (staffUserId) {
      await this.auditService.log({
        userId: staffUserId,
        organisationId: existing.organisationId,
        outletId: existing.outletId,
        action: 'CLASS_SESSION_MODIFIED',
        resource: 'CLASS_SESSION',
        resourceId: sessionId,
        metadata: {
          isOverride,
          changes: dto,
        },
      });
    }

    return updated;
  }

  /**
   * Cancels a scheduled class session and all active bookings.
   */
  async cancelSession(sessionId: string, reason?: string, staffUserId?: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'CLASS_SESSION_NOT_FOUND',
        message: 'Class session not found',
      });
    }

    const now = new Date();

    const cancelledSession = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.classSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason || 'Session cancelled by facility management',
        },
      });

      // Cancel all confirmed & waitlisted bookings
      await tx.booking.updateMany({
        where: {
          classSessionId: sessionId,
          status: { in: ['CONFIRMED', 'WAITLISTED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason || 'Class cancelled by facility management',
        },
      });

      // Cancel all pending waitlist entries
      await tx.waitlistEntry.updateMany({
        where: {
          classSessionId: sessionId,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      return cancelled;
    });

    if (staffUserId) {
      await this.auditService.log({
        userId: staffUserId,
        organisationId: session.organisationId,
        outletId: session.outletId,
        action: 'CLASS_SESSION_CANCELLED',
        resource: 'CLASS_SESSION',
        resourceId: sessionId,
        metadata: { reason },
      });
    }

    this.logger.log(
      `[CLASS SESSION] Cancelled session ${sessionId} and all linked bookings (Reason: ${reason || 'Facility management'})`,
    );

    return cancelledSession;
  }

  /**
   * Fetches full session details with spots remaining and user booking state.
   */
  async getSessionDetails(sessionId: string, memberProfileId?: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        classType: true,
        classTemplate: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        outlet: { select: { id: true, name: true, code: true, city: true, timezone: true } },
        bookingPolicy: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'CLASS_SESSION_NOT_FOUND',
        message: 'Class session not found',
      });
    }

    // Calculate confirmed bookings count
    const confirmedBookingCount = await this.prisma.booking.count({
      where: {
        classSessionId: sessionId,
        status: 'CONFIRMED',
      },
    });

    // Calculate waitlist count
    const waitlistCount = await this.prisma.waitlistEntry.count({
      where: {
        classSessionId: sessionId,
        status: 'PENDING',
      },
    });

    const spotsRemaining = Math.max(0, session.capacity - confirmedBookingCount);

    // If memberProfileId provided, check their booking/waitlist status
    let userBookingStatus = null;
    let userWaitlistPosition = null;

    if (memberProfileId) {
      const userBooking = await this.prisma.booking.findFirst({
        where: {
          classSessionId: sessionId,
          memberProfileId,
          status: { in: ['CONFIRMED', 'WAITLISTED', 'CHECKED_IN'] },
        },
      });

      if (userBooking) {
        userBookingStatus = userBooking.status;
        userWaitlistPosition = userBooking.waitlistPosition;
      }
    }

    return {
      ...session,
      confirmedBookingCount,
      waitlistCount,
      spotsRemaining,
      userBookingStatus,
      userWaitlistPosition,
    };
  }

  /**
   * Lists scheduled class sessions matching query filters.
   */
  async listSessions(
    organisationId: string,
    query: QuerySessionsDto,
    memberProfileId?: string,
  ): Promise<{ data: ClassSession[]; total: number }> {
    const where: any = {
      organisationId,
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.classTypeId ? { classTypeId: query.classTypeId } : {}),
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      ...(query.status ? { status: query.status } : { status: { not: 'CANCELLED' } }),
    };

    if (query.startDate || query.endDate) {
      where.startsAt = {};
      if (query.startDate) where.startsAt.gte = new Date(query.startDate);
      if (query.endDate) where.startsAt.lte = new Date(query.endDate);
    }

    const [sessions, total] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        include: {
          classType: true,
          classTemplate: true,
          trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
          resource: true,
          outlet: { select: { id: true, name: true, code: true, timezone: true } },
          _count: {
            select: { bookings: true, waitlistEntries: true },
          },
        },
        orderBy: { startsAt: 'asc' },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.classSession.count({ where }),
    ]);

    // Enhance sessions with live spots remaining
    const enhanced = await Promise.all(
      sessions.map(async (s) => {
        const confirmedBookingCount = await this.prisma.booking.count({
          where: { classSessionId: s.id, status: 'CONFIRMED' },
        });
        const waitlistCount = await this.prisma.waitlistEntry.count({
          where: { classSessionId: s.id, status: 'PENDING' },
        });
        const spotsRemaining = Math.max(0, s.capacity - confirmedBookingCount);

        let userBookingStatus = null;
        if (memberProfileId) {
          const userBooking = await this.prisma.booking.findFirst({
            where: {
              classSessionId: s.id,
              memberProfileId,
              status: { in: ['CONFIRMED', 'WAITLISTED', 'CHECKED_IN'] },
            },
            select: { status: true },
          });
          userBookingStatus = userBooking?.status || null;
        }

        return {
          ...s,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          bookingOpensAt: s.bookingOpensAt?.toISOString(),
          bookingClosesAt: s.bookingClosesAt?.toISOString(),
          cancellationClosesAt: s.cancellationClosesAt?.toISOString(),
          cancelledAt: s.cancelledAt?.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          confirmedBookingCount,
          waitlistCount,
          spotsRemaining,
          userBookingStatus,
        } as unknown as ClassSession;
      }),
    );

    return { data: enhanced, total };
  }
}
