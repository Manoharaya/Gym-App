import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
  ConsoleSmsProvider,
  LocalInAppProvider,
} from '../providers/console-providers';
import { PushDeviceService } from './push-device.service';
import { NotificationQueueService, DeliveryJob } from '../queue/notification-queue.service';
import { NotificationChannelEnum } from '../dto/communication.dto';
import { DeliveryResult } from '../providers/provider.interface';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emailProvider: ConsoleEmailProvider,
    private readonly smsProvider: ConsoleSmsProvider,
    private readonly pushProvider: ConsolePushProvider,
    private readonly inAppProvider: LocalInAppProvider,
    private readonly pushDeviceService: PushDeviceService,
    private readonly queueService: NotificationQueueService,
  ) {}

  /**
   * Processes an individual delivery job.
   */
  async processDelivery(job: DeliveryJob): Promise<boolean> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: job.deliveryId },
      include: {
        notification: {
          include: {
            recipientUser: true,
          },
        },
      },
    });

    if (!delivery) {
      this.logger.warn(`Delivery '${job.deliveryId}' not found. Skipping.`);
      return false;
    }

    if (delivery.status === 'DELIVERED') {
      return true; // Idempotent skip
    }

    const { notification } = delivery;
    const user = notification.recipientUser;

    let result: DeliveryResult = { success: false };

    try {
      if (delivery.channel === NotificationChannelEnum.IN_APP) {
        result = await this.inAppProvider.send({
          notificationId: notification.id,
          recipientUserId: user.id,
          title: notification.title,
          body: notification.body,
          data: notification.data as any,
        });
      } else if (delivery.channel === NotificationChannelEnum.EMAIL) {
        if (!user.email) {
          result = { success: false, error: 'NO_RECIPIENT_EMAIL', providerMessageId: undefined };
        } else {
          result = await this.emailProvider.send({
            to: user.email,
            subject: notification.title,
            body: notification.body,
            recipientUserId: user.id,
            organisationId: notification.organisationId,
          });
        }
      } else if (delivery.channel === NotificationChannelEnum.SMS) {
        if (!user.phone) {
          result = { success: false, error: 'NO_RECIPIENT_PHONE', providerMessageId: undefined };
        } else {
          result = await this.smsProvider.send({
            to: user.phone,
            body: `${notification.title}: ${notification.body}`,
            recipientUserId: user.id,
            organisationId: notification.organisationId,
          });
        }
      } else if (delivery.channel === NotificationChannelEnum.PUSH) {
        const tokens = await this.pushDeviceService.getActiveTokens(user.id);
        if (tokens.length === 0) {
          // No registered push devices
          result = { success: true, providerMessageId: 'NO_ACTIVE_PUSH_DEVICES', error: undefined };
        } else {
          result = await this.pushProvider.send({
            tokens,
            title: notification.title,
            body: notification.body,
            data: notification.data as any,
            priority: notification.priority,
            recipientUserId: user.id,
            organisationId: notification.organisationId,
          });
        }
      }
    } catch (err: any) {
      result = { success: false, error: err.message, providerMessageId: undefined };
    }

    const now = new Date();
    const newAttemptCount = delivery.attemptCount + 1;

    if (result.success) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          providerMessageId: result.providerMessageId,
          attemptCount: newAttemptCount,
          lastAttemptAt: now,
          deliveredAt: now,
        },
      });

      // Update parent notification status
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'DELIVERED' },
      });

      await this.audit.log({
        userId: user.id,
        action: 'NOTIFICATION_DELIVERED',
        resource: 'notifications',
        resourceId: notification.id,
        organisationId: notification.organisationId,
        metadata: { channel: delivery.channel, deliveryId: delivery.id },
      });

      return true;
    } else {
      // Failed attempt
      const isDeadLetter = newAttemptCount >= 3;
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isDeadLetter ? 'FAILED' : 'PENDING',
          attemptCount: newAttemptCount,
          lastAttemptAt: now,
          failedAt: now,
          failureCode: result.error || 'DELIVERY_ERROR',
          failureReason: result.error,
        },
      });

      await this.audit.log({
        userId: user.id,
        action: 'NOTIFICATION_FAILED',
        resource: 'notifications',
        resourceId: notification.id,
        organisationId: notification.organisationId,
        metadata: {
          channel: delivery.channel,
          error: result.error,
          attemptCount: newAttemptCount,
        },
      });

      if (!isDeadLetter) {
        await this.queueService.enqueueRetry({
          ...job,
          attemptCount: newAttemptCount,
        });
      }

      return false;
    }
  }

  /**
   * Drains the queue and processes all pending delivery jobs.
   */
  async processQueue(): Promise<number> {
    let count = 0;
    let job = await this.queueService.popDelivery();

    while (job) {
      await this.processDelivery(job);
      count++;
      job = await this.queueService.popDelivery();
    }

    return count;
  }
}
