import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationProvider } from '../communication-provider.interface';
import {
  CommunicationChannel,
  OutboundCommunication,
  ProviderSendResult,
  ProviderDeliveryStatus,
  ProviderDeliveryEvent,
  CommunicationStatus,
} from '../../communications.types';

@Injectable()
export class EmailProviderAdapter implements CommunicationProvider {
  readonly name = 'EMAIL_ADAPTER';
  readonly supportedChannels: CommunicationChannel[] = ['EMAIL'];
  private readonly logger = new Logger(EmailProviderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: OutboundCommunication): Promise<ProviderSendResult> {
    if (!message.recipientEmail) {
      return {
        success: false,
        providerStatus: 'rejected',
        error: {
          code: 'MISSING_EMAIL_RECIPIENT',
          message: 'Recipient email address is required',
          isPermanent: true,
        },
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(message.recipientEmail)) {
      return {
        success: false,
        providerStatus: 'rejected',
        error: {
          code: 'INVALID_EMAIL_FORMAT',
          message: `Invalid email address: ${message.recipientEmail}`,
          isPermanent: true,
        },
      };
    }

    const providerMessageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`Dispatched EMAIL to ${message.recipientEmail}: [${message.subject}] (ID: ${providerMessageId})`);

    return {
      success: true,
      providerMessageId,
      providerStatus: 'sent',
      cost: 0.0005,
      currency: 'USD',
    };
  }

  async getStatus(providerMessageId: string): Promise<ProviderDeliveryStatus> {
    return {
      providerMessageId,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }

  validateWebhook(payload: unknown, signature: string): boolean {
    return signature === 'valid_email_signature' || signature.startsWith('sig_');
  }

  parseWebhook(payload: any): ProviderDeliveryEvent {
    const rawStatus = (payload?.event || payload?.status || 'delivered').toLowerCase();
    let status: CommunicationStatus = 'DELIVERED';
    if (rawStatus.includes('bounce') || rawStatus.includes('fail') || rawStatus.includes('dropped')) {
      status = 'FAILED';
    } else if (rawStatus.includes('open')) {
      status = 'READ';
    } else if (rawStatus.includes('unsub')) {
      status = 'SUPPRESSED';
    }

    return {
      provider: this.name,
      providerEventId: payload?.sg_message_id || payload?.eventId || `email_evt_${Date.now()}`,
      providerMessageId: payload?.messageId || payload?.emailMessageId || `email_${Date.now()}`,
      status,
      providerStatus: rawStatus,
      timestamp: new Date(),
      metadata: payload || {},
    };
  }
}
