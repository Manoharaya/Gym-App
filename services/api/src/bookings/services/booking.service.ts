import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BookingEligibilityService } from './booking-eligibility.service';
import { WaitlistService } from './waitlist.service';
import { BookingStatus } from '@fitcore/types';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: BookingEligibilityService,
    private readonly waitlistService: WaitlistService,
  ) {}

  /**
   * Creates a member booking for a class session.
   * Enforces transactional capacity limits and automatic waitlisting.
   * Supports idempotency via Idempotency-Key.
   */
  async bookSession(
    organisationId: string,
    memberProfileId: string,
    classSessionId: string,
    options?: {
      idempotencyKey?: string;
      isStaffManual?: boolean;
      notes?: string;
    },
  ) {
    // 1. Check Idempotency Key Replay
    if (options?.idempotencyKey) {
      const existing = await this.prisma.booking.findFirst({
        where: {
          organisationId,
          idempotencyKey: options.idempotencyKey,
        },
        include: {
          classSession: {
            include: { classType: true, trainer: true, resource: true },
          },
        },
      });

      if (existing) {
        this.logger.log(
          `[BOOKING] Idempotent replay returned for key ${options.idempotencyKey}`,
        );
        return {
          ...existing,
          _isIdempotentReplay: true,
        };
      }
    }

    // 2. Authoritative Eligibility Verification
    const eligibility = await this.eligibilityService.checkEligibility(
      memberProfileId,
      classSessionId,
      { isStaffOverride: options?.isStaffManual },
    );

    if (!eligibility.eligible) {
      this.logger.warn(
        `[BOOKING] Eligibility check failed for member ${memberProfileId} on session ${classSessionId}: ${eligibility.reason}`,
      );

      switch (eligibility.reason) {
        case 'CLASS_SESSION_NOT_FOUND':
          throw new NotFoundException({
            code: 'CLASS_SESSION_NOT_FOUND',
            message: eligibility.message,
          });
        case 'CLASS_SESSION_CANCELLED':
          throw new BadRequestException({
            code: 'CLASS_SESSION_CANCELLED',
            message: eligibility.message,
          });
        case 'ORGANISATION_MISMATCH':
          throw new ForbiddenException({
            code: 'ORGANISATION_MISMATCH',
            message: eligibility.message,
          });
        case 'MEMBERSHIP_REQUIRED':
        case 'MEMBERSHIP_INACTIVE':
        case 'MEMBERSHIP_SUSPENDED':
          throw new ForbiddenException({
            code: eligibility.reason,
            message: eligibility.message,
          });
        case 'OUTLET_NOT_AUTHORIZED':
          throw new ForbiddenException({
            code: 'OUTLET_NOT_AUTHORIZED',
            message: eligibility.message,
          });
        case 'MEMBERSHIP_ENTITLEMENT_REQUIRED':
          throw new ForbiddenException({
            code: 'MEMBERSHIP_ENTITLEMENT_REQUIRED',
            message: eligibility.message,
          });
        case 'BOOKING_NOT_OPEN':
        case 'BOOKING_CLOSED':
        case 'BOOKING_LIMIT_REACHED':
          throw new BadRequestException({
            code: eligibility.reason,
            message: eligibility.message,
          });
        case 'ALREADY_BOOKED':
        case 'ALREADY_WAITLISTED':
        case 'BOOKING_TIME_CONFLICT':
          throw new ConflictException({
            code: eligibility.reason,
            message: eligibility.message,
          });
        default:
          throw new BadRequestException({
            code: eligibility.reason || 'BOOKING_NOT_ALLOWED',
            message: eligibility.message,
          });
      }
    }

    // 3. Atomic Transactional Booking with Capacity Lock
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.classSession.findUnique({
        where: { id: classSessionId },
        include: {
          bookingPolicy: true,
          outlet: true,
        },
      });

      if (!session) {
        throw new NotFoundException({
          code: 'CLASS_SESSION_NOT_FOUND',
          message: 'Class session does not exist',
        });
      }

      // Count confirmed bookings inside transaction
      const confirmedCount = await tx.booking.count({
        where: {
          classSessionId,
          status: 'CONFIRMED',
        },
      });

      // A. CONFIRMED Booking Available
      if (confirmedCount < session.capacity) {
        const booking = await tx.booking.create({
          data: {
            organisationId,
            outletId: session.outletId,
            memberProfileId,
            classSessionId,
            status: 'CONFIRMED',
            idempotencyKey: options?.idempotencyKey,
            metadata: options?.notes ? { notes: options.notes } : undefined,
          },
          include: {
            classSession: {
              include: { classType: true, trainer: true, resource: true },
            },
          },
        });

        // Update session status to FULL if capacity is reached
        if (confirmedCount + 1 >= session.capacity) {
          await tx.classSession.update({
            where: { id: classSessionId },
            data: { status: 'FULL' },
          });
        }

        this.logger.log(
          `[BOOKING] Confirmed booking ${booking.id} created for member ${memberProfileId} in session ${classSessionId} (${confirmedCount + 1}/${session.capacity})`,
        );

        return booking;
      }

      // B. Session Full -> Evaluate Waitlist
      const policy =
        session.bookingPolicy ||
        (await tx.bookingPolicy.findFirst({
          where: { organisationId, isDefault: true },
        }));

      const allowWaitlist = policy ? policy.allowWaitlist : true;
      const maxWaitlistSize = policy ? policy.maxWaitlistSize : 10;

      if (!allowWaitlist) {
        throw new ConflictException({
          code: 'CLASS_FULL',
          message: 'Class session is full and waitlist is disabled',
        });
      }

      const currentWaitlistCount = await tx.waitlistEntry.count({
        where: {
          classSessionId,
          status: 'PENDING',
        },
      });

      if (currentWaitlistCount >= maxWaitlistSize) {
        throw new ConflictException({
          code: 'CLASS_FULL',
          message: `Class session and waitlist are at full capacity (${maxWaitlistSize} waitlist limit reached)`,
        });
      }

      // Create waitlisted booking
      const booking = await tx.booking.create({
        data: {
          organisationId,
          outletId: session.outletId,
          memberProfileId,
          classSessionId,
          status: 'WAITLISTED',
          idempotencyKey: options?.idempotencyKey,
          metadata: options?.notes ? { notes: options.notes } : undefined,
        },
      });

      // Add to waitlist queue
      await this.waitlistService.addToWaitlist(
        tx,
        organisationId,
        session.outletId,
        classSessionId,
        memberProfileId,
        booking.id,
      );

      const refreshed = await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          classSession: {
            include: { classType: true, trainer: true, resource: true },
          },
        },
      });

      return refreshed!;
    });
  }

  /**
   * Cancels a booking and triggers waitlist promotion if a confirmed spot opened up.
   */
  async cancelBooking(
    bookingId: string,
    memberProfileId: string,
    options?: {
      isStaffOverride?: boolean;
      reason?: string;
    },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        classSession: {
          include: { bookingPolicy: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking does not exist',
      });
    }

    // Ownership check (unless staff override)
    if (!options?.isStaffOverride && booking.memberProfileId !== memberProfileId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot cancel another member booking',
      });
    }

    if (booking.status === 'CANCELLED') {
      return booking;
    }

    const now = new Date();
    const session = booking.classSession;

    // Cancellation window validation for CONFIRMED bookings (unless staff override)
    if (!options?.isStaffOverride && booking.status === 'CONFIRMED') {
      if (session.cancellationClosesAt && now > session.cancellationClosesAt) {
        throw new BadRequestException({
          code: 'CANCELLATION_WINDOW_CLOSED',
          message: `Cancellation deadline has passed (deadline was ${session.cancellationClosesAt.toISOString()})`,
        });
      }
    }

    // Execute cancellation
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: options?.reason || 'Member voluntary cancellation',
        },
        include: {
          classSession: true,
        },
      });

      // If it was waitlisted, also cancel the waitlist entry
      if (booking.status === 'WAITLISTED') {
        await tx.waitlistEntry.updateMany({
          where: { bookingId, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
      }

      // If it was confirmed and the session was full, reopen the session
      if (booking.status === 'CONFIRMED' && session.status === 'FULL') {
        await tx.classSession.update({
          where: { id: session.id },
          data: { status: 'OPEN' },
        });
      }

      return cancelled;
    });

    this.logger.log(
      `[BOOKING] Cancelled booking ${bookingId} for member ${memberProfileId}`,
    );

    // If a confirmed spot opened up, promote next eligible candidate from waitlist!
    if (booking.status === 'CONFIRMED') {
      try {
        await this.waitlistService.promoteNext(session.id);
      } catch (err) {
        this.logger.error(
          `[WAITLIST] Error promoting waitlist candidate after booking cancellation: ${err.message}`,
        );
      }
    }

    return updatedBooking;
  }

  /**
   * Marks a booking as checked in for attendance.
   */
  async checkInBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking does not exist',
      });
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });
  }

  /**
   * Marks a member as a no-show.
   */
  async markNoShow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking does not exist',
      });
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'NO_SHOW',
        noShowAt: new Date(),
      },
    });
  }

  /**
   * Lists bookings for a member profile.
   */
  async listMemberBookings(
    memberProfileId: string,
    options?: { status?: BookingStatus; upcomingOnly?: boolean },
  ) {
    const now = new Date();

    return this.prisma.booking.findMany({
      where: {
        memberProfileId,
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.upcomingOnly
          ? {
              status: { in: ['CONFIRMED', 'WAITLISTED'] },
              classSession: { startsAt: { gte: now } },
            }
          : {}),
      },
      include: {
        classSession: {
          include: {
            classType: true,
            outlet: { select: { id: true, name: true, code: true, city: true } },
            trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
            resource: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { classSession: { startsAt: 'asc' } },
    });
  }

  /**
   * Lists bookings for a class session (staff view).
   */
  async listSessionBookings(classSessionId: string) {
    return this.prisma.booking.findMany({
      where: { classSessionId },
      include: {
        memberProfile: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { bookedAt: 'asc' }],
    });
  }
}
