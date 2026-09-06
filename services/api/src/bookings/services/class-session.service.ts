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

@Injectable()
export class ClassSessionService {
  private readonly logger = new Logger(ClassSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // 1. Conflict Check: Trainer Overlapping Schedule
    if (dto.trainerId) {
      const trainerConflict = await this.prisma.classSession.findFirst({
        where: {
          trainerId: dto.trainerId,
          status: { not: 'CANCELLED' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        include: { outlet: true },
      });

      if (trainerConflict) {
        throw new ConflictException({
          code: 'TRAINER_SCHEDULE_CONFLICT',
          message: `Trainer already has a scheduled class "${trainerConflict.name || 'Class'}" at ${trainerConflict.outlet.name} between ${trainerConflict.startsAt.toISOString()} and ${trainerConflict.endsAt.toISOString()}`,
        });
      }
    }

    // 2. Conflict Check: Exclusive Resource / Room Overlap
    if (dto.resourceId) {
      const resourceConflict = await this.prisma.classSession.findFirst({
        where: {
          resourceId: dto.resourceId,
          status: { not: 'CANCELLED' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        include: { resource: true },
      });

      if (resourceConflict) {
        throw new ConflictException({
          code: 'RESOURCE_SCHEDULE_CONFLICT',
          message: `Resource "${resourceConflict.resource?.name || 'Room'}" is already booked between ${resourceConflict.startsAt.toISOString()} and ${resourceConflict.endsAt.toISOString()}`,
        });
      }
    }

    // Default booking windows if not specified
    const bookingOpensAt = dto.bookingOpensAt
      ? new Date(dto.bookingOpensAt)
      : new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days prior

    const bookingClosesAt = dto.bookingClosesAt
      ? new Date(dto.bookingClosesAt)
      : new Date(startsAt.getTime() - 15 * 60 * 1000); // 15 mins prior

    const cancellationClosesAt = dto.cancellationClosesAt
      ? new Date(dto.cancellationClosesAt)
      : new Date(startsAt.getTime() - 2 * 60 * 60 * 1000); // 2 hours prior

    const capacity = dto.capacity || classType.defaultCapacity || 20;

    const session = await this.prisma.classSession.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        classTypeId: dto.classTypeId,
        classTemplateId: dto.classTemplateId,
        trainerId: dto.trainerId,
        resourceId: dto.resourceId,
        bookingPolicyId: dto.bookingPolicyId,
        name: dto.name || classType.name,
        startsAt,
        endsAt,
        capacity,
        status: 'OPEN',
        bookingOpensAt,
        bookingClosesAt,
        cancellationClosesAt,
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        outlet: true,
      },
    });

    this.logger.log(
      `[CLASS SESSION] Created session ${session.id} (${session.name}) at outlet ${dto.outletId}`,
    );

    return session;
  }

  /**
   * Updates an existing session.
   */
  async updateSession(sessionId: string, dto: UpdateClassSessionDto) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'CLASS_SESSION_NOT_FOUND',
        message: 'Class session not found',
      });
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : session.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : session.endsAt;

    // Validate trainer conflict if updated
    const trainerId = dto.trainerId !== undefined ? dto.trainerId : session.trainerId;
    if (trainerId && (dto.startsAt || dto.endsAt || dto.trainerId)) {
      const conflict = await this.prisma.classSession.findFirst({
        where: {
          id: { not: sessionId },
          trainerId,
          status: { not: 'CANCELLED' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });

      if (conflict) {
        throw new ConflictException({
          code: 'TRAINER_SCHEDULE_CONFLICT',
          message: 'Trainer has an overlapping class during this time period',
        });
      }
    }

    // Validate resource conflict if updated
    const resourceId = dto.resourceId !== undefined ? dto.resourceId : session.resourceId;
    if (resourceId && (dto.startsAt || dto.endsAt || dto.resourceId)) {
      const conflict = await this.prisma.classSession.findFirst({
        where: {
          id: { not: sessionId },
          resourceId,
          status: { not: 'CANCELLED' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });

      if (conflict) {
        throw new ConflictException({
          code: 'RESOURCE_SCHEDULE_CONFLICT',
          message: 'Resource is already reserved during this time period',
        });
      }
    }

    return this.prisma.classSession.update({
      where: { id: sessionId },
      data: {
        name: dto.name,
        trainerId: dto.trainerId,
        resourceId: dto.resourceId,
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        capacity: dto.capacity,
        status: dto.status,
        cancellationReason: dto.cancellationReason,
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
      },
    });
  }

  /**
   * Cancels a scheduled class session and all active bookings.
   */
  async cancelSession(sessionId: string, reason?: string) {
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

    return this.prisma.$transaction(async (tx) => {
      const cancelledSession = await tx.classSession.update({
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

      this.logger.log(
        `[CLASS SESSION] Cancelled session ${sessionId} and all linked bookings`,
      );

      return cancelledSession;
    });
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

    const [confirmedCount, waitlistCount] = await Promise.all([
      this.prisma.booking.count({
        where: { classSessionId: sessionId, status: 'CONFIRMED' },
      }),
      this.prisma.waitlistEntry.count({
        where: { classSessionId: sessionId, status: 'PENDING' },
      }),
    ]);

    const spotsRemaining = Math.max(0, session.capacity - confirmedCount);

    let userBookingStatus = null;
    let waitlistPosition = null;

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
        waitlistPosition = userBooking.waitlistPosition;
      }
    }

    return {
      ...session,
      confirmedBookingCount: confirmedCount,
      waitlistCount,
      spotsRemaining,
      userBookingStatus,
      waitlistPosition,
    };
  }

  /**
   * Lists sessions with flexible filtering for members and staff.
   */
  async listSessions(
    organisationId: string,
    query: QuerySessionsDto,
    memberProfileId?: string,
  ) {
    const now = new Date();
    const startDate = query.startDate ? new Date(query.startDate) : now;
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    const sessions = await this.prisma.classSession.findMany({
      where: {
        organisationId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        startsAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
        ...(query.classTypeId ? { classTypeId: query.classTypeId } : {}),
        ...(query.trainerId ? { trainerId: query.trainerId } : {}),
        ...(query.category
          ? { classType: { category: query.category } }
          : {}),
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        outlet: { select: { id: true, name: true, code: true, city: true } },
      },
      orderBy: { startsAt: 'asc' },
      skip: query.skip || 0,
      take: query.take || 50,
    });

    // Populate capacities and user booking state
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const [confirmedCount, waitlistCount] = await Promise.all([
          this.prisma.booking.count({
            where: { classSessionId: s.id, status: 'CONFIRMED' },
          }),
          this.prisma.waitlistEntry.count({
            where: { classSessionId: s.id, status: 'PENDING' },
          }),
        ]);

        let userBookingStatus = null;
        if (memberProfileId) {
          const userBooking = await this.prisma.booking.findFirst({
            where: {
              classSessionId: s.id,
              memberProfileId,
              status: { in: ['CONFIRMED', 'WAITLISTED', 'CHECKED_IN'] },
            },
          });
          if (userBooking) {
            userBookingStatus = userBooking.status;
          }
        }

        return {
          ...s,
          confirmedBookingCount: confirmedCount,
          waitlistCount,
          spotsRemaining: Math.max(0, s.capacity - confirmedCount),
          userBookingStatus,
        };
      }),
    );

    return enriched;
  }
}
