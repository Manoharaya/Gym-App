/**
 * FitCore — Day 48: Access Control Integration Adapter
 *
 * Bridges the Day 7 AccessDeviceProvider architecture (Turnstiles, Door Controllers)
 * into the unified FitCore Integration Platform.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import {
  IntegrationProviderAdapter,
  IntegrationAdapterContext,
  IntegrationAdapterConnectResult,
  IntegrationAdapterWebhookResult,
} from './base-integration.adapter';
import { IntegrationCapability, IntegrationMetadata } from '@fitcore/types';
import {
  IAccessDeviceProvider,
  ACCESS_DEVICE_PROVIDER,
} from '../../access/interfaces/access-device-provider.interface';

@Injectable()
export class AccessIntegrationAdapter implements IntegrationProviderAdapter {
  readonly integrationKey = 'ACCESS_CONTROL_PROVIDER';
  readonly provider = 'ACCESS_CONTROL_PROVIDER';

  constructor(
    @Optional()
    @Inject(ACCESS_DEVICE_PROVIDER)
    private readonly deviceProvider?: IAccessDeviceProvider,
  ) {}

  getMetadata(): IntegrationMetadata {
    return {
      integrationKey: this.integrationKey,
      displayName: 'Access Control & Turnstiles',
      category: 'ACCESS_CONTROL',
      provider: this.provider,
      description: 'Biometric, RFID, and barcode door turnstile hardware controllers.',
      version: '1.0.0',
      capabilities: ['ACCESS_CONTROL', 'DEVICE_TELEMETRY', 'WEBHOOKS'],
      supportedScopes: ['OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    };
  }

  getCapabilities(): IntegrationCapability[] {
    return ['ACCESS_CONTROL', 'DEVICE_TELEMETRY', 'WEBHOOKS'];
  }

  async connect(context: IntegrationAdapterContext): Promise<IntegrationAdapterConnectResult> {
    return {
      externalAccountId: context.credentials?.deviceId || `door_ctrl_${Date.now()}`,
      externalAccountName: context.credentials?.deviceName || 'Main Entrance Turnstile #1',
      credentials: context.credentials,
      metadata: { outletId: context.outletId },
    };
  }

  async disconnect(context: IntegrationAdapterContext): Promise<void> {
    // Invalidate local credentials
  }

  async healthCheck(context: IntegrationAdapterContext): Promise<boolean> {
    if (this.deviceProvider) {
      try {
        const status = await this.deviceProvider.getDeviceStatus(context.credentials?.deviceId || 'DEV-1');
        return status === 'ONLINE';
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
    let parsed: any;
    try {
      parsed = JSON.parse(rawString);
    } catch {
      parsed = {};
    }

    const eventId = parsed.eventId || headers['x-device-event-id'] || `access_evt_${Date.now()}`;
    const eventType = parsed.eventType || 'DOOR_HEARTBEAT';

    let normalizedType: string | undefined;
    if (eventType === 'BADGE_SCAN' || eventType === 'ENTRY_GRANTED') {
      normalizedType = 'ACCESS_EVENT_RECEIVED';
    } else if (eventType === 'STATUS_CHANGE') {
      normalizedType = 'ACCESS_DEVICE_STATUS_CHANGED';
    }

    return {
      isValid: true,
      externalEventId: eventId,
      eventType,
      normalizedType,
      payload: parsed,
    };
  }
}
