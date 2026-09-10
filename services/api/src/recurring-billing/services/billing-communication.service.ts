/**
 * FitCore — Day 42: Billing Communication Bridge
 *
 * Dispatches dunning and payment reminder notifications through the authoritative
 * Day 28 Communication Engine (NotificationOrchestratorService).
 * NEVER calls external email, SMS, or push providers directly.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationOrchestratorService } from '../../communication/services/notification-orchestrator.service';
import { NotificationCategoryEnum, NotificationPriorityEnum } from '../../communication/dto/communication.dto';

@Injectable()
export class BillingCommunicationService {
  private readonly logger = new Logger(BillingCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  /**
   * Sends a payment failure reminder via the Day 28 Communication Engine.
   */
  async sendPaymentFailedReminder(
    organisationId: string,
    memberProfileId: string,
    invoiceId: string,
    amountMinor: number,
    currency: string,
    nextRetryAt: Date | null,
    isActionRequired: boolean = false,
  ): Promise<void> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { user: true, memberOutlets: true },
    });

    if (!member || !member.userId) {
      this.logger.warn(
        `Cannot send payment failure reminder: member ${memberProfileId} has no linked user`,
      );
      return;
    }

    const outletId = member.memberOutlets[0]?.outletId || null;
    const formattedAmount = `${currency} ${(amountMinor / 100).toFixed(2)}`;
    const nextRetryFormatted = nextRetryAt
      ? nextRetryAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Review required';

    try {
      await this.notificationOrchestrator.handleDomainEvent({
        type: isActionRequired ? 'payment.action_required' : 'payment.failed',
        organisationId,
        outletId,
        recipientUserId: member.userId,
        memberId: memberProfileId,
        category: NotificationCategoryEnum.PAYMENT,
        priority: NotificationPriorityEnum.HIGH,
        variables: {
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          amount: formattedAmount,
          currency,
          nextRetryDate: nextRetryFormatted,
          isActionRequired,
        },
        data: {
          actionType: 'UPDATE_PAYMENT_METHOD',
          invoiceId,
          deepLink: `/billing/invoices/${invoiceId}`,
        },
        idempotencyKey: `dunning_notify_${invoiceId}_${Date.now()}`,
      });
      this.logger.log(
        `Dispatched payment failure notification for member ${memberProfileId}, invoice ${invoiceId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to dispatch billing notification via Communication Engine: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Sends a payment recovered confirmation notification.
   */
  async sendPaymentRecoveredNotice(
    organisationId: string,
    memberProfileId: string,
    invoiceId: string,
    amountMinor: number,
    currency: string,
  ): Promise<void> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { user: true, memberOutlets: true },
    });

    if (!member || !member.userId) return;

    const outletId = member.memberOutlets[0]?.outletId || null;
    const formattedAmount = `${currency} ${(amountMinor / 100).toFixed(2)}`;

    try {
      await this.notificationOrchestrator.handleDomainEvent({
        type: 'payment.succeeded',
        organisationId,
        outletId,
        recipientUserId: member.userId,
        memberId: memberProfileId,
        category: NotificationCategoryEnum.PAYMENT,
        priority: NotificationPriorityEnum.NORMAL,
        variables: {
          firstName: member.user.firstName,
          amount: formattedAmount,
          currency,
        },
        data: {
          actionType: 'VIEW_RECEIPT',
          invoiceId,
        },
        idempotencyKey: `recovery_notify_${invoiceId}`,
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to dispatch payment recovered notice: ${err.message}`,
      );
    }
  }
}
