import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import {
  RetentionObservedOutcome,
  RecordRetentionOutcomeDto,
  RetentionOutreachDto,
} from '@fitcore/types';
import {
  RETENTION_AGENT_EVENTS,
  RETENTION_AGENT_AUDIT_ACTIONS,
  REENGAGEMENT_WINDOW_DAYS,
} from '../retention-agent.constants';

@Injectable()
export class RetentionOutcomeService {
  private readonly logger = new Logger(RetentionOutcomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Manually records an observed outcome for a retention outreach.
   * Enforces non-causal language ("Member re-engaged following outreach").
   */
  async recordOutcome(
    dto: RecordRetentionOutcomeDto,
    staffUserId: string,
    organisationId: string,
  ) {
    const outreach = await this.prisma.retentionOutreach.findFirst({
      where: { id: dto.outreachId, organisationId },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${dto.outreachId} not found`);
    }

    const updated = await this.prisma.retentionOutreach.update({
      where: { id: outreach.id },
      data: {
        outcome: dto.outcome,
        outcomeReason: dto.outcomeReason || `Observed outcome: ${dto.outcome} following outreach.`,
        outcomeRecordedAt: new Date(),
        status: dto.outcome === 'NO_RESPONSE' ? 'NO_RESPONSE' : 'REENGAGED',
      },
    });

    await this.auditService.log({
      action: RETENTION_AGENT_AUDIT_ACTIONS.OUTCOME_RECORDED,
      resource: 'retention_outreach',
      resourceId: outreach.id,
      userId: staffUserId,
      organisationId,
      metadata: { outcome: dto.outcome },
    });

    return updated;
  }

  /**
   * Automatically scans for post-outreach reengagement activity.
   * Checks for class bookings, attendance, and workout completions within 14 days of outreach delivery.
   */
  async detectReengagement(organisationId: string): Promise<number> {
    const cutoff = new Date(Date.now() - REENGAGEMENT_WINDOW_DAYS * 24 * 3600 * 1000);

    // Find delivered outreaches with no outcome yet
    const pendingOutreaches = await this.prisma.retentionOutreach.findMany({
      where: {
        organisationId,
        status: { in: ['SENT', 'DELIVERED', 'APPROVED', 'PENDING_APPROVAL'] },
        outcome: null,
        createdAt: { gte: cutoff },
      },
      include: {
        memberProfile: true,
      },
    });

    let detectedCount = 0;

    for (const outreach of pendingOutreaches) {
      const sentTime = outreach.sentAt || outreach.createdAt;

      // 1. Check for physical attendance after outreach
      const recentAttendance = await this.prisma.attendanceRecord.findFirst({
        where: {
          memberProfileId: outreach.memberId,
          checkedInAt: { gte: sentTime },
        },
      });

      if (recentAttendance) {
        await this.prisma.retentionOutreach.update({
          where: { id: outreach.id },
          data: {
            outcome: 'CLASS_ATTENDED',
            outcomeReason: 'Member attended gym check-in following outreach delivery.',
            outcomeRecordedAt: new Date(),
            status: 'REENGAGED',
          },
        });
        detectedCount++;
        continue;
      }

      // 2. Check for completed workout after outreach
      const recentWorkout = await this.prisma.workout.findFirst({
        where: {
          memberProfileId: outreach.memberId,
          updatedAt: { gte: sentTime },
          status: 'COMPLETED',
        },
      });

      if (recentWorkout) {
        await this.prisma.retentionOutreach.update({
          where: { id: outreach.id },
          data: {
            outcome: 'WORKOUT_COMPLETED',
            outcomeReason: 'Member completed workout session following outreach delivery.',
            outcomeRecordedAt: new Date(),
            status: 'REENGAGED',
          },
        });
        detectedCount++;
        continue;
      }

      // 3. Check for class booking after outreach
      const recentBooking = await this.prisma.booking.findFirst({
        where: {
          memberProfileId: outreach.memberId,
          createdAt: { gte: sentTime },
          status: { in: ['CONFIRMED', 'ATTENDED'] },
        },
      });

      if (recentBooking) {
        await this.prisma.retentionOutreach.update({
          where: { id: outreach.id },
          data: {
            outcome: 'BOOKING_CREATED',
            outcomeReason: 'Member created class booking following outreach delivery.',
            outcomeRecordedAt: new Date(),
            status: 'REENGAGED',
          },
        });
        detectedCount++;
        continue;
      }

      // 4. Mark NO_RESPONSE if 14 days have passed
      if (Date.now() - sentTime.getTime() > REENGAGEMENT_WINDOW_DAYS * 24 * 3600 * 1000) {
        await this.prisma.retentionOutreach.update({
          where: { id: outreach.id },
          data: {
            outcome: 'NO_RESPONSE',
            outcomeReason: 'No activity detected within the 14-day post-outreach evaluation window.',
            outcomeRecordedAt: new Date(),
            status: 'NO_RESPONSE',
          },
        });
      }
    }

    return detectedCount;
  }
}
