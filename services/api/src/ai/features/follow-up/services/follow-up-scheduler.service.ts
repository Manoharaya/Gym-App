/**
 * Day 39 — Follow-Up Scheduler Service
 * Coordinates enrollment lifecycle, scans due sequence steps, schedules next steps,
 * handles concurrency claims, and terminates completed sequences.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { FollowUpEligibilityService } from './follow-up-eligibility.service';
import { FollowUpExecutionService } from './follow-up-execution.service';
import { FollowUpSequenceService } from './follow-up-sequence.service';
import { EnrollLeadDto } from '../dto/follow-up.dto';
import { FOLLOW_UP_AUDIT_ACTIONS } from '../domain/follow-up.constants';
import { FollowUpStopReason } from '@fitcore/types';

@Injectable()
export class FollowUpSchedulerService {
  private readonly logger = new Logger(FollowUpSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eligibilityService: FollowUpEligibilityService,
    private readonly executionService: FollowUpExecutionService,
    private readonly sequenceService: FollowUpSequenceService,
  ) {}

  /**
   * Enrolls a prospect into a sequence with eligibility checks and initial step scheduling.
   */
  async enroll(organisationId: string, dto: EnrollLeadDto, creatorId?: string) {
    // 1. Eligibility Evaluation (Section 11)
    const eligibility = await this.eligibilityService.evaluateEnrollmentEligibility(organisationId, {
      leadId: dto.leadId,
      opportunityId: dto.opportunityId,
      memberId: dto.memberId,
      sequenceId: dto.sequenceId,
    });

    if (!eligibility.eligible) {
      this.logger.warn(`Enrollment rejected: ${eligibility.reason} (${eligibility.status})`);
      throw new BadRequestException({
        code: eligibility.status,
        message: eligibility.reason,
      });
    }

    // 2. Resolve Sequence & Active Version
    const sequence = await this.sequenceService.getSequence(organisationId, dto.sequenceId);
    const version = sequence.activeVersion;
    if (!version || version.steps.length === 0) {
      throw new BadRequestException('Cannot enroll in a sequence with no active steps');
    }

    const firstStep = version.steps[0];
    const enrolledAt = new Date();
    const nextExecutionAt = new Date(enrolledAt.getTime() + firstStep.delayMinutes * 60 * 1000);

    // 3. Create Enrollment
    const enrollment = await this.prisma.followUpEnrollment.create({
      data: {
        organisationId,
        outletId: dto.outletId || sequence.outletId || null,
        leadId: dto.leadId || null,
        opportunityId: dto.opportunityId || null,
        memberId: dto.memberId || null,
        sequenceId: sequence.id,
        sequenceVersionId: version.id,
        status: 'ACTIVE',
        currentStep: firstStep.stepOrder,
        enrolledAt,
        startedAt: enrolledAt,
        nextExecutionAt,
        createdBy: creatorId || 'SYSTEM',
        metadata: { customVariables: dto.customVariables || {} },
      },
    });

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.ENROLLMENT_CREATED,
      resource: 'FollowUpEnrollment',
      resourceId: enrollment.id,
      metadata: { sequenceId: sequence.id, firstStepOrder: firstStep.stepOrder, nextExecutionAt, creatorId, actorType: 'STAFF' },
    });

    // 4. If Step 1 delay is 0 (Day 0 / Immediate), execute now
    if (firstStep.delayMinutes === 0) {
      await this.executionService.executeStep(organisationId, enrollment.id, firstStep.id);
    }

    return enrollment;
  }

  /**
   * Scans and processes all enrollments due for their next step execution.
   * Uses atomic status claiming to prevent concurrent workers from racing on the same enrollment.
   */
  async processDueEnrollments(batchSize: number = 20): Promise<{ processed: number; succeeded: number }> {
    const now = new Date();

    // Find due enrollments
    const dueEnrollments = await this.prisma.followUpEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextExecutionAt: { lte: now },
      },
      take: batchSize,
      include: {
        sequenceVersion: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    let succeeded = 0;

    for (const enrollment of dueEnrollments) {
      try {
        // Concurrency Guard: Atomic lease update
        const claimed = await this.prisma.followUpEnrollment.updateMany({
          where: {
            id: enrollment.id,
            status: 'ACTIVE',
            nextExecutionAt: { lte: now },
          },
          data: {
            nextExecutionAt: new Date(now.getTime() + 10 * 60 * 1000), // 10-minute lease
          },
        });

        if (claimed.count === 0) {
          // Claimed by another worker in parallel
          continue;
        }

        const steps = enrollment.sequenceVersion.steps;
        const currentStep = steps.find((s) => s.stepOrder === enrollment.currentStep);

        if (!currentStep) {
          // No current step: mark completed
          await this.completeEnrollment(enrollment.organisationId, enrollment.id);
          continue;
        }

        // Execute current step
        const result = await this.executionService.executeStep(
          enrollment.organisationId,
          enrollment.id,
          currentStep.id,
        );

        if (result.status === 'SUCCESS' || result.status === 'SUPPRESSED') {
          succeeded++;
          // Find next step
          const nextStep = steps.find((s) => s.stepOrder > enrollment.currentStep);
          if (nextStep) {
            const nextScheduledAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
            await this.prisma.followUpEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStep: nextStep.stepOrder,
                nextExecutionAt: nextScheduledAt,
              },
            });
          } else {
            // Sequence completed
            await this.completeEnrollment(enrollment.organisationId, enrollment.id);
          }
        }
      } catch (err: any) {
        this.logger.error(`Error processing enrollment ${enrollment.id}: ${err.message}`);
      }
    }

    return { processed: dueEnrollments.length, succeeded };
  }

  /**
   * Completes an enrollment when all steps have been executed.
   */
  async completeEnrollment(organisationId: string, enrollmentId: string) {
    const completedAt = new Date();
    await this.prisma.followUpEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt,
        nextExecutionAt: null,
      },
    });

    await this.prisma.followUpOutcome.create({
      data: {
        organisationId,
        enrollmentId,
        outcomeType: 'SEQUENCE_COMPLETED',
        attribution: 'sequence_completed_all_steps',
        recordedAt: completedAt,
      },
    });

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.SEQUENCE_COMPLETED,
      resource: 'FollowUpEnrollment',
      resourceId: enrollmentId,
      metadata: { actorType: 'SYSTEM', actorId: 'FOLLOW_UP_ENGINE' },
    });
  }

  /**
   * Pauses an active enrollment.
   */
  async pauseEnrollment(organisationId: string, enrollmentId: string, staffId?: string) {
    const enrollment = await this.prisma.followUpEnrollment.findFirst({
      where: { id: enrollmentId, organisationId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found in this organisation`);
    }

    return this.prisma.followUpEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });
  }

  /**
   * Resumes a paused enrollment.
   */
  async resumeEnrollment(organisationId: string, enrollmentId: string, staffId?: string) {
    const enrollment = await this.prisma.followUpEnrollment.findFirst({
      where: { id: enrollmentId, organisationId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found in this organisation`);
    }

    return this.prisma.followUpEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'ACTIVE',
        nextExecutionAt: new Date(), // due now
      },
    });
  }

  /**
   * Stops an enrollment immediately on trigger condition (customer reply, booking, conversion, etc.).
   */
  async stopEnrollment(
    organisationId: string,
    enrollmentId: string,
    stopReason: FollowUpStopReason,
    actorType: string = 'SYSTEM',
    actorId?: string,
  ) {
    const enrollment = await this.prisma.followUpEnrollment.findFirst({
      where: { id: enrollmentId, organisationId },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return null;
    }

    const stoppedAt = new Date();
    const updated = await this.prisma.followUpEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'STOPPED',
        stopReason,
        completedAt: stoppedAt,
        nextExecutionAt: null,
      },
    });

    // Record outcome
    await this.prisma.followUpOutcome.create({
      data: {
        organisationId,
        enrollmentId,
        outcomeType: 'STOPPED',
        attribution: `stopped_due_to_${stopReason.toLowerCase()}`,
        recordedAt: stoppedAt,
      },
    });

    await this.auditService.log({
      userId: actorType === 'STAFF' && actorId && actorId !== 'STAFF' ? actorId : undefined,
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.SEQUENCE_STOPPED,
      resource: 'FollowUpEnrollment',
      resourceId: enrollmentId,
      metadata: { stopReason, actorType, actorId },
    });

    return updated;
  }
}
