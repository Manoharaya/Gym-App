import { Injectable, Logger } from '@nestjs/common';
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
export class DevelopmentCommunicationProvider implements CommunicationProvider {
  readonly name = 'DEVELOPMENT';
  readonly supportedChannels: CommunicationChannel[] = [
    'EMAIL',
    'SMS',
    'PUSH',
    'WHATSAPP',
    'IN_APP',
    'VOICE',
  ];

  private readonly logger = new Logger(DevelopmentCommunicationProvider.name);
  private readonly sentMessages: OutboundCommunication[] = [];
  private failNextSend = false;
  private failPermanent = false;

  async send(message: OutboundCommunication): Promise<ProviderSendResult> {
    this.logger.debug(
      `[DEV PROVIDER] Channel: ${message.channel} | Type: ${message.type} | Recipient: ${
        message.recipientEmail || message.recipientPhone || message.recipientUserId || 'N/A'
      } | Subject: ${message.subject || 'N/A'}`
    );

    if (this.failNextSend) {
      this.failNextSend = false;
      return {
        success: false,
        providerStatus: 'failed',
        error: {
          code: this.failPermanent ? 'PERMANENT_ERROR' : 'TRANSIENT_NETWORK_ERROR',
          message: this.failPermanent ? 'Recipient address rejected' : 'Temporary provider timeout',
          isPermanent: this.failPermanent,
        },
      };
    }

    this.sentMessages.push({ ...message });
    const providerMessageId = `dev_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      providerMessageId,
      providerStatus: 'delivered',
      cost: 0.001,
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
    if (!signature) return false;
    return signature === 'test-dev-signature' || signature.startsWith('sig_');
  }

  parseWebhook(payload: any): ProviderDeliveryEvent {
    const rawStatus = (payload?.status || 'delivered').toLowerCase();
    let status: CommunicationStatus = 'DELIVERED';

    if (rawStatus === 'sent') status = 'SENT';
    else if (rawStatus === 'delivered') status = 'DELIVERED';
    else if (rawStatus === 'read' || rawStatus === 'opened') status = 'READ';
    else if (rawStatus === 'failed' || rawStatus === 'bounced') status = 'FAILED';
    else if (rawStatus === 'unsubscribed') status = 'SUPPRESSED';

    return {
      provider: this.name,
      providerEventId: payload?.eventId || `evt_${Date.now()}`,
      providerMessageId: payload?.messageId || `msg_${Date.now()}`,
      status,
      providerStatus: payload?.status || 'delivered',
      timestamp: payload?.timestamp ? new Date(payload.timestamp) : new Date(),
      metadata: payload?.metadata || {},
    };
  }

  // Helper methods for automated tests
  getSentMessages(): OutboundCommunication[] {
    return [...this.sentMessages];
  }

  clear(): void {
    this.sentMessages.length = 0;
    this.failNextSend = false;
    this.failPermanent = false;
  }

  setFailNext(isPermanent = false): void {
    this.failNextSend = true;
    this.failPermanent = isPermanent;
  }
}
