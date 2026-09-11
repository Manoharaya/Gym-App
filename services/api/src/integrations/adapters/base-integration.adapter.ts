/**
 * FitCore — Day 48: Base Integration Adapter Contract
 *
 * All domain-specific integration adapters adhere to this common contract
 * while exposing their underlying capability interfaces.
 */

import { IntegrationCapability, IntegrationMetadata } from '@fitcore/types';

export interface IntegrationAdapterContext {
  organisationId: string;
  connectionId: string;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
  outletId?: string;
  memberId?: string;
  staffId?: string;
}

export interface IntegrationAdapterConnectResult {
  externalAccountId?: string;
  externalAccountName?: string;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IntegrationAdapterWebhookResult {
  isValid: boolean;
  externalEventId?: string;
  eventType?: string;
  normalizedType?: string;
  payload?: any;
  failureReason?: string;
}

export interface IntegrationAdapterSyncResult {
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  cursor?: string;
  details?: any;
}

export interface IntegrationProviderAdapter {
  readonly integrationKey: string;
  readonly provider: string;

  getMetadata(): IntegrationMetadata;
  getCapabilities(): IntegrationCapability[];

  connect(context: IntegrationAdapterContext): Promise<IntegrationAdapterConnectResult>;
  disconnect(context: IntegrationAdapterContext): Promise<void>;
  healthCheck(context: IntegrationAdapterContext): Promise<boolean>;

  verifyWebhook?(
    headers: Record<string, any>,
    rawBody: string | Buffer,
    secret?: string,
  ): Promise<IntegrationAdapterWebhookResult>;

  sync?(
    context: IntegrationAdapterContext,
    syncType: string,
    cursor?: string,
  ): Promise<IntegrationAdapterSyncResult>;
}
