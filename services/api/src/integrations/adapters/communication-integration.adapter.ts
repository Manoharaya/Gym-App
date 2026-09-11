/**
 * FitCore — Day 48: Communication Integration Adapter
 *
 * Bridges the Day 28 CommunicationProvider architecture (Email, SMS, WhatsApp, Push)
 * into the unified FitCore Integration Platform.
 */

import { Injectable, Optional } from '@nestjs/common';
import {
  IntegrationProviderAdapter,
  IntegrationAdapterContext,
  IntegrationAdapterConnectResult,
  IntegrationAdapterWebhookResult,
} from './base-integration.adapter';
import { IntegrationCapability, IntegrationMetadata } from '@fitcore/types';
import { CommunicationProviderFactory } from '../../communications/providers/provider-factory.service';

@Injectable()
export class CommunicationIntegrationAdapter implements IntegrationProviderAdapter {
  readonly integrationKey = 'TWILIO';
  readonly provider = 'TWILIO';

  constructor(@Optional() private readonly commFactory?: CommunicationProviderFactory) {}

  getMetadata(): IntegrationMetadata {
    return {
      integrationKey: this.integrationKey,
      displayName: 'Twilio SMS & Communications',
      category: 'SMS',
      provider: this.provider,
      description: 'High-throughput SMS and messaging communication infrastructure.',
      version: '1.0.0',
      capabilities: ['SMS', 'MESSAGES', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    };
  }

  getCapabilities(): IntegrationCapability[] {
    return ['SMS', 'MESSAGES', 'WEBHOOKS'];
  }

  async connect(context: IntegrationAdapterContext): Promise<IntegrationAdapterConnectResult> {
    return {
      externalAccountId: context.credentials?.accountSid || `AC_twilio_${Date.now()}`,
      externalAccountName: context.credentials?.senderName || 'FitCore SMS Gateway',
      credentials: context.credentials,
      metadata: { phoneNumbers: ['+1234567890'] },
    };
  }

  async disconnect(context: IntegrationAdapterContext): Promise<void> {
    // Invalidate local credentials
  }

  async healthCheck(context: IntegrationAdapterContext): Promise<boolean> {
    if (this.commFactory) {
      try {
        const p = this.commFactory.getProvider('SMS');
        return !!p;
      } catch {
        return false;
      }
    }
    return true;
  }

  async verifyWebhook(
    headers: Record<string, any>,
    rawBody: string | Buffer,
  ): Promise<IntegrationAdapterWebhookResult> {
    const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawString);
    } catch {
      // URL encoded form
      const params = new URLSearchParams(rawString);
      params.forEach((v, k) => {
        parsed[k] = v;
      });
    }

    const eventId = parsed.MessageSid || parsed.SmsSid || headers['x-twilio-signature'] || `tw_evt_${Date.now()}`;
    const status = parsed.MessageStatus || parsed.SmsStatus || 'delivered';

    let normalizedType: string = 'MESSAGE_SENT';
    if (status === 'delivered') normalizedType = 'MESSAGE_DELIVERED';
    else if (status === 'failed' || status === 'undelivered') normalizedType = 'MESSAGE_FAILED';

    return {
      isValid: true,
      externalEventId: eventId,
      eventType: status,
      normalizedType,
      payload: parsed,
    };
  }
}
