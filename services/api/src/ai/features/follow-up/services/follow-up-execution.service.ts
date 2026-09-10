/**
 * Day 39 — Follow-Up Step Execution Service
 * Manages atomic execution of a sequence step, idempotency enforcement, channel fallback,
 * human approval gates, and routing exclusively through Day 28 CommunicationOrchestratorService.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { CommunicationOrchestratorService } from '../../../../communications/orchestrator/communication-orchestrator.service';
import { FollowUpContextService } from './follow-up-context.service';
import { FollowUpSuppressionService } from './follow-up-suppression.service';
import { FollowUpAiService } from './follow-up-ai.service';
import {
  CHANNEL_FALLBACK_MAP,
  FOLLOW_UP_AUDIT_ACTIONS,
} from '../domain/follow-up.constants';
import { FollowUpStepChannel, FollowUpExecutionStatus } from '@fitcore/types';

@Injectable()
export class FollowUpExecutionService {
  private readonly logger = new Logger(FollowUpExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly communicationOrchestrator: CommunicationOrchestratorService,
    private readonly contextService: FollowUpContextService,
    private readonly suppressionService: FollowUpSuppressionService,
    private readonly aiService: FollowUpAiService,
  ) {}

  /**
   * Executes a specific step for an enrollment with complete idempotency and suppression checks.
   */
  async executeStep(
    organisationId: string,
    enrollmentId: string,
    stepId: string,
    options?: { dryRun?: boolean; forceApprovalBypass?: boolean; staffId?: string },
  ) {
    // 1. Fetch Enrollment & Step details
    const enrollment = await this.prisma.followUpEnrollment.findFirst({
      where: { id: enrollmentId, organisationId },
      include: {
        sequence: true,
        sequenceVersion: true,
        lead: true,
        opportunity: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found in this organisation`);
    }

    if (enrollment.status !== 'ACTIVE') {
      this.logger.log(`Enrollment ${enrollmentId} is not active (${enrollment.status}). Skipping execution.`);
      return { status: 'SKIPPED', reason: `Enrollment status: ${enrollment.status}` };
    }

    const step = await this.prisma.followUpStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found`);
    }

    // 2. Deterministic Idempotency Key (Section 16)
    const executionKey = `${organisationId}_${enrollmentId}_${stepId}`;

    // Check existing execution
    let execution = await this.prisma.followUpStepExecution.findUnique({
      where: { executionKey },
    });

    if (execution && execution.status === 'SUCCESS') {
      this.logger.log(`Step ${stepId} already executed successfully for enrollment ${enrollmentId}. Idempotent return.`);
      return execution;
    }

    if (!execution) {
      execution = await this.prisma.followUpStepExecution.create({
        data: {
          organisationId,
          enrollmentId,
          stepId,
          executionKey,
          channel: step.channel,
          status: 'PENDING',
          scheduledAt: new Date(),
        },
      });
    }

    // 3. Channel Resolution & Consented Fallback (Section 37)
    let selectedChannel = step.channel as FollowUpStepChannel;
    const hasPhone = Boolean(enrollment.lead?.phone);
    const hasEmail = Boolean(enrollment.lead?.email);

    if ((selectedChannel === 'WHATSAPP' || selectedChannel === 'SMS') && !hasPhone) {
      if (hasEmail) {
        selectedChannel = 'EMAIL';
        this.logger.log(`Falling back to EMAIL for enrollment ${enrollmentId} as phone is missing.`);
      }
    } else if (selectedChannel === 'EMAIL' && !hasEmail) {
      if (hasPhone) {
        selectedChannel = (step.configuration as any)?.fallbackChannel || 'SMS';
        this.logger.log(`Falling back to ${selectedChannel} for enrollment ${enrollmentId} as email is missing.`);
      }
    }

    // 4. Suppression & Frequency Evaluation (Section 12, 13, 14)
    const versionConfig = (enrollment.sequenceVersion?.configuration as any) || {};
    const suppressionCheck = await this.suppressionService.evaluateSuppression(organisationId, {
      leadId: enrollment.leadId || undefined,
      memberId: enrollment.memberId || undefined,
      channel: selectedChannel,
      cooldownHours: versionConfig.cooldownHours,
      maxPerWeek: versionConfig.maxFollowUpsPerWeek,
      quietHoursStart: versionConfig.quietHoursStart,
      quietHoursEnd: versionConfig.quietHoursEnd,
    });

    if (suppressionCheck.suppressed) {
      this.logger.log(`Execution ${execution.id} suppressed: ${suppressionCheck.message}`);
      await this.prisma.followUpStepExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUPPRESSED',
          errorDetails: suppressionCheck.message,
          metadata: { suppressionReason: suppressionCheck.reason },
        },
      });
      return { status: 'SUPPRESSED', reason: suppressionCheck.reason };
    }

    // 5. Assemble Personalization Context
    const context = await this.contextService.assembleContext(
      organisationId,
      enrollment.leadId || undefined,
      enrollment.opportunityId || undefined,
      (enrollment.metadata as any)?.customVariables || {},
    );

    // 6. Render Message Content
    let renderedSubject: string | undefined = undefined;
    let renderedBody = '';
    let requiresApproval = step.requiresApproval || versionConfig.approvalPolicy === 'APPROVAL_REQUIRED';

    const stepConfig = (step.configuration as any) || {};

    if (step.messageMode === 'STATIC_TEMPLATE') {
      renderedBody = stepConfig.templateBody || 'Hello from FitCore!';
      renderedSubject = stepConfig.templateSubject || 'FitCore Follow-Up';
    } else if (step.messageMode === 'AI_ASSISTED') {
      const aiDraft = await this.aiService.generateFollowUpDraft(organisationId, {
        channel: selectedChannel,
        stepName: step.name,
        context,
        leadId: enrollment.leadId || undefined,
        sequenceId: enrollment.sequenceId,
        stepId: step.id,
      });
      renderedBody = aiDraft.message;
      if (aiDraft.requiresApproval) {
        requiresApproval = true;
      }
    } else {
      // PERSONALIZED_TEMPLATE
      const rawBody = stepConfig.templateBody || 'Hi {{firstName}}, checking in from {{outletName}}!';
      const rawSubject = stepConfig.templateSubject || 'Hello from {{outletName}}';
      renderedBody = this.contextService.renderTemplate(rawBody, context);
      renderedSubject = this.contextService.renderTemplate(rawSubject, context);
    }

    // 7. Human Approval Gate (Section 22)
    if (requiresApproval && !options?.forceApprovalBypass) {
      this.logger.log(`Execution ${execution.id} requires human approval before sending.`);
      await this.prisma.followUpStepExecution.update({
        where: { id: execution.id },
        data: {
          status: 'PENDING_APPROVAL',
          metadata: { renderedBody, renderedSubject, selectedChannel },
        },
      });

      await this.auditService.log({
        organisationId,
        action: FOLLOW_UP_AUDIT_ACTIONS.APPROVAL_REQUESTED,
        resource: 'FollowUpStepExecution',
        resourceId: execution.id,
        metadata: { enrollmentId, stepId, actorType: 'SYSTEM', actorId: 'FOLLOW_UP_ENGINE' },
      });

      return {
        status: 'PENDING_APPROVAL',
        executionId: execution.id,
        previewBody: renderedBody,
      };
    }

    // 8. Dry-Run Mode (Section 49)
    if (options?.dryRun) {
      this.logger.log(`[DRY-RUN] Execution ${execution.id} validated successfully. No message sent.`);
      return {
        status: 'SUCCESS',
        dryRun: true,
        renderedBody,
        renderedSubject,
        selectedChannel,
      };
    }

    // 9. Dispatch Exclusively Through Day 28 Communication Engine (Section 18)
    let commResult: any = null;
    try {
      commResult = await this.communicationOrchestrator.submitCommunication({
        organisationId,
        outletId: enrollment.outletId || undefined,
        recipientEmail: context.email,
        recipientPhone: context.phone,
        type: 'MARKETING',
        requestedChannel: selectedChannel as any,
        templateId: step.templateId || undefined,
        subject: renderedSubject,
        body: renderedBody,
        source: 'AI_AGENT',
        sourceReferenceId: execution.id,
        idempotencyKey: execution.executionKey,
        metadata: { followUpExecutionId: execution.id },
      } as any);
    } catch (deliveryErr: any) {
      this.logger.error(`Communication delivery failed for execution ${execution.id}: ${deliveryErr.message}`);
      await this.prisma.followUpStepExecution.update({
        where: { id: execution.id },
        data: {
          status: 'TRANSIENT_FAILURE',
          attemptCount: { increment: 1 },
          errorDetails: deliveryErr.message,
        },
      });
      return { status: 'TRANSIENT_FAILURE', error: deliveryErr.message };
    }

    // 10. Update Execution Record to SUCCESS
    const updatedExecution = await this.prisma.followUpStepExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        communicationId: commResult?.id || null,
        executedAt: new Date(),
        metadata: { renderedBody, renderedSubject, selectedChannel },
      },
    });

    // 11. Update Enrollment Last Activity
    await this.prisma.followUpEnrollment.update({
      where: { id: enrollment.id },
      data: {
        lastExecutionAt: new Date(),
      },
    });

    // 12. Log Day 37 SalesActivity on Opportunity if linked
    if (enrollment.opportunityId && enrollment.leadId) {
      await this.prisma.salesActivity.create({
        data: {
          organisationId,
          outletId: enrollment.outletId,
          opportunityId: enrollment.opportunityId,
          leadId: enrollment.leadId,
          type: 'FOLLOW_UP',
          actorType: 'AI',
          channel: selectedChannel,
          title: `Follow-Up Sent: ${step.name}`,
          summary: renderedBody,
          sourceReferenceId: execution.id,
          metadata: { stepOrder: step.stepOrder, channel: selectedChannel },
        },
      });
    }

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.MESSAGE_SENT,
      resource: 'FollowUpStepExecution',
      resourceId: execution.id,
      metadata: { channel: selectedChannel, enrollmentId, stepId, actorType: 'SYSTEM', actorId: 'FOLLOW_UP_ENGINE' },
    });

    return updatedExecution;
  }

  /**
   * Approves a pending execution and dispatches the communication.
   */
  async approveExecution(
    organisationId: string,
    executionId: string,
    overrideMessage?: string,
    staffId?: string,
  ) {
    const execution = await this.prisma.followUpStepExecution.findFirst({
      where: { id: executionId, organisationId },
      include: { enrollment: true, step: true },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found in this organisation`);
    }

    if (execution.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Execution status is ${execution.status}, not PENDING_APPROVAL`);
    }

    return this.executeStep(organisationId, execution.enrollmentId, execution.stepId, {
      forceApprovalBypass: true,
      staffId,
    });
  }

  /**
   * Rejects a pending execution with a documented reason.
   */
  async rejectExecution(
    organisationId: string,
    executionId: string,
    rejectionReason: string,
    staffId?: string,
  ) {
    const execution = await this.prisma.followUpStepExecution.findFirst({
      where: { id: executionId, organisationId },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found in this organisation`);
    }

    const updated = await this.prisma.followUpStepExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        errorDetails: `Rejected by staff (${staffId || 'STAFF'}): ${rejectionReason}`,
      },
    });

    await this.auditService.log({
      organisationId,
      action: FOLLOW_UP_AUDIT_ACTIONS.REJECTED,
      resource: 'FollowUpStepExecution',
      resourceId: executionId,
      metadata: { rejectionReason, staffId, actorType: 'STAFF' },
    });

    return updated;
  }
}
