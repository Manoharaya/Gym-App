import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RecordWalkInDto } from '../dto/record-walk-in.dto';

@Injectable()
export class WalkInService {
  private readonly logger = new Logger(WalkInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registers walk-in attendance for a member without prior booking reservation.
   * Enforces transactional capacity control and preserves bookingId = null.
   */
  async recordWalkIn(
    organisationId: string,
    outletId: string,
    classSessionId: string,
    dto: RecordWalkInDto,
    staffUserId: string,
  ) {
    const now = new Date();

    // 1. Fetch Session
    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId, outletId },
      include: { outlet: true, classType: true },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Class session not found in this outlet',
      });
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'SESSION_CANCELLED',
        message: 'Cannot admit walk-in to a cancelled class session',
      });
    }

    // 2. Fetch and Validate Member
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberProfileId, organisationId },
      include: {
        user: true,
        memberships: {
          where: { status: 'ACTIVE' },
          include: { membershipPlan: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member profile not found in this organisation',
      });
    }

    // 3. Verify Active Membership
    const hasActiveMembership = member.memberships.some(
      (m) =>
        m.status === 'ACTIVE' &&
        (!m.endDate || m.endDate >= now) &&
        m.startDate <= now,
    );

    if (!hasActiveMembership && !dto.allowCapacityOverride) {
      throw new BadRequestException({
        code: 'MEMBERSHIP_INACTIVE',
        message: 'Member does not have an active membership. Staff override required.',
      });
    }

    // 4. Check for duplicate existing attendance
    const existingAttendance = await this.prisma.attendanceRecord.findUnique({
      where: {
        classSessionId_memberProfileId: {
          classSessionId,
          memberProfileId: dto.memberProfileId,
        },
      },
    });

    if (
      existingAttendance &&
      ['CHECKED_IN', 'LATE', 'COMPLETED'].includes(existingAttendance.status)
    ) {
      throw new ConflictException({
        code: 'ALREADY_ATTENDING',
        message: 'Member is already checked in or recorded as an attendee for this session',
      });
    }

    // 5. Transactional Capacity Verification & Record Creation
    const record = await this.prisma.$transaction(async (tx) => {
      // Pessimistic lock on ClassSession row
      await tx.$queryRaw`
        SELECT "id" FROM "class_sessions"
        WHERE "id" = ${classSessionId}
        FOR UPDATE
      `;

      // Count active confirmed bookings
      const confirmedBookingsCount = await tx.booking.count({
        where: {
          classSessionId,
          status: 'CONFIRMED',
        },
      });

      // Count active walk-ins (bookingId is null and not cancelled)
      const walkInsCount = await tx.attendanceRecord.count({
        where: {
          classSessionId,
          bookingId: null,
          status: { in: ['CHECKED_IN', 'LATE', 'COMPLETED', 'WALK_IN'] },
        },
      });

      const totalOccupied = confirmedBookingsCount + walkInsCount;

      if (totalOccupied >= session.capacity && !dto.allowCapacityOverride) {
        throw new ConflictException({
          code: 'SESSION_CAPACITY_EXCEEDED',
          message: `Class capacity (${session.capacity}) is full (${confirmedBookingsCount} booked, ${walkInsCount} walk-in). Staff override required.`,
        });
      }

      const isOverride = Boolean(dto.allowCapacityOverride && totalOccupied >= session.capacity);
      if (isOverride && !dto.overrideReason) {
        throw new BadRequestException({
          code: 'OVERRIDE_REASON_REQUIRED',
          message: 'An explicit override reason is mandatory when exceeding class capacity',
        });
      }

      // Calculate lateness
      let status = 'CHECKED_IN';
      let lateMinutes = 0;
      if (now > session.startsAt) {
        status = 'LATE';
        lateMinutes = Math.floor((now.getTime() - session.startsAt.getTime()) / 60000);
      }

      return tx.attendanceRecord.upsert({
        where: {
          classSessionId_memberProfileId: {
            classSessionId,
            memberProfileId: dto.memberProfileId,
          },
        },
        create: {
          organisationId,
          outletId,
          classSessionId,
          memberProfileId: dto.memberProfileId,
          bookingId: null, // Strictly null for genuine walk-in attendance
          status,
          checkInMethod: 'STAFF',
          checkedInAt: now,
          lateMinutes,
          markedByUserId: staffUserId,
          isOverride,
          overrideReason: dto.overrideReason,
          notes: dto.notes,
        },
        update: {
          status,
          checkInMethod: 'STAFF',
          checkedInAt: now,
          lateMinutes,
          markedByUserId: staffUserId,
          isOverride,
          overrideReason: dto.overrideReason,
          notes: dto.notes,
        },
        include: {
          classSession: {
            include: {
              outlet: { select: { id: true, name: true, code: true } },
              classType: { select: { id: true, name: true, category: true } },
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
    });

    // 6. Audit Trail
    await this.auditService.log({
      userId: staffUserId,
      organisationId,
      outletId,
      action: 'CLASS_WALK_IN_RECORDED',
      resource: 'ATTENDANCE_RECORD',
      resourceId: record.id,
      metadata: {
        classSessionId,
        memberProfileId: dto.memberProfileId,
        isOverride: record.isOverride,
        overrideReason: dto.overrideReason,
      },
    });

    this.logger.log(
      `[ATTENDANCE] Walk-in recorded for member ${dto.memberProfileId} in session ${classSessionId} by staff ${staffUserId}`,
    );

    return record;
  }
}
