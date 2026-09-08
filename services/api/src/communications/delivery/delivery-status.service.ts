import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CommunicationStatus,
  ProviderDeliveryEvent,
} from '../communications.types';
import { COMMUNICATION_AUDIT_ACTIONS } from '../communications.constants';

@Injectable()
export class DeliveryStatusService {
  private readonly logger = new Logger(DeliveryStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Processes an incoming delivery event from a provider webhook or delivery callback.
   * Enforces idempotency on providerEventId to prevent duplicate state transitions.
   */
  async recordDeliveryEvent(event: ProviderDeliveryEvent) {
    // 1. Check idempotency on providerEventId
    if (event.providerEventId) {
      const existingEvent = await this.prisma.communicationDeliveryEvent.findFirst({
        where: { providerEventId: event.providerEventId },
      });
      if (existingEvent) {
        this.logger.debug(
          `Ignoring duplicate delivery event: ${event.providerEventId} for message ${event.providerMessageId}`
        );
        return { duplicate: true, eventId: existingEvent.id };
      }
    }

    // 2. Find communication record by providerMessageId or ID
    const communication = await this.prisma.communication.findFirst({
      where: {
        OR: [
          { providerMessageId: event.providerMessageId },
          { id: event.providerMessageId },
        ],
      },
    });

    if (!communication) {
      this.logger.warn(
        `Communication not found for delivery event with providerMessageId: ${event.providerMessageId}`
      );
      return { found: false };
    }

    // 3. Persist delivery event
    const deliveryEvent = await this.prisma.communicationDeliveryEvent.create({
      data: {
        communicationId: communication.id,
        status: event.status,
        providerStatus: event.providerStatus,
        providerEventId: event.providerEventId,
        payload: event.metadata as any,
        timestamp: event.timestamp || new Date(),
      },
    });

    // 4. Update communication status based on event
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (event.status === 'SENT' && !communication.sentAt) {
      updateData.status = 'SENT';
      updateData.sentAt = event.timestamp || new Date();
    } else if (event.status === 'DELIVERED') {
      updateData.status = 'DELIVERED';
      updateData.deliveredAt = event.timestamp || new Date();
    } else if (event.status === 'READ') {
      updateData.status = 'READ';
      updateData.readAt = event.timestamp || new Date();
    } else if (event.status === 'FAILED') {
      updateData.status = 'FAILED';
      updateData.failedAt = event.timestamp || new Date();
    } else if (event.status === 'SUPPRESSED') {
      updateData.status = 'SUPPRESSED';
      updateData.suppressionReason = 'Recipient opted out via provider event';
    }

    await this.prisma.communication.update({
      where: { id: communication.id },
      data: updateData,
    });

    return {
      success: true,
      communicationId: communication.id,
      deliveryEventId: deliveryEvent.id,
      status: event.status,
    };
  }
}
