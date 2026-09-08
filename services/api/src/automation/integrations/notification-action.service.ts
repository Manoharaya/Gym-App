/**
 * Day 30 — In-App Notification Action Integration Service
 *
 * Dispatches in-app notifications to members, assigned trainers, or outlet managers.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EngagementNotificationService } from '../../engagement/services/engagement-notification.service';
import { NotificationCategoryEnum, NotificationPriorityEnum } from '../../communication/dto/communication.dto';

export interface ExecuteNotificationActionParams {
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  title: string;
  message: string;
  recipientType?: 'MEMBER' | 'ASSIGNED_TRAINER' | 'OUTLET_MANAGER';
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  variables?: Record<string, any>;
  workflowInstanceId: string;
}

@Injectable()
export class NotificationActionService {
  private readonly logger = new Logger(NotificationActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly engagementNotification?: EngagementNotificationService,
  ) {}

  /**
   * Executes SEND_IN_APP_NOTIFICATION, NOTIFY_ASSIGNED_TRAINER, or NOTIFY_MANAGER.
   */
  async executeNotificationAction(params: ExecuteNotificationActionParams): Promise<{
    success: boolean;
    notificationId?: string;
    details: string;
  }> {
    const {
      organisationId,
      outletId,
      memberId,
      title,
      message,
      recipientType = 'MEMBER',
      priority = 'NORMAL',
      variables = {},
      workflowInstanceId,
    } = params;

    try {
      const member = await this.prisma.memberProfile.findUnique({
        where: { id: memberId },
        include: {
          user: true,
          memberOutlets: true,
          trainerClientAssignments: {
            where: { status: 'ACTIVE' },
            include: { trainerProfile: { include: { staffProfile: true } } },
            take: 1,
          },
        },
      });

      if (!member) {
        return {
          success: false,
          details: `Member profile '${memberId}' not found. Cannot send in-app notification.`,
        };
      }

      // Determine recipient user ID based on target recipient
      let recipientUserId: string | null = null;
      if (recipientType === 'MEMBER') {
        recipientUserId = member.userId;
      } else if (recipientType === 'ASSIGNED_TRAINER') {
        recipientUserId = member.trainerClientAssignments[0]?.trainerProfile?.staffProfile?.userId || null;
        if (!recipientUserId) {
          // If no trainer is assigned, log note and skip gracefully
          return {
            success: true,
            details: `Member ${memberId} has no assigned trainer. Trainer notification skipped gracefully.`,
          };
        }
      } else if (recipientType === 'OUTLET_MANAGER') {
        const primaryOutletId = outletId || member.memberOutlets[0]?.outletId;
        const managerRole = await this.prisma.userRole.findFirst({
          where: {
            organisationId,
            outletId: primaryOutletId || undefined,
            role: {
              name: { in: ['OUTLET_MANAGER', 'ORGANISATION_OWNER', 'SUPERADMIN'] },
            },
          },
          select: { userId: true },
        });
        recipientUserId = managerRole?.userId || null;
      }

      if (!recipientUserId) {
        return {
          success: false,
          details: `Recipient user for ${recipientType} could not be resolved.`,
        };
      }

      // Variable interpolation
      const fullVars: Record<string, any> = {
        firstName: member.user?.firstName || 'Member',
        lastName: member.user?.lastName || '',
        ...variables,
      };

      const render = (str: string) =>
        str.replace(/\{\{(\w+)\}\}/g, (_, k) => fullVars[k] !== undefined ? String(fullVars[k]) : '');

      const renderedTitle = render(title);
      const renderedMessage = render(message);

      const prioEnum =
        priority === 'URGENT'
          ? NotificationPriorityEnum.URGENT
          : priority === 'HIGH'
          ? NotificationPriorityEnum.HIGH
          : NotificationPriorityEnum.NORMAL;

      const notif = await this.prisma.notification.create({
        data: {
          organisationId,
          recipientUserId,
          type: 'AUTOMATION_WORKFLOW_EVENT',
          category: NotificationCategoryEnum.PROGRESS,
          priority: prioEnum,
          title: renderedTitle,
          body: renderedMessage,
          data: {
            workflowInstanceId,
            memberId,
            recipientType,
            ...fullVars,
          },
        },
      });

      return {
        success: true,
        notificationId: notif.id,
        details: `In-app notification sent to ${recipientType} (User: ${recipientUserId}). Notification ID: ${notif.id}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to dispatch in-app notification: ${err.message}`, err.stack);
      return {
        success: false,
        details: `Failed to dispatch in-app notification: ${err.message}`,
      };
    }
  }
}
