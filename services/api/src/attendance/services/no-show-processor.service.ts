import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

export interface NoShowProcessResult {
  classSessionId: string;
  processedCount: number;
  skippedCount: number;
}

@Injectable()
export class NoShowProcessorService {
  private readonly logger = new Logger(NoShowProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Processes no-shows for a specific class session whose check-in grace period has expired.
   * Idempotent: Can be executed multiple times safely without duplicating or overwriting manual corrections.
   * Invariant: Never marks cancelled bookings, waitlisted bookings, or manually corrected attendance records.
   */
  async processSessionNoShows(
    classSessionId: string,
    gracePeriodMinutes = 15,
  ): Promise<NoShowProcessResult> {
    const now = new Date();

    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
        },
        attendanceRecords: true,
      },
    });

    if (!session) {
      return { classSessionId, processedCount: 0, skippedCount: 0 };
    }

    if (session.status === 'CANCELLED') {
      return { classSessionId, processedCount: 0, skippedCount: 0 };
    }

    // Verify session startsAt + gracePeriod has passed
    const graceExpiry = new Date(session.startsAt.getTime() + gracePeriodMinutes * 60 * 1000);
    if (now < graceExpiry) {
      this.logger.debug(
        `Session ${classSessionId} has not yet passed grace period (${graceExpiry.toISOString()})`,
      );
      return { classSessionId, processedCount: 0, skippedCount: 0 };
    }

    // Build map of existing attendance records for this session
    const attendanceMap = new Map<string, typeof session.attendanceRecords[0]>();
    for (const record of session.attendanceRecords) {
      attendanceMap.set(record.memberProfileId, record);
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const booking of session.bookings) {
      const existingAttendance = attendanceMap.get(booking.memberProfileId);

      // Invariant checks:
      // 1. If member already checked in (CHECKED_IN, LATE, COMPLETED, LEFT_EARLY), skip
      // 2. If member already marked NO_SHOW, skip
      // 3. If attendance was manually created/overridden by staff (isOverride === true), NEVER overwrite
      // 4. If status is EXCUSED, skip
      if (existingAttendance) {
        if (
          existingAttendance.isOverride ||
          ['CHECKED_IN', 'LATE', 'COMPLETED', 'LEFT_EARLY', 'EXCUSED', 'NO_SHOW'].includes(
            existingAttendance.status,
          )
        ) {
          skippedCount++;
          continue;
        }
      }

      // Atomically mark attendance and booking as NO_SHOW
      await this.prisma.$transaction(async (tx) => {
        await tx.attendanceRecord.upsert({
          where: {
            classSessionId_memberProfileId: {
              classSessionId,
              memberProfileId: booking.memberProfileId,
            },
          },
          create: {
            organisationId: session.organisationId,
            outletId: session.outletId,
            classSessionId,
            memberProfileId: booking.memberProfileId,
            bookingId: booking.id,
            status: 'NO_SHOW',
            checkInMethod: 'SYSTEM',
            notes: `Automated no-show processing after ${gracePeriodMinutes}m grace period`,
          },
          update: {
            status: 'NO_SHOW',
            checkInMethod: 'SYSTEM',
            notes: `Automated no-show processing after ${gracePeriodMinutes}m grace period`,
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'NO_SHOW' },
        });
      });

      processedCount++;
    }

    if (processedCount > 0) {
      await this.auditService.log({
        organisationId: session.organisationId,
        outletId: session.outletId,
        action: 'NO_SHOW_BATCH_PROCESSED',
        resource: 'CLASS_SESSION',
        resourceId: classSessionId,
        metadata: {
          classSessionId,
          processedCount,
          skippedCount,
          gracePeriodMinutes,
        },
      });

      this.logger.log(
        `[NO-SHOW] Processed ${processedCount} no-shows for session ${classSessionId} (${skippedCount} skipped)`,
      );
    }

    return { classSessionId, processedCount, skippedCount };
  }

  /**
   * Sweeps across all sessions needing no-show reconciliation.
   */
  async processAllPendingNoShows(
    organisationId?: string,
    gracePeriodMinutes = 15,
  ): Promise<NoShowProcessResult[]> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000); // Last 48 hours

    // Find candidate sessions: started before cutoff, ended recently or in progress, not cancelled
    const sessions = await this.prisma.classSession.findMany({
      where: {
        ...(organisationId ? { organisationId } : {}),
        status: { not: 'CANCELLED' },
        startsAt: {
          gte: windowStart,
          lte: cutoffTime,
        },
        bookings: {
          some: {
            status: 'CONFIRMED',
          },
        },
      },
      select: { id: true },
    });

    const results: NoShowProcessResult[] = [];
    for (const session of sessions) {
      const result = await this.processSessionNoShows(session.id, gracePeriodMinutes);
      if (result.processedCount > 0) {
        results.push(result);
      }
    }

    return results;
  }
}
