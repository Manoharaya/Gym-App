/**
 * Day 39 — Follow-Up Queue & Preview Service
 * Provides staff operational queue views and non-delivering message previews.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { FollowUpSequenceService } from './follow-up-sequence.service';
import { FollowUpContextService } from './follow-up-context.service';
import { FollowUpAiService } from './follow-up-ai.service';
import {
  FollowUpQueueItemDto,
  FollowUpPreviewDto,
  FollowUpStepChannel,
} from '@fitcore/types';

@Injectable()
export class FollowUpQueueService {
  private readonly logger = new Logger(FollowUpQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: FollowUpSequenceService,
    private readonly contextService: FollowUpContextService,
    private readonly aiService: FollowUpAiService,
  ) {}

  /**
   * Retrieves operational staff queue: items requiring approval or manual outreach.
   */
  async getQueue(
    organisationId: string,
    filters?: {
      outletId?: string;
      status?: string;
      assignedStaffId?: string;
    },
  ): Promise<FollowUpQueueItemDto[]> {
    const executions = await this.prisma.followUpStepExecution.findMany({
      where: {
        organisationId,
        status: (filters?.status as any) || 'PENDING_APPROVAL',
        ...(filters?.outletId ? { enrollment: { outletId: filters.outletId } } : {}),
      },
      include: {
        enrollment: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            opportunity: { select: { id: true, title: true, currentStage: true } },
            sequence: { select: { id: true, name: true, sequenceType: true } },
          },
        },
        step: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    return executions.map((exec) => {
      const lead = exec.enrollment.lead;
      const opp = exec.enrollment.opportunity;
      const meta = (exec.metadata as any) || {};

      return {
        enrollmentId: exec.enrollmentId,
        executionId: exec.id,
        leadId: lead?.id,
        leadName: lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : undefined,
        leadPhone: lead?.phone || undefined,
        leadEmail: lead?.email || undefined,
        opportunityId: opp?.id,
        opportunityTitle: opp?.title,
        pipelineStage: opp?.currentStage,
        sequenceName: exec.enrollment.sequence.name,
        sequenceType: exec.enrollment.sequence.sequenceType as any,
        stepOrder: exec.step.stepOrder,
        stepName: exec.step.name,
        channel: exec.channel as FollowUpStepChannel,
        status: exec.status as any,
        dueAt: exec.scheduledAt,
        previewBody: meta.renderedBody,
        requiresApproval: exec.step.requiresApproval,
      };
    });
  }

  /**
   * Non-delivering preview of a step message (Section 48).
   */
  async previewStep(
    organisationId: string,
    params: {
      sequenceId: string;
      stepOrder: number;
      leadId?: string;
      language?: string;
    },
  ): Promise<FollowUpPreviewDto> {
    const { sequenceId, stepOrder, leadId, language = 'en' } = params;

    const sequence = await this.sequenceService.getSequence(organisationId, sequenceId);
    const version = sequence.activeVersion;
    if (!version) {
      throw new BadRequestException('Sequence has no active published version');
    }

    const step = version.steps.find((s: any) => s.stepOrder === stepOrder);
    if (!step) {
      throw new NotFoundException(`Step order ${stepOrder} not found in sequence ${sequenceId}`);
    }

    // Assemble preview context
    const context = await this.contextService.assembleContext(organisationId, leadId);
    let renderedBody = '';
    let renderedSubject: string | undefined = undefined;
    let isAiGenerated = false;
    let aiSafetyFlags: string[] = [];

    const stepConfig = (step.configuration as any) || {};

    if (step.messageMode === 'AI_ASSISTED') {
      isAiGenerated = true;
      const draft = await this.aiService.generateFollowUpDraft(organisationId, {
        channel: step.channel as FollowUpStepChannel,
        stepName: step.name,
        context,
        language,
        leadId,
        sequenceId,
        stepId: step.id,
      });
      renderedBody = draft.message;
      aiSafetyFlags = draft.safetyFlags;
    } else {
      const rawBody = stepConfig.templateBody || 'Hi {{firstName}}, checking in from {{outletName}}!';
      const rawSubject = stepConfig.templateSubject || 'Hello from {{outletName}}';
      renderedBody = this.contextService.renderTemplate(rawBody, context);
      renderedSubject = this.contextService.renderTemplate(rawSubject, context);
    }

    return {
      stepOrder: step.stepOrder,
      stepName: step.name,
      channel: step.channel as FollowUpStepChannel,
      delayMinutes: step.delayMinutes,
      renderedSubject,
      renderedBody,
      messageMode: step.messageMode,
      variablesUsed: {
        firstName: context.firstName,
        outletName: context.outletName,
        primaryGoal: context.primaryGoal,
      },
      requiresApproval: step.requiresApproval,
      isAiGenerated,
      aiSafetyFlags,
    };
  }
}
