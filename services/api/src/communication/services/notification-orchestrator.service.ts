import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationQueueService } from '../queue/notification-queue.service';
import {
  DomainNotificationEvent,
} from '../events/communication.events';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
} from '../dto/communication.dto';

@Injectable()
export class NotificationOrchestratorService {
  private readonly logger = new Logger(NotificationOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly queueService: NotificationQueueService,
  ) {}

  /**
   * Orchestrates a domain notification event end-to-end:
   * Event -> Idempotency -> Recipient Check -> Preference/Consent -> Template Resolution -> Storage -> Queue -> Dispatch.
   */
  async handleDomainEvent(event: DomainNotificationEvent) {
    this.logger.log(
      `Received domain notification event '${event.type}' for user '${event.recipientUserId}' in org '${event.organisationId}'`,
    );

    // 1. Idempotency check (Slice 21)
    if (event.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          recipientUserId: event.recipientUserId,
          organisationId: event.organisationId,
          type: event.type,
          data: {
            path: ['idempotencyKey'],
            equals: event.idempotencyKey,
          },
        },
        include: { deliveries: true },
      });

      if (existing) {
        this.logger.log(
          `Idempotency key match '${event.idempotencyKey}'. Returning existing notification '${existing.id}'.`,
        );
        return existing;
      }
    }

    // 2. Validate recipient
    const recipient = await this.prisma.user.findUnique({
      where: { id: event.recipientUserId },
      include: {
        memberProfile: {
          select: { id: true },
        },
      },
    });

    if (!recipient) {
      this.logger.warn(`Recipient user '${event.recipientUserId}' not found. Notification dropped.`);
      throw new NotFoundException(`Recipient user '${event.recipientUserId}' not found`);
    }

    const memberId = event.memberId ?? recipient.memberProfile?.id ?? null;
    const priority = event.priority ?? NotificationPriorityEnum.NORMAL;

    // 3. Channel resolution and permission checking
    const candidateChannels = [
      NotificationChannelEnum.IN_APP,
      NotificationChannelEnum.PUSH,
      NotificationChannelEnum.EMAIL,
      NotificationChannelEnum.SMS,
    ];

    const eligibleChannels: Array<{
      channel: NotificationChannelEnum;
      template: any;
      rendered: { title: string; subject?: string; body: string };
    }> = [];

    for (const channel of candidateChannels) {
      // Find template for this channel
      const template = await this.templateService.resolveTemplate(
        event.organisationId,
        event.type,
        channel,
      );

      if (!template) {
        continue;
      }

      // Check preference and consent
      const check = await this.preferenceService.isDeliveryAllowed(
        event.recipientUserId,
        event.organisationId,
        event.category,
        channel,
        priority,
        event.isMarketing ?? false,
      );

      if (check.allowed) {
        const rendered = this.templateService.renderNotification(
          template,
          event.variables,
        );
        eligibleChannels.push({ channel, template, rendered });
      } else {
        this.logger.debug(
          `Channel '${channel}' suppressed for user '${event.recipientUserId}': ${check.reason}`,
        );
      }
    }

    if (eligibleChannels.length === 0) {
      this.logger.log(
        `No eligible delivery channels for event '${event.type}' to user '${event.recipientUserId}'.`,
      );
      return null;
    }

    // 4. Determine canonical title and body from the in-app or first available rendered channel
    const primary =
      eligibleChannels.find((c) => c.channel === NotificationChannelEnum.IN_APP) ??
      eligibleChannels[0];

    const notificationData = {
      ...(event.data || {}),
      ...(event.idempotencyKey ? { idempotencyKey: event.idempotencyKey } : {}),
    };

    // 5. Persist Notification row
    const notification = await this.prisma.notification.create({
      data: {
        organisationId: event.organisationId,
        outletId: event.outletId,
        recipientUserId: event.recipientUserId,
        memberId,
        type: event.type,
        category: event.category,
        title: primary.rendered.title,
        body: primary.rendered.body,
        data: notificationData,
        priority,
        status: 'PENDING',
      },
    });

    // 6. Create Delivery records & enqueue jobs
    for (const item of eligibleChannels) {
      const delivery = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: item.channel,
          provider: item.channel === NotificationChannelEnum.IN_APP ? 'IN_APP_LOCAL' : `CONSOLE_${item.channel}`,
          status: 'PENDING',
          attemptCount: 0,
        },
      });

      await this.queueService.enqueueDelivery({
        deliveryId: delivery.id,
        notificationId: notification.id,
        channel: item.channel,
        attemptCount: 0,
      });
    }

    await this.audit.log({
      userId: event.recipientUserId,
      action: 'NOTIFICATION_CREATED',
      resource: 'notifications',
      resourceId: notification.id,
      organisationId: event.organisationId,
      metadata: {
        type: event.type,
        category: event.category,
        channels: eligibleChannels.map((c) => c.channel),
      },
    });

    // 7. Drain queue asynchronously (or immediately for quick feedback)
    await this.deliveryService.processQueue();

    return this.prisma.notification.findUnique({
      where: { id: notification.id },
      include: { deliveries: true },
    });
  }
}
