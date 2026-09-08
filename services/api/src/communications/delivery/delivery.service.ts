import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationProviderFactory } from '../providers/provider-factory.service';
import { RetryPolicyService } from './retry-policy.service';
import { DeliveryStatusService } from './delivery-status.service';
import {
  CommunicationChannel,
  OutboundCommunication,
  ProviderSendResult,
} from '../communications.types';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: CommunicationProviderFactory,
    private readonly retryPolicy: RetryPolicyService,
    private readonly deliveryStatusService: DeliveryStatusService,
  ) {}

  /**
   * Dispatches a queued communication to the appropriate channel provider.
   */
  async dispatch(communicationId: string): Promise<ProviderSendResult> {
    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
      include: {
        recipientUser: true,
        recipientMember: {
          include: { user: true },
        },
      },
    });

    if (!communication) {
      throw new NotFoundException(`Communication '${communicationId}' not found`);
    }

    if (['DELIVERED', 'READ', 'CANCELLED', 'SUPPRESSED'].includes(communication.status)) {
      this.logger.warn(`Communication '${communicationId}' is already in final state '${communication.status}'`);
      return {
        success: true,
        providerStatus: communication.status,
      };
    }

    // Resolve recipient contact information
    const user = communication.recipientUser || communication.recipientMember?.user;
    const email = user?.email || (communication.metadata as any)?.recipientEmail;
    const phone = user?.phone || (communication.metadata as any)?.recipientPhone;

    // Resolve push device tokens if channel is PUSH
    let pushTokens: string[] = [];
    if (communication.channel === 'PUSH' && user) {
      const devices = await this.prisma.pushDevice.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { pushToken: true },
      });
      pushTokens = devices.map((d) => d.pushToken);
    }

    // Handle IN_APP channel directly
    if (communication.channel === 'IN_APP') {
      if (user) {
        await this.prisma.notification.create({
          data: {
            organisationId: communication.organisationId,
            outletId: communication.outletId,
            recipientUserId: user.id,
            memberId: communication.recipientMemberId,
            type: communication.type,
            category: 'COMMUNICATION',
            title: communication.subject || 'Notification',
            body: communication.body || communication.contentPreview || '',
            data: {
              communicationId: communication.id,
              source: communication.source,
              sourceReferenceId: communication.sourceReferenceId,
            },
            status: 'DELIVERED',
          },
        });
      }

      await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: 'DELIVERED',
          sentAt: new Date(),
          deliveredAt: new Date(),
          provider: 'IN_APP_LOCAL',
          providerMessageId: `inapp_${Date.now()}`,
          attemptCount: communication.attemptCount + 1,
        },
      });

      return {
        success: true,
        providerMessageId: `inapp_${Date.now()}`,
        providerStatus: 'delivered',
      };
    }

    const outbound: OutboundCommunication = {
      communicationId: communication.id,
      organisationId: communication.organisationId,
      outletId: communication.outletId,
      recipientUserId: user?.id,
      recipientEmail: email,
      recipientPhone: phone,
      recipientPushTokens: pushTokens,
      type: communication.type as any,
      channel: communication.channel as CommunicationChannel,
      subject: communication.subject,
      body: communication.body || communication.contentPreview || '',
      variables: (communication.variables as any) || {},
      metadata: (communication.metadata as any) || {},
      idempotencyKey: communication.idempotencyKey,
    };

    const provider = this.providerFactory.getProvider(communication.channel as CommunicationChannel);

    let result: ProviderSendResult;
    try {
      result = await provider.send(outbound);
    } catch (err: any) {
      result = {
        success: false,
        providerStatus: 'error',
        error: {
          code: 'UNEXPECTED_PROVIDER_ERROR',
          message: err.message || 'Unknown provider error',
          isPermanent: false,
        },
      };
    }

    const now = new Date();
    const newAttemptCount = communication.attemptCount + 1;

    if (result.success) {
      await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: result.providerStatus === 'delivered' ? 'DELIVERED' : 'SENT',
          provider: provider.name,
          providerMessageId: result.providerMessageId,
          sentAt: now,
          deliveredAt: result.providerStatus === 'delivered' ? now : null,
          attemptCount: newAttemptCount,
          cost: result.cost ? Number(result.cost) : communication.cost,
          currency: result.currency || communication.currency,
        },
      });

      // Record delivery event
      if (result.providerMessageId) {
        await this.deliveryStatusService.recordDeliveryEvent({
          provider: provider.name,
          providerEventId: `evt_${Date.now()}`,
          providerMessageId: result.providerMessageId,
          status: result.providerStatus === 'delivered' ? 'DELIVERED' : 'SENT',
          providerStatus: result.providerStatus,
          timestamp: now,
        });
      }
    } else {
      const isPermanent = result.error?.isPermanent || false;
      const shouldRetry = this.retryPolicy.shouldRetry(
        newAttemptCount,
        result.error?.code,
        communication.maxAttempts
      );

      const finalStatus = shouldRetry && !isPermanent ? 'QUEUED' : 'FAILED';

      await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: finalStatus,
          provider: provider.name,
          failedAt: finalStatus === 'FAILED' ? now : null,
          attemptCount: newAttemptCount,
          suppressionReason: result.error?.message,
        },
      });
    }

    return result;
  }
}
