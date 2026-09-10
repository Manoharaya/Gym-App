/**
 * Day 39 — Follow-Up Response Detection Service
 * Detects inbound prospect responses, executes automatic stop conditions,
 * records observational attribution outcomes, and aligns with Day 37 Sales Pipeline.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { FollowUpSuppressionService } from './follow-up-suppression.service';
import { RecordResponseDto } from '../dto/follow-up.dto';
import { FOLLOW_UP_AUDIT_ACTIONS } from '../domain/follow-up.constants';
import { FollowUpResponseType } from '@fitcore/types';

@Injectable()
export class FollowUpResponseService {
  private readonly logger = new Logger(FollowUpResponseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly schedulerService: FollowUpSchedulerService,
    private readonly suppressionService: FollowUpSuppressionService,
  ) {}

  /**
   * Records an inbound customer response or interaction event, evaluates stop conditions,
   * and synchronizes with Day 37 Sales Pipeline.
   */
  async recordResponse(
    organisationId: string,
    dto: RecordResponseDto,
    actorType: string = 'CUSTOMER',
  ) {
    const enrollment = await this.prisma.followUpEnrollment.findFirst({
      where: { id: dto.enrollmentId, organisationId },
      include: {
        sequenceVersion: {
          include: { steps: true },
        },
        lead: true,
        opportunity: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${dto.enrollmentId} not found in this organisation`);
    }

    const receivedAt = new Date();

    // 1. Create FollowUpResponse record
    const response = await this.prisma.followUpResponse.create({
      data: {
        organisationId,
        enrollmentId: enrollment.id,
        leadId: enrollment.leadId || null,
        responseType: dto.responseType,
        channel: dto.channel,
        rawContent: dto.rawContent || null,
        referenceId: dto.referenceId || null,
        source: dto.source || 'INBOUND_COMMUNICATION',
        classification: dto.responseType,
        receivedAt,
      },
    });

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.RESPONSE_RECEIVED,
      resource: 'FollowUpResponse',
      resourceId: response.id,
      metadata: { responseType: dto.responseType, channel: dto.channel, actorType, actorId: enrollment.leadId || 'CUSTOMER' },
    });

    // 2. Evaluate Sequence Stop Conditions (Section 23 & 24)
    const currentStep = enrollment.sequenceVersion.steps.find(
      (s) => s.stepOrder === enrollment.currentStep,
    );

    let stopped = false;

    if (dto.responseType === 'REPLIED') {
      // If customer replies and step says stopOnReply -> stop sequence
      if (currentStep?.stopOnReply ?? true) {
        await this.schedulerService.stopEnrollment(
          organisationId,
          enrollment.id,
          'CUSTOMER_REPLIED',
          actorType,
        );
        stopped = true;

        await this.prisma.followUpOutcome.create({
          data: {
            organisationId,
            enrollmentId: enrollment.id,
            outcomeType: 'ENGAGED',
            attribution: 'engaged_following_follow_up',
            recordedAt: receivedAt,
          },
        });
      }
    } else if (
      dto.responseType === 'BOOKED' ||
      dto.responseType === 'TOUR_BOOKED' ||
      dto.responseType === 'TRIAL_BOOKED'
    ) {
      if (currentStep?.stopOnBooking ?? true) {
        await this.schedulerService.stopEnrollment(
          organisationId,
          enrollment.id,
          'CUSTOMER_BOOKED',
          actorType,
        );
        stopped = true;

        const outcomeType =
          dto.responseType === 'TOUR_BOOKED'
            ? 'TOUR_BOOKED'
            : dto.responseType === 'TRIAL_BOOKED'
            ? 'TRIAL_BOOKED'
            : 'BOOKING_CREATED';

        await this.prisma.followUpOutcome.create({
          data: {
            organisationId,
            enrollmentId: enrollment.id,
            outcomeType,
            attribution: 'booking_following_follow_up',
            recordedAt: receivedAt,
          },
        });
      }
    } else if (dto.responseType === 'CONVERTED') {
      if (currentStep?.stopOnConversion ?? true) {
        await this.schedulerService.stopEnrollment(
          organisationId,
          enrollment.id,
          'CUSTOMER_CONVERTED',
          actorType,
        );
        stopped = true;

        await this.prisma.followUpOutcome.create({
          data: {
            organisationId,
            enrollmentId: enrollment.id,
            outcomeType: 'CONVERTED',
            attribution: 'conversion_following_follow_up',
            recordedAt: receivedAt,
          },
        });
      }
    } else if (dto.responseType === 'OPTED_OUT') {
      await this.schedulerService.stopEnrollment(
        organisationId,
        enrollment.id,
        'OPTED_OUT',
        actorType,
      );
      stopped = true;

      if (enrollment.leadId) {
        await this.suppressionService.recordSuppression(
          organisationId,
          enrollment.leadId,
          'OPTOUT',
          dto.channel,
        );
      }

      await this.prisma.followUpOutcome.create({
        data: {
          organisationId,
          enrollmentId: enrollment.id,
          outcomeType: 'OPTED_OUT',
          attribution: 'opted_out_following_follow_up',
          recordedAt: receivedAt,
        },
      });
    } else if (dto.responseType === 'REQUESTED_HUMAN') {
      if (currentStep?.stopOnStaffHandoff ?? true) {
        await this.schedulerService.stopEnrollment(
          organisationId,
          enrollment.id,
          'STAFF_HANDOFF',
          actorType,
        );
        stopped = true;

        await this.prisma.followUpOutcome.create({
          data: {
            organisationId,
            enrollmentId: enrollment.id,
            outcomeType: 'HUMAN_HANDOFF',
            attribution: 'human_handoff_requested',
            recordedAt: receivedAt,
          },
        });
      }
    }

    // 3. Synchronize with Day 37 Sales Pipeline Activities
    if (enrollment.opportunityId && enrollment.leadId) {
      await this.prisma.salesActivity.create({
        data: {
          organisationId,
          outletId: enrollment.outletId,
          opportunityId: enrollment.opportunityId,
          leadId: enrollment.leadId,
          type: 'FOLLOW_UP',
          actorType: 'CUSTOMER',
          channel: dto.channel,
          title: `Prospect Responded: ${dto.responseType}`,
          summary: dto.rawContent || `Customer response received on channel ${dto.channel}`,
          sourceReferenceId: response.id,
          metadata: { responseType: dto.responseType, sequenceStopped: stopped },
        },
      });
    }

    return {
      response,
      sequenceStopped: stopped,
    };
  }

  /**
   * Explicitly record an observational follow-up outcome with conservative attribution.
   */
  async recordOutcome(
    organisationId: string,
    dto: {
      enrollmentId: string;
      outcomeType: any;
      revenueAmount?: number;
      currency?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const enrollment = await this.prisma.followUpEnrollment.findUnique({
      where: { id: dto.enrollmentId },
    });

    if (!enrollment || enrollment.organisationId !== organisationId) {
      throw new NotFoundException('Enrollment not found in organisation');
    }

    const attribution =
      dto.outcomeType === 'CONVERTED'
        ? 'conversion_following_follow_up'
        : `${dto.outcomeType.toLowerCase()}_following_follow_up`;

    const metadata = {
      ...(dto.metadata || {}),
      ...(dto.revenueAmount !== undefined ? { revenueAmount: dto.revenueAmount } : {}),
      currency: dto.currency || 'USD',
    };

    return this.prisma.followUpOutcome.create({
      data: {
        organisationId,
        enrollmentId: dto.enrollmentId,
        outcomeType: dto.outcomeType,
        attribution,
        metadata: JSON.parse(JSON.stringify(metadata)),
        recordedAt: new Date(),
      },
    });
  }
}
