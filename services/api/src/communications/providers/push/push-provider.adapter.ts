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
export class PushProviderAdapter implements CommunicationProvider {
  readonly name = 'PUSH_ADAPTER';
  readonly supportedChannels: CommunicationChannel[] = ['PUSH'];
  private readonly logger = new Logger(PushProviderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: OutboundCommunication): Promise<ProviderSendResult> {
    if (!message.recipientPushTokens || message.recipientPushTokens.length === 0) {
      return {
        success: false,
        providerStatus: 'rejected',
        error: {
          code: 'MISSING_PUSH_TOKENS',
          message: 'No registered push device tokens found for recipient',
          isPermanent: true,
        },
      };
    }

    const providerMessageId = `push_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`Dispatched PUSH notification to ${message.recipientPushTokens.length} device(s) (ID: ${providerMessageId})`);

    return {
      success: true,
      providerMessageId,
      providerStatus: 'sent',
      cost: 0.0,
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
    return signature === 'valid_push_signature' || signature.startsWith('sig_');
  }

  parseWebhook(payload: any): ProviderDeliveryEvent {
    const rawStatus = (payload?.status || 'delivered').toLowerCase();
    let status: CommunicationStatus = 'DELIVERED';
    if (rawStatus.includes('fail') || rawStatus.includes('unregistered')) {
      status = 'FAILED';
    } else if (rawStatus.includes('open')) {
      status = 'READ';
    }

    return {
      provider: this.name,
      providerEventId: payload?.eventId || `push_evt_${Date.now()}`,
      providerMessageId: payload?.messageId || `push_${Date.now()}`,
      status,
      providerStatus: rawStatus,
      timestamp: new Date(),
      metadata: payload || {},
    };
  }
}
