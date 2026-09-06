import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { PaymentMembershipBridge } from './payment-membership.bridge';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly membershipBridge: PaymentMembershipBridge
  ) {}

  async handleWebhook(
    providerName: string,
    headers: Record<string, any>,
    rawBody: string | Buffer
  ) {
    const provider = this.providerFactory.getProvider(providerName);
    const verification = await provider.verifyWebhook(headers, rawBody);

    if (!verification.isValid) {
      this.logger.warn(`Webhook signature verification failed for provider: ${providerName}`);
      throw new BadRequestException(
        `Webhook verification failed: ${verification.failureReason || 'Invalid signature'}`
      );
    }

    const { providerEventId, eventType, payload } = verification;

    // Check for replay deduplication
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: provider.providerName,
          providerEventId,
        },
      },
    });

    if (existing) {
      this.logger.log(
        `Webhook ${providerEventId} from ${providerName} already processed (${existing.processingStatus}). Skipping.`
      );
      return {
        status: 'IGNORED',
        message: 'Duplicate event previously handled',
        eventId: existing.id,
      };
    }

    // Record incoming webhook event
    const webhookEvent = await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: provider.providerName,
        providerEventId,
        eventType,
        payload,
        signatureVerified: true,
        processingStatus: 'PENDING',
      },
    });

    try {
      // Process event based on type
      if (eventType === 'payment.succeeded' || eventType === 'payment_intent.succeeded') {
        const invoiceId = payload?.data?.object?.metadata?.invoiceId || payload?.invoiceId;
        if (invoiceId) {
          await this.membershipBridge.onInvoicePaid(invoiceId);
        }
      }

      const updated = await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        status: 'PROCESSED',
        eventId: updated.id,
      };
    } catch (error: any) {
      this.logger.error(`Error processing webhook ${providerEventId}: ${error.message}`, error.stack);
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: 'FAILED',
          errorMessage: error.message,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }
}
