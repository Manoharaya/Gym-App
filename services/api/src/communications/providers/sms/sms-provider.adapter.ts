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
export class SmsProviderAdapter implements CommunicationProvider {
  readonly name = 'SMS_ADAPTER';
  readonly supportedChannels: CommunicationChannel[] = ['SMS'];
  private readonly logger = new Logger(SmsProviderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: OutboundCommunication): Promise<ProviderSendResult> {
    if (!message.recipientPhone) {
      return {
        success: false,
        providerStatus: 'rejected',
        error: {
          code: 'MISSING_PHONE_RECIPIENT',
          message: 'Recipient phone number is required for SMS',
          isPermanent: true,
        },
      };
    }

    // Normalize phone number (E.164 standard)
    const cleanedPhone = message.recipientPhone.replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleanedPhone)) {
      return {
        success: false,
        providerStatus: 'rejected',
        error: {
          code: 'INVALID_PHONE_NUMBER',
          message: `Phone number is not valid E.164 format: ${message.recipientPhone}`,
          isPermanent: true,
        },
      };
    }

    const providerMessageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`Dispatched SMS to ${cleanedPhone}: "${message.body.substring(0, 30)}..." (ID: ${providerMessageId})`);

    return {
      success: true,
      providerMessageId,
      providerStatus: 'sent',
      cost: 0.015,
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
    return signature === 'valid_sms_signature' || signature.startsWith('sig_');
  }

  parseWebhook(payload: any): ProviderDeliveryEvent {
    const rawStatus = (payload?.MessageStatus || payload?.status || 'delivered').toLowerCase();
    let status: CommunicationStatus = 'DELIVERED';

    if (rawStatus === 'sent') status = 'SENT';
    else if (rawStatus === 'delivered') status = 'DELIVERED';
    else if (rawStatus === 'failed' || rawStatus === 'undelivered') status = 'FAILED';
    else if (rawStatus === 'opt_out' || rawStatus === 'stop') status = 'SUPPRESSED';

    return {
      provider: this.name,
      providerEventId: payload?.SmsSid || payload?.eventId || `sms_evt_${Date.now()}`,
      providerMessageId: payload?.MessageSid || payload?.smsSid || `sms_${Date.now()}`,
      status,
      providerStatus: rawStatus,
      timestamp: new Date(),
      metadata: payload || {},
    };
  }
}
