import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CorrectAttendanceDto } from '../dto/correct-attendance.dto';

@Injectable()
export class RosterService {
  private readonly logger = new Logger(RosterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a comprehensive operational roster for a scheduled class session.
   * Unifies confirmed reservations, waitlist positions, walk-in attendees, and live occupancy KPIs.
   */
  async getSessionRoster(
    classSessionId: string,
    organisationId: string,
    outletId?: string,
  ) {
    const session = await this.prisma.classSession.findFirst({
      where: {
        id: classSessionId,
        organisationId,
        ...(outletId ? { outletId } : {}),
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        classType: { select: { id: true, name: true, category: true } },
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        substituteTrainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: { select: { id: true, name: true, type: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found in this organisation',
      });
    }

    // 1. Fetch all bookings for session
    const bookings = await this.prisma.booking.findMany({
      where: { classSessionId },
      include: {
        memberProfile: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    });

    // 2. Fetch all attendance records for session
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { classSessionId },
      include: {
        memberProfile: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map attendance records by memberProfileId
    const attendanceByMember = new Map<string, typeof attendanceRecords[0]>();
    for (const record of attendanceRecords) {
      attendanceByMember.set(record.memberProfileId, record);
    }

    // 3. Partition and assemble roster items
    const roster: any[] = [];
    const waitlist: any[] = [];
    const walkIns: any[] = [];

    // Process confirmed bookings
    for (const booking of bookings) {
      const attendance = attendanceByMember.get(booking.memberProfileId);
      const memberUser = booking.memberProfile.user;

      if (booking.status === 'WAITLISTED') {
        waitlist.push({
          bookingId: booking.id,
          memberProfileId: booking.memberProfileId,
          memberName: `${memberUser.firstName} ${memberUser.lastName}`,
          email: memberUser.email,
          phone: memberUser.phone,
          waitlistPosition: booking.waitlistPosition,
          status: 'WAITLISTED',
          createdAt: booking.createdAt,
        });
        continue;
      }

      if (booking.status === 'CANCELLED') {
        continue;
      }

      const rosterStatus = attendance
        ? attendance.status
        : booking.status === 'NO_SHOW'
          ? 'NO_SHOW'
          : 'RESERVED';

      roster.push({
        memberProfileId: booking.memberProfileId,
        bookingId: booking.id,
        attendanceId: attendance?.id || null,
        memberName: `${memberUser.firstName} ${memberUser.lastName}`,
        email: memberUser.email,
        phone: memberUser.phone,
        status: rosterStatus,
        isWalkIn: false,
        checkedInAt: attendance?.checkedInAt || booking.checkedInAt || null,
        checkedOutAt: attendance?.checkedOutAt || null,
        lateMinutes: attendance?.lateMinutes || 0,
        durationMinutes: attendance?.durationMinutes || null,
        checkInMethod: attendance?.checkInMethod || null,
        isOverride: attendance?.isOverride || false,
        overrideReason: attendance?.overrideReason || null,
        notes: attendance?.notes || (booking.metadata as any)?.notes || null,
      });
    }

    // Process walk-ins (bookingId is null)
    for (const attendance of attendanceRecords) {
      if (attendance.bookingId === null) {
        const memberUser = attendance.memberProfile.user;
        const walkInItem = {
          memberProfileId: attendance.memberProfileId,
          bookingId: null,
          attendanceId: attendance.id,
          memberName: `${memberUser.firstName} ${memberUser.lastName}`,
          email: memberUser.email,
          phone: memberUser.phone,
          status: attendance.status,
          isWalkIn: true,
          checkedInAt: attendance.checkedInAt,
          checkedOutAt: attendance.checkedOutAt,
          lateMinutes: attendance.lateMinutes || 0,
          durationMinutes: attendance.durationMinutes || null,
          checkInMethod: attendance.checkInMethod,
          isOverride: attendance.isOverride,
          overrideReason: attendance.overrideReason,
          notes: attendance.notes,
        };
        walkIns.push(walkInItem);
        roster.push(walkInItem);
      }
    }

    // 4. Compute KPIs
    const confirmedBookingsCount = bookings.filter((b) =>
      ['CONFIRMED', 'CHECKED_IN'].includes(b.status),
    ).length;
    const waitlistCount = waitlist.length;
    const walkInsCount = walkIns.length;
    const totalOccupied = confirmedBookingsCount + walkInsCount;
    const spotsRemaining = Math.max(0, session.capacity - totalOccupied);
    const bookedUtilisation =
      session.capacity > 0
        ? Math.round((confirmedBookingsCount / session.capacity) * 100)
        : 0;
    const checkedInCount = attendanceRecords.filter((a) =>
      ['CHECKED_IN', 'LATE', 'COMPLETED'].includes(a.status),
    ).length;
    const actualUtilisation =
      session.capacity > 0
        ? Math.round((checkedInCount / session.capacity) * 100)
        : 0;
    const noShowCount =
      attendanceRecords.filter((a) => a.status === 'NO_SHOW').length +
      bookings.filter(
        (b) =>
          b.status === 'NO_SHOW' &&
          !attendanceRecords.some((a) => a.bookingId === b.id),
      ).length;

    return {
      session,
      summary: {
        capacity: session.capacity,
        confirmedBookingsCount,
        waitlistCount,
        walkInsCount,
        totalOccupied,
        spotsRemaining,
        bookedUtilisation,
        actualUtilisation,
        checkedInCount,
        noShowCount,
      },
      roster,
      waitlist,
      walkIns,
    };
  }

  /**
   * Corrects an existing attendance record with explicit justification and audit logging.
   */
  async correctAttendance(
    attendanceId: string,
    organisationId: string,
    dto: CorrectAttendanceDto,
    staffUserId: string,
  ) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id: attendanceId, organisationId },
      include: { classSession: true },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'ATTENDANCE_RECORD_NOT_FOUND',
        message: 'Attendance record not found in this organisation',
      });
    }

    const previousStatus = record.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendanceRecord.update({
        where: { id: attendanceId },
        data: {
          status: dto.status,
          isOverride: true,
          overrideReason: dto.reason,
          notes: dto.notes ?? record.notes,
          ...(dto.checkedInAt ? { checkedInAt: new Date(dto.checkedInAt) } : {}),
          ...(dto.checkedOutAt ? { checkedOutAt: new Date(dto.checkedOutAt) } : {}),
        },
        include: {
          classSession: {
            include: {
              outlet: { select: { id: true, name: true } },
              classType: { select: { id: true, name: true } },
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

      // Synchronize booking status if linked
      if (record.bookingId) {
        let bookingStatus: string | undefined;
        if (dto.status === 'NO_SHOW') {
          bookingStatus = 'NO_SHOW';
        } else if (['CHECKED_IN', 'LATE'].includes(dto.status)) {
          bookingStatus = 'CHECKED_IN';
        } else if (dto.status === 'COMPLETED') {
          bookingStatus = 'COMPLETED';
        } else if (dto.status === 'CANCELLED') {
          bookingStatus = 'CANCELLED';
        }

        if (bookingStatus) {
          await tx.booking.update({
            where: { id: record.bookingId },
            data: { status: bookingStatus as any },
          });
        }
      }

      return attendance;
    });

    // Audit Logging
    await this.auditService.log({
      userId: staffUserId,
      organisationId,
      outletId: record.outletId,
      action: 'ATTENDANCE_CORRECTED',
      resource: 'ATTENDANCE_RECORD',
      resourceId: attendanceId,
      metadata: {
        classSessionId: record.classSessionId,
        memberProfileId: record.memberProfileId,
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `[ATTENDANCE] Record ${attendanceId} corrected: ${previousStatus} -> ${dto.status} by staff ${staffUserId} (Reason: ${dto.reason})`,
    );

    return updated;
  }
}
