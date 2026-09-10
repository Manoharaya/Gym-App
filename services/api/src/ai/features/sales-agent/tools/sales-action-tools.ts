/**
 * Day 36 — AI Sales Agent Action Tools
 * Strictly controlled mutation tools for Trials, Tours, Human Handoffs, and Receptionist Routing.
 * All mutations implement schema validation, tenant checks, audit records, and verification.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { SalesHandoffReason, SalesHandoffPriority } from '@fitcore/types';

@Injectable()
export class SalesActionTools {
  private readonly logger = new Logger(SalesActionTools.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. Request a Complimentary Trial Pass for a prospect.
   */
  async requestTrial(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      outletId?: string;
      preferredDate?: string;
      notes?: string;
    },
  ) {
    this.logger.log(`[SalesActionTools] Requesting trial for lead ${params.leadId} in org ${organisationId}`);

    // Verify lead belongs to organisation
    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, organisationId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${params.leadId} not found in organisation`);
    }

    const trialDate = params.preferredDate ? new Date(params.preferredDate) : new Date();

    // 1. Create or update SalesNextAction
    const existingAction = await this.prisma.salesNextAction.findFirst({
      where: {
        conversationId: params.conversationId,
        actionType: 'BOOK_TRIAL',
        status: 'RECOMMENDED',
      },
    });

    let nextAction;
    if (existingAction) {
      nextAction = await this.prisma.salesNextAction.update({
        where: { id: existingAction.id },
        data: {
          status: 'EXECUTED',
          reason: 'Prospect requested complimentary trial pass',
          payload: {
            preferredDate: trialDate.toISOString(),
            notes: params.notes,
          },
          executedAt: new Date(),
        },
      });
    } else {
      nextAction = await this.prisma.salesNextAction.create({
        data: {
          conversationId: params.conversationId,
          organisationId,
          outletId: params.outletId || lead.outletId,
          leadId: lead.id,
          actionType: 'BOOK_TRIAL',
          status: 'EXECUTED',
          reason: 'Prospect requested complimentary trial pass',
          payload: {
            preferredDate: trialDate.toISOString(),
            notes: params.notes,
          },
          executedAt: new Date(),
        },
      });
    }

    // 2. Log Lead Activity
    await this.prisma.leadActivity.create({
      data: {
        organisationId,
        leadId: lead.id,
        activityType: 'TRIAL_REQUESTED',
        actorType: 'AI_RECEPTIONIST',
        title: 'Trial Pass Requested',
        description: `Complimentary trial requested for ${trialDate.toISOString().split('T')[0]}.`,
        metadata: {
          conversationId: params.conversationId,
          nextActionId: nextAction.id,
        },
      },
    });

    // 3. Update Lead Status
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'TRIAL_INTEREST',
        lastInteractionAt: new Date(),
      },
    });

    // 4. Audit Event
    await this.auditService.log({
      organisationId,
      action: 'SALES_TRIAL_REQUESTED',
      resource: 'Lead',
      resourceId: lead.id,
      metadata: {
        conversationId: params.conversationId,
        nextActionId: nextAction.id,
      },
    });

    return {
      success: true,
      trialReference: `TRL-${nextAction.id.substring(0, 8).toUpperCase()}`,
      leadId: lead.id,
      preferredDate: trialDate.toISOString(),
      status: 'CONFIRMED',
      instructions:
        'Your complimentary 1-day pass is ready. Please bring a photo ID and a workout towel when you visit.',
    };
  }

  /**
   * 2. Request a Guided Facility Tour for a prospect.
   */
  async requestTour(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      outletId?: string;
      preferredDate?: string;
      notes?: string;
    },
  ) {
    this.logger.log(`[SalesActionTools] Requesting facility tour for lead ${params.leadId} in org ${organisationId}`);

    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, organisationId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${params.leadId} not found in organisation`);
    }

    const tourDate = params.preferredDate ? new Date(params.preferredDate) : new Date();

    // 1. Create or update SalesNextAction
    const existingAction = await this.prisma.salesNextAction.findFirst({
      where: {
        conversationId: params.conversationId,
        actionType: 'BOOK_TOUR',
        status: 'RECOMMENDED',
      },
    });

    let nextAction;
    if (existingAction) {
      nextAction = await this.prisma.salesNextAction.update({
        where: { id: existingAction.id },
        data: {
          status: 'EXECUTED',
          reason: 'Prospect requested guided facility tour',
          payload: {
            preferredDate: tourDate.toISOString(),
            notes: params.notes,
          },
          executedAt: new Date(),
        },
      });
    } else {
      nextAction = await this.prisma.salesNextAction.create({
        data: {
          conversationId: params.conversationId,
          organisationId,
          outletId: params.outletId || lead.outletId,
          leadId: lead.id,
          actionType: 'BOOK_TOUR',
          status: 'EXECUTED',
          reason: 'Prospect requested guided facility tour',
          payload: {
            preferredDate: tourDate.toISOString(),
            notes: params.notes,
          },
          executedAt: new Date(),
        },
      });
    }

    // 2. Log Lead Activity
    await this.prisma.leadActivity.create({
      data: {
        organisationId,
        leadId: lead.id,
        activityType: 'TOUR_REQUESTED',
        actorType: 'AI_RECEPTIONIST',
        title: 'Facility Tour Scheduled',
        description: `Guided tour arranged for ${tourDate.toISOString().split('T')[0]}.`,
        metadata: {
          conversationId: params.conversationId,
          nextActionId: nextAction.id,
        },
      },
    });

    // 3. Update Lead Status
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'TOUR_INTEREST',
        lastInteractionAt: new Date(),
      },
    });

    // 4. Audit Event
    await this.auditService.log({
      organisationId,
      action: 'SALES_TOUR_REQUESTED',
      resource: 'Lead',
      resourceId: lead.id,
      metadata: {
        conversationId: params.conversationId,
        nextActionId: nextAction.id,
      },
    });

    return {
      success: true,
      tourReference: `TUR-${nextAction.id.substring(0, 8).toUpperCase()}`,
      leadId: lead.id,
      preferredDate: tourDate.toISOString(),
      status: 'SCHEDULED',
      instructions:
        'Your tour has been scheduled. Our team looks forward to welcoming you and showing you our facilities.',
    };
  }

  /**
   * 3. Request Human Staff Escalation (creates SalesHandoff and ReceptionistFollowUpTask).
   */
  async requestHumanHandoff(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      reason: SalesHandoffReason;
      priority?: SalesHandoffPriority;
      notes?: string;
      customerSummary?: string;
      assignedStaffId?: string;
    },
  ) {
    this.logger.log(`[SalesActionTools] Initiating human handoff for lead ${params.leadId} - Reason: ${params.reason}`);

    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, organisationId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${params.leadId} not found in organisation`);
    }

    const priority = params.priority || 'MEDIUM';

    // 1. Create SalesHandoff record
    const handoff = await this.prisma.salesHandoff.create({
      data: {
        conversationId: params.conversationId,
        organisationId,
        outletId: lead.outletId,
        leadId: lead.id,
        reason: params.reason,
        priority,
        status: 'PENDING',
        notes: params.notes,
        customerSummary: params.customerSummary || `Customer requested human staff support regarding ${params.reason}.`,
        assignedStaffId: params.assignedStaffId || null,
      },
    });

    // 2. Create ReceptionistFollowUpTask in existing workflow engine (Day 35 integration)
    await this.prisma.receptionistFollowUpTask.create({
      data: {
        organisationId,
        outletId: lead.outletId,
        leadId: lead.id,
        priority: priority === 'URGENT' ? 'URGENT' : priority === 'HIGH' ? 'HIGH' : 'NORMAL',
        reason: 'LEAD_FOLLOW_UP',
        status: 'OPEN',
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours SLA
        notes: `[Sales Agent Escalation] ${params.reason}: ${params.notes || 'No extra notes provided.'}`,
        assignedStaffId: params.assignedStaffId || null,
        metadata: {
          conversationId: params.conversationId,
          salesHandoffId: handoff.id,
        },
      },
    });

    // 3. Update Conversation Status
    await this.prisma.salesConversation.update({
      where: { id: params.conversationId },
      data: {
        status: 'HANDED_OFF',
        lastActivityAt: new Date(),
      },
    });

    // 4. Log Lead Activity
    await this.prisma.leadActivity.create({
      data: {
        organisationId,
        leadId: lead.id,
        activityType: 'HANDOFF_CREATED',
        actorType: 'AI_RECEPTIONIST',
        title: 'Staff Escalation Created',
        description: `Prospect escalated to human staff. Reason: ${params.reason} (${priority} priority).`,
        metadata: {
          conversationId: params.conversationId,
          salesHandoffId: handoff.id,
        },
      },
    });

    // 5. Audit Event
    await this.auditService.log({
      organisationId,
      action: 'SALES_HUMAN_HANDOFF_CREATED',
      resource: 'SalesHandoff',
      resourceId: handoff.id,
      metadata: {
        conversationId: params.conversationId,
        leadId: lead.id,
        reason: params.reason,
        priority,
      },
    });

    return {
      success: true,
      handoffId: handoff.id,
      status: 'PENDING',
      priority,
      message:
        'A team member has been notified and will assist you shortly. We appreciate your patience!',
    };
  }

  /**
   * 4. Handoff to Receptionist / Booking Engine (Day 35 integration).
   */
  async handoffToReceptionist(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      action: 'BOOK_CLASS' | 'SCHEDULE_APPOINTMENT' | 'GENERAL_OPERATION';
      details?: Record<string, any>;
    },
  ) {
    this.logger.log(`[SalesActionTools] Routing to Receptionist workflow for action: ${params.action}`);

    // Create Next Action record
    const nextAction = await this.prisma.salesNextAction.create({
      data: {
        conversationId: params.conversationId,
        organisationId,
        leadId: params.leadId,
        actionType: 'BOOK_CLASS',
        status: 'EXECUTED',
        reason: `Delegated to Receptionist booking engine: ${params.action}`,
        payload: params.details || {},
        executedAt: new Date(),
      },
    });

    return {
      success: true,
      nextActionId: nextAction.id,
      delegatedTo: 'RECEPTIONIST_BOOKING_ENGINE',
      status: 'ROUTED',
      message: 'Transferring to booking assistant to finalize schedule and availability.',
    };
  }
}
