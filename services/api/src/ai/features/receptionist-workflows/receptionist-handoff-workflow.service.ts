/**
 * Day 35 — Receptionist Handoff Workflow Service
 * Orchestrates production human handoff lifecycles, priority calculation,
 * staff triage, live transfers, graceful fallback, and audit trails.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { ReceptionistRoutingService } from './receptionist-routing.service';
import { ReceptionistNotificationService } from './receptionist-notification.service';
import {
  WorkflowHandoffPriority,
  WorkflowHandoffReason,
  WorkflowHandoffStatus,
} from '@fitcore/types';
import {
  HANDOFF_REASON_PRIORITY_MAP,
  RECEPTIONIST_AUDIT_ACTIONS,
} from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistHandoffWorkflowService {
  private readonly logger = new Logger(ReceptionistHandoffWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly routingService: ReceptionistRoutingService,
    private readonly notificationService: ReceptionistNotificationService,
  ) {}

  /**
   * Creates an operational staff handoff, calculates rule-based priority,
   * routes to active staff, and notifies staff.
   */
  async createHandoff(params: {
    organisationId: string;
    outletId?: string | null;
    conversationId: string;
    interactionId?: string | null;
    memberId?: string | null;
    reason: WorkflowHandoffReason;
    priority?: WorkflowHandoffPriority;
    customerSummary: string;
    suggestedAction?: string;
    userId?: string;
  }) {
    const {
      organisationId,
      outletId,
      conversationId,
      interactionId,
      memberId,
      reason,
      priority,
      customerSummary,
      suggestedAction,
      userId,
    } = params;

    // Verify conversation
    const conversation = await this.prisma.receptionistConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    // Determine deterministic priority
    const resolvedPriority = priority || HANDOFF_REASON_PRIORITY_MAP[reason] || 'NORMAL';

    // Route to eligible staff
    const routing = await this.routingService.findEligibleStaff({
      organisationId,
      outletId: outletId || conversation.outletId,
      reason,
    });

    // Create Handoff record
    const handoff = await this.prisma.receptionistHandoff.create({
      data: {
        organisationId,
        outletId: outletId || conversation.outletId || null,
        conversationId,
        interactionId: interactionId || null,
        receptionistId: conversation.receptionistId,
        memberProfileId: memberId || conversation.customerId || null,
        reason,
        priority: resolvedPriority,
        status: routing.assignedStaffId ? 'ASSIGNED' : 'OPEN',
        assignedStaffId: routing.assignedStaffId || null,
        customerSummary,
        suggestedAction: suggestedAction || `Review inquiry: ${reason}`,
      },
    });

    // Update conversation status
    await this.prisma.receptionistConversation.update({
      where: { id: conversationId },
      data: { status: 'HANDOFF_REQUESTED' },
    });

    // Update interaction status if interactionId provided
    if (interactionId) {
      await this.prisma.receptionistInteraction.update({
        where: { id: interactionId },
        data: {
          status: 'HANDED_OFF',
          outcome: 'STAFF_HANDOFF',
          outcomeSource: 'CUSTOMER',
        },
      });
    }

    // Notify staff via notification service
    if (routing.assignedStaffId) {
      await this.notificationService.notifyStaffOfHandoff({
        organisationId,
        outletId: outletId || conversation.outletId,
        handoffId: handoff.id,
        assignedStaffId: routing.assignedStaffId,
        priority: resolvedPriority,
        reason,
        customerSummary,
      });
    }

    // Audit log
    await this.audit.log({
      userId,
      organisationId,
      outletId: outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.HANDOFF_CREATED,
      resource: 'ReceptionistHandoff',
      resourceId: handoff.id,
      metadata: { priority: resolvedPriority, reason, assignedStaffId: routing.assignedStaffId },
    });

    return handoff;
  }

  /**
   * Transitions handoff status (e.g. ACCEPTED, IN_PROGRESS, COMPLETED).
   */
  async updateHandoffStatus(params: {
    organisationId: string;
    handoffId: string;
    status: WorkflowHandoffStatus;
    notes?: string;
    assignedStaffId?: string;
    userId?: string;
  }) {
    const { organisationId, handoffId, status, notes, assignedStaffId, userId } = params;

    const handoff = await this.prisma.receptionistHandoff.findUnique({
      where: { id: handoffId },
      include: { conversation: true },
    });

    if (!handoff) {
      throw new NotFoundException(`Handoff ${handoffId} not found`);
    }

    if (handoff.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    // Invariant: If assigning new staff, verify staff exists and is active
    if (assignedStaffId && assignedStaffId !== handoff.assignedStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: {
          id: assignedStaffId,
          organisationId,
          employmentStatus: 'ACTIVE',
        },
      });
      if (!staff) {
        throw new BadRequestException('Cannot assign handoff to inactive or unauthorized staff');
      }
    }

    const now = new Date();
    const updated = await this.prisma.receptionistHandoff.update({
      where: { id: handoffId },
      data: {
        status,
        notes: notes ?? handoff.notes,
        assignedStaffId: assignedStaffId ?? handoff.assignedStaffId,
        acceptedAt: status === 'ACCEPTED' || status === 'IN_PROGRESS' ? now : handoff.acceptedAt,
        completedAt: status === 'COMPLETED' ? now : handoff.completedAt,
        resolvedAt: status === 'COMPLETED' ? now : handoff.resolvedAt,
        resolvedBy: status === 'COMPLETED' ? userId : handoff.resolvedBy,
      },
    });

    // If completed, update conversation
    if (status === 'COMPLETED') {
      await this.prisma.receptionistConversation.update({
        where: { id: handoff.conversationId },
        data: { status: 'RESOLVED' },
      });
    }

    // Audit log
    const auditAction =
      status === 'ACCEPTED'
        ? RECEPTIONIST_AUDIT_ACTIONS.HANDOFF_ACCEPTED
        : status === 'COMPLETED'
        ? RECEPTIONIST_AUDIT_ACTIONS.HANDOFF_COMPLETED
        : RECEPTIONIST_AUDIT_ACTIONS.HANDOFF_ASSIGNED;

    await this.audit.log({
      userId,
      organisationId,
      action: auditAction,
      resource: 'ReceptionistHandoff',
      resourceId: handoff.id,
      metadata: { status, assignedStaffId: updated.assignedStaffId },
    });

    return updated;
  }

  /**
   * Retrieves a handoff by ID with tenant and outlet isolation.
   */
  async getHandoff(params: {
    organisationId: string;
    handoffId: string;
    outletId?: string;
    userId?: string;
  }) {
    const { organisationId, handoffId, outletId, userId } = params;

    const handoff = await this.prisma.receptionistHandoff.findUnique({
      where: { id: handoffId },
      include: {
        conversation: {
          select: {
            id: true,
            channel: true,
            status: true,
          },
        },
      },
    });

    if (!handoff) {
      throw new NotFoundException(`Handoff ${handoffId} not found`);
    }

    if (handoff.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    if (outletId && handoff.outletId && handoff.outletId !== outletId) {
      throw new ForbiddenException('Outlet access violation');
    }

    await this.audit.log({
      userId,
      organisationId,
      outletId: handoff.outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.HANDOFF_VIEWED,
      resource: 'ReceptionistHandoff',
      resourceId: handoff.id,
    });

    return handoff;
  }

  /**
   * Lists handoffs with filtering and pagination.
   */
  async listHandoffs(params: {
    organisationId: string;
    outletId?: string;
    status?: string;
    priority?: WorkflowHandoffPriority;
    assignedStaffId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { organisationId, outletId, status, priority, assignedStaffId, limit = 50, offset = 0 } = params;

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;

    const [total, items] = await Promise.all([
      this.prisma.receptionistHandoff.count({ where }),
      this.prisma.receptionistHandoff.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          conversation: {
            select: { id: true, channel: true, status: true },
          },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }
}
