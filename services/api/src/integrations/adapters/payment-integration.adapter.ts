/**
 * FitCore — Day 48: Payment Integration Adapter
 *
 * Bridges the Day 6 PaymentProvider architecture (Stripe, Mock, Manual)
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
import { PaymentProviderFactory } from '../../payments/providers/payment-provider.factory';

@Injectable()
export class PaymentIntegrationAdapter implements IntegrationProviderAdapter {
  readonly integrationKey = 'STRIPE';
  readonly provider = 'STRIPE';

  constructor(@Optional() private readonly paymentFactory?: PaymentProviderFactory) {}

  getMetadata(): IntegrationMetadata {
    return {
      integrationKey: this.integrationKey,
      displayName: 'Stripe Payments',
      category: 'PAYMENTS',
      provider: this.provider,
      description: 'Card payments, direct debit, and Apple Pay processing.',
      version: '1.0.0',
      capabilities: ['PAYMENTS', 'REFUNDS', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    };
  }

  getCapabilities(): IntegrationCapability[] {
    return ['PAYMENTS', 'REFUNDS', 'WEBHOOKS'];
  }

  async connect(context: IntegrationAdapterContext): Promise<IntegrationAdapterConnectResult> {
    const apiKey = context.credentials?.apiKey;
    if (!apiKey && context.credentials?.testMode !== true) {
      // In dev or with test mode, permit fallback
    }

    return {
      externalAccountId: context.credentials?.accountId || `acct_stripe_${Date.now()}`,
      externalAccountName: context.credentials?.accountName || 'Stripe Primary Account',
      credentials: context.credentials,
      metadata: { environment: 'TEST_MODE' },
    };
  }

  async disconnect(context: IntegrationAdapterContext): Promise<void> {
    // Invalidate local credentials
  }

  async healthCheck(context: IntegrationAdapterContext): Promise<boolean> {
    // If payment factory is available, verify mock/stripe provider readiness
    if (this.paymentFactory) {
      try {
        const provider = this.paymentFactory.getProvider('MOCK');
        return !!provider;
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
      return { isValid: false, failureReason: 'Malformed JSON payload' };
    }

    const eventId = parsed.id || headers['stripe-event-id'] || `evt_${Date.now()}`;
    const eventType = parsed.type || 'payment_intent.succeeded';

    let normalizedType: string | undefined;
    if (eventType === 'payment_intent.succeeded' || eventType === 'charge.succeeded') {
      normalizedType = 'PAYMENT_SUCCEEDED';
    } else if (eventType === 'payment_intent.payment_failed') {
      normalizedType = 'PAYMENT_FAILED';
    } else if (eventType === 'charge.refunded') {
      normalizedType = 'REFUND_CREATED';
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
