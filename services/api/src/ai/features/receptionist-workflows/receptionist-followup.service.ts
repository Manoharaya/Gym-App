/**
 * Day 35 — Receptionist Follow-Up Task Service
 * Manages operational staff follow-up tasks, lifecycle transitions,
 * staff assignment, and outcome recordings.
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
  FollowUpTaskStatus,
  FollowUpTaskPriority,
  FollowUpTaskOutcome,
} from '@fitcore/types';
import { RECEPTIONIST_AUDIT_ACTIONS } from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistFollowUpService {
  private readonly logger = new Logger(ReceptionistFollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly routingService: ReceptionistRoutingService,
    private readonly notificationService: ReceptionistNotificationService,
  ) {}

  /**
   * Creates a new follow-up task, automatically evaluates routing, and alerts staff.
   */
  async createFollowUpTask(params: {
    organisationId: string;
    outletId?: string | null;
    interactionId?: string | null;
    leadId?: string | null;
    memberId?: string | null;
    priority?: FollowUpTaskPriority;
    reason: string;
    notes?: string;
    dueAt?: Date;
    userId?: string;
  }) {
    const {
      organisationId,
      outletId,
      interactionId,
      leadId,
      memberId,
      priority = 'NORMAL',
      reason,
      notes,
      dueAt,
      userId,
    } = params;

    // Route to eligible staff
    const routing = await this.routingService.findEligibleStaff({
      organisationId,
      outletId,
    });

    const task = await this.prisma.receptionistFollowUpTask.create({
      data: {
        organisationId,
        outletId: outletId || null,
        interactionId: interactionId || null,
        leadId: leadId || null,
        memberId: memberId || null,
        priority,
        reason,
        status: routing.assignedStaffId ? 'ASSIGNED' : 'OPEN',
        assignedStaffId: routing.assignedStaffId || null,
        notes: notes || null,
        dueAt: dueAt || null,
      },
    });

    // Notify assigned staff
    if (routing.assignedStaffId) {
      await this.notificationService.notifyStaffOfFollowUp({
        organisationId,
        taskId: task.id,
        assignedStaffId: routing.assignedStaffId,
        title: `Receptionist Follow-up: ${reason}`,
        description: notes,
      });
    }

    // Audit log
    await this.audit.log({
      userId,
      organisationId,
      outletId: outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.FOLLOWUP_CREATED,
      resource: 'ReceptionistFollowUpTask',
      resourceId: task.id,
      metadata: { priority, reason, assignedStaffId: routing.assignedStaffId },
    });

    return task;
  }

  /**
   * Updates task status, staff assignment, and outcome.
   */
  async updateFollowUpTask(params: {
    organisationId: string;
    taskId: string;
    status?: FollowUpTaskStatus;
    outcome?: FollowUpTaskOutcome;
    notes?: string;
    assignedStaffId?: string;
    userId?: string;
  }) {
    const { organisationId, taskId, status, outcome, notes, assignedStaffId, userId } = params;

    const task = await this.prisma.receptionistFollowUpTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (task.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    // Verify staff if reassigning
    if (assignedStaffId && assignedStaffId !== task.assignedStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: { id: assignedStaffId, organisationId, employmentStatus: 'ACTIVE' },
      });
      if (!staff) {
        throw new BadRequestException('Cannot assign task to inactive or unauthorized staff');
      }
    }

    const isCompleted = status === 'COMPLETED';
    const updated = await this.prisma.receptionistFollowUpTask.update({
      where: { id: taskId },
      data: {
        status: status ?? task.status,
        outcome: outcome ?? task.outcome,
        notes: notes ?? task.notes,
        assignedStaffId: assignedStaffId ?? task.assignedStaffId,
        completedAt: isCompleted ? new Date() : task.completedAt,
      },
    });

    if (isCompleted) {
      await this.audit.log({
        userId,
        organisationId,
        action: RECEPTIONIST_AUDIT_ACTIONS.FOLLOWUP_COMPLETED,
        resource: 'ReceptionistFollowUpTask',
        resourceId: task.id,
        metadata: { outcome, completedByUserId: userId },
      });
    }

    return updated;
  }

  /**
   * Lists follow-up tasks with filtering.
   */
  async listFollowUpTasks(params: {
    organisationId: string;
    outletId?: string;
    status?: FollowUpTaskStatus;
    priority?: FollowUpTaskPriority;
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
      this.prisma.receptionistFollowUpTask.count({ where }),
      this.prisma.receptionistFollowUpTask.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
          member: { select: { id: true, userId: true } },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }
}
