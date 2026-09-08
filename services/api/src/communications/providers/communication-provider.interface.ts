import {
  CommunicationChannel,
  OutboundCommunication,
  ProviderSendResult,
  ProviderDeliveryStatus,
  ProviderDeliveryEvent,
} from '../communications.types';

export interface CommunicationProvider {
  readonly name: string;
  readonly supportedChannels: CommunicationChannel[];

  send(message: OutboundCommunication): Promise<ProviderSendResult>;

  getStatus?(providerMessageId: string): Promise<ProviderDeliveryStatus>;

  validateWebhook?(payload: unknown, signature: string): boolean;

  parseWebhook?(payload: unknown): ProviderDeliveryEvent;
}
