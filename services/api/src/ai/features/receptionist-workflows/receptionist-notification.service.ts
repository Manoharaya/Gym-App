/**
 * Day 35 — Receptionist Notification Service
 * Controlled staff notifications via Day 28 Communication infrastructure.
 * Enforces safety: Conciseness, zero private health info, zero internal AI scores.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationOrchestratorService } from '../../../communication/services/notification-orchestrator.service';
import {
  WorkflowHandoffPriority,
  WorkflowHandoffReason,
} from '@fitcore/types';
import { NotificationPriorityEnum, NotificationCategoryEnum } from '../../../communication/dto/communication.dto';

@Injectable()
export class ReceptionistNotificationService {
  private readonly logger = new Logger(ReceptionistNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  /**
   * Dispatches a controlled notification to assigned staff for a receptionist handoff.
   */
  async notifyStaffOfHandoff(params: {
    organisationId: string;
    outletId?: string | null;
    handoffId: string;
    assignedStaffId: string;
    priority: WorkflowHandoffPriority;
    reason: WorkflowHandoffReason;
    customerSummary: string;
  }) {
    const { organisationId, outletId, handoffId, assignedStaffId, priority, reason, customerSummary } = params;

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: assignedStaffId },
      include: { user: true },
    });

    if (!staff || !staff.userId) {
      this.logger.warn(`Cannot notify staff ${assignedStaffId}: user record not found`);
      return;
    }

    const priorityMap: Record<WorkflowHandoffPriority, NotificationPriorityEnum> = {
      LOW: NotificationPriorityEnum.LOW,
      NORMAL: NotificationPriorityEnum.NORMAL,
      HIGH: NotificationPriorityEnum.HIGH,
      URGENT: NotificationPriorityEnum.URGENT,
    };

    try {
      await this.notificationOrchestrator.handleDomainEvent({
        organisationId,
        recipientUserId: staff.userId,
        type: 'RECEPTIONIST_HANDOFF',
        category: NotificationCategoryEnum.COMMUNICATION,
        priority: priorityMap[priority] || NotificationPriorityEnum.NORMAL,
        idempotencyKey: `handoff-notification:${handoffId}`,
        variables: {},
        data: {
          handoffId,
          outletId: outletId || undefined,
          reason,
          summaryPreview: customerSummary.slice(0, 150),
        },
      });
    } catch (err: any) {
      // Graceful degradation: do not throw to caller
      this.logger.warn(`Failed to dispatch staff handoff notification: ${err.message}`);
    }
  }

  /**
   * Dispatches a controlled notification for a new callback request or follow-up task.
   */
  async notifyStaffOfFollowUp(params: {
    organisationId: string;
    taskId: string;
    assignedStaffId: string;
    title: string;
    description?: string;
  }) {
    const { organisationId, taskId, assignedStaffId, title, description } = params;

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: assignedStaffId },
    });

    if (!staff || !staff.userId) return;

    try {
      await this.notificationOrchestrator.handleDomainEvent({
        organisationId,
        recipientUserId: staff.userId,
        type: 'STAFF_TASK',
        category: NotificationCategoryEnum.COMMUNICATION,
        priority: NotificationPriorityEnum.NORMAL,
        idempotencyKey: `followup-notification:${taskId}`,
        variables: {},
        data: {
          taskId,
          title,
          description: description ? description.slice(0, 150) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch staff follow-up notification: ${err.message}`);
    }
  }
}
