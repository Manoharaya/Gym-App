import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BookingEligibilityService } from '../../bookings/services/booking-eligibility.service';

export interface CheckInOptions {
  staffUserId?: string;
  allowWindowOverride?: boolean;
  notes?: string;
}

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eligibilityService: BookingEligibilityService,
  ) {}

  /**
   * Checks in a member with a confirmed reservation into a scheduled class session.
   */
  async checkInBookedMember(
    classSessionId: string,
    memberProfileId: string,
    method: string = 'MEMBER_SELF_SERVICE',
    options?: CheckInOptions,
  ) {
    const now = new Date();

    // 1. Fetch Session with Outlet and ClassType
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        outlet: true,
        classType: true,
        bookingPolicy: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found',
      });
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'SESSION_CANCELLED',
        message: 'Cannot check in to a cancelled class session',
      });
    }

    // 2. Fetch Member Profile
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { user: true },
    });

    if (!member || !['ACTIVE', 'ONBOARDING'].includes(member.status)) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member profile not found or inactive',
      });
    }

    // Tenant isolation verification
    if (member.organisationId !== session.organisationId) {
      throw new BadRequestException({
        code: 'ORGANISATION_MISMATCH',
        message: 'Member and session belong to different organisations',
      });
    }

    // 3. Find Confirmed Booking
    const booking = await this.prisma.booking.findFirst({
      where: {
        classSessionId,
        memberProfileId,
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'No booking found for this session. Use walk-in admission if member has no reservation.',
      });
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'BOOKING_CANCELLED',
        message: 'Your booking for this session was cancelled',
      });
    }

    if (booking.status === 'WAITLISTED') {
      throw new BadRequestException({
        code: 'BOOKING_WAITLISTED',
        message: 'You are still on the waitlist for this class. You can only check in once promoted.',
      });
    }

    // 4. Verify Check-In Window (default: -30m to +15m from startsAt) unless staff override
    const checkInOpensMinutes = 30;
    const checkInClosesMinutes = 15;

    const checkInOpensAt = new Date(session.startsAt.getTime() - checkInOpensMinutes * 60 * 1000);
    const checkInClosesAt = new Date(session.startsAt.getTime() + checkInClosesMinutes * 60 * 1000);

    if (!options?.allowWindowOverride) {
      if (now < checkInOpensAt) {
        throw new BadRequestException({
          code: 'CHECK_IN_NOT_OPEN',
          message: `Check-in opens ${checkInOpensMinutes} minutes before class (at ${checkInOpensAt.toISOString()})`,
        });
      }

      if (now > checkInClosesAt) {
        throw new BadRequestException({
          code: 'CHECK_IN_CLOSED',
          message: `Check-in closed ${checkInClosesMinutes} minutes after class started (at ${checkInClosesAt.toISOString()})`,
        });
      }
    }

    // 5. Check if already checked in
    const existingAttendance = await this.prisma.attendanceRecord.findUnique({
      where: {
        classSessionId_memberProfileId: {
          classSessionId,
          memberProfileId,
        },
      },
    });

    if (
      existingAttendance &&
      ['CHECKED_IN', 'LATE', 'COMPLETED'].includes(existingAttendance.status)
    ) {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_IN',
        message: 'Member is already checked in to this class session',
      });
    }

    // 6. Calculate Lateness
    let status = 'CHECKED_IN';
    let lateMinutes = 0;

    if (now > session.startsAt) {
      status = 'LATE';
      lateMinutes = Math.floor((now.getTime() - session.startsAt.getTime()) / 60000);
    }

    const isOverride = Boolean(options?.allowWindowOverride);

    // 7. Atomic Persistence
    const record = await this.prisma.$transaction(async (tx) => {
      // Upsert attendance record
      const attendance = await tx.attendanceRecord.upsert({
        where: {
          classSessionId_memberProfileId: {
            classSessionId,
            memberProfileId,
          },
        },
        create: {
          organisationId: session.organisationId,
          outletId: session.outletId,
          classSessionId,
          memberProfileId,
          bookingId: booking.id,
          status,
          checkInMethod: method,
          checkedInAt: now,
          lateMinutes,
          markedByUserId: options?.staffUserId,
          isOverride,
          overrideReason: isOverride ? 'Staff override of check-in window' : undefined,
          notes: options?.notes,
        },
        update: {
          status,
          checkInMethod: method,
          checkedInAt: now,
          lateMinutes,
          bookingId: booking.id,
          markedByUserId: options?.staffUserId,
          isOverride,
          overrideReason: isOverride ? 'Staff override of check-in window' : undefined,
          notes: options?.notes,
        },
        include: {
          classSession: {
            include: {
              outlet: { select: { id: true, name: true, code: true } },
              classType: { select: { id: true, name: true, category: true } },
              trainer: { select: { id: true, firstName: true, lastName: true } },
              resource: { select: { id: true, name: true, type: true } },
            },
          },
          memberProfile: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      // Update booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          checkedInAt: now,
          status: 'CHECKED_IN',
        },
      });

      return attendance;
    });

    // 8. Audit Logging
    if (options?.staffUserId) {
      await this.auditService.log({
        userId: options.staffUserId,
        organisationId: session.organisationId,
        outletId: session.outletId,
        action: 'CLASS_CHECK_IN_STAFF',
        resource: 'ATTENDANCE_RECORD',
        resourceId: record.id,
        metadata: {
          classSessionId,
          memberProfileId,
          status,
          lateMinutes,
          method,
          isOverride,
        },
      });
    }

    this.logger.log(
      `[ATTENDANCE] Member ${memberProfileId} checked in to session ${classSessionId} (${status}, late=${lateMinutes}m)`,
    );

    return record;
  }

  /**
   * Checks out an attendee from a class session and computes visit duration.
   */
  async checkOutMember(
    classSessionId: string,
    memberProfileId: string,
    method: string = 'MEMBER_SELF_SERVICE',
    options?: { staffUserId?: string },
  ) {
    const now = new Date();

    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        classSessionId_memberProfileId: {
          classSessionId,
          memberProfileId,
        },
      },
      include: { classSession: true },
    });

    if (!record || !record.checkedInAt) {
      throw new BadRequestException({
        code: 'NOT_CHECKED_IN',
        message: 'Member has not checked in to this class session',
      });
    }

    if (record.checkedOutAt) {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_OUT',
        message: 'Member has already checked out of this session',
      });
    }

    const durationMinutes = Math.max(
      1,
      Math.floor((now.getTime() - record.checkedInAt.getTime()) / 60000),
    );

    // Determine if departed early (> 15 minutes before scheduled end)
    const earlyThreshold = record.classSession
      ? new Date(record.classSession.endsAt.getTime() - 15 * 60 * 1000)
      : now;
    const finalStatus = now < earlyThreshold ? 'LEFT_EARLY' : 'COMPLETED';

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: finalStatus,
        checkedOutAt: now,
        checkOutMethod: method,
        durationMinutes,
      },
      include: {
        classSession: {
          include: {
            outlet: { select: { id: true, name: true } },
            classType: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (record.bookingId) {
      await this.prisma.booking.update({
        where: { id: record.bookingId },
        data: { status: 'COMPLETED' },
      });
    }

    this.logger.log(
      `[ATTENDANCE] Member ${memberProfileId} checked out of session ${classSessionId} (${finalStatus}, duration=${durationMinutes}m)`,
    );

    return updated;
  }

  /**
   * Retrieves member attendance history across past classes.
   */
  async getMemberAttendanceHistory(memberProfileId: string, limit = 50, offset = 0) {
    return this.prisma.attendanceRecord.findMany({
      where: { memberProfileId },
      include: {
        classSession: {
          include: {
            outlet: { select: { id: true, name: true, code: true } },
            classType: { select: { id: true, name: true, category: true } },
            trainer: { select: { id: true, firstName: true, lastName: true } },
            resource: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
