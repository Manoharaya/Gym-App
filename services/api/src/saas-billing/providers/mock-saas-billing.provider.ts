import { Injectable, Logger } from '@nestjs/common';
import {
  ISaasBillingProvider,
  CreateCustomerRequest,
  CustomerResult,
  CreateSubscriptionRequest,
  SubscriptionResult,
  InvoicePaymentRequest,
  PaymentResult,
  SaasWebhookPayload,
} from './saas-billing-provider.interface';

@Injectable()
export class MockSaasBillingProvider implements ISaasBillingProvider {
  readonly providerName = 'MOCK_SAAS_PROVIDER';
  private readonly logger = new Logger(MockSaasBillingProvider.name);

  async createCustomer(request: CreateCustomerRequest): Promise<CustomerResult> {
    this.logger.log(`Creating SaaS billing customer for organisation ${request.organisationId}`);
    return {
      providerCustomerReference: `cus_saas_${request.organisationId.substring(0, 12)}_${Date.now()}`,
      status: 'ACTIVE',
      rawResponse: { mock: true, created: new Date().toISOString() },
    };
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResult> {
    this.logger.log(
      `Creating SaaS subscription with plan ${request.planCode} (amount: ${request.baseAmountMinor} ${request.currency})`,
    );
    const start = new Date();
    const end = new Date(start);
    if (request.trialDays && request.trialDays > 0) {
      end.setDate(end.getDate() + request.trialDays);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    return {
      providerSubscriptionReference: `sub_saas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: request.trialDays && request.trialDays > 0 ? 'TRIALING' : 'ACTIVE',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      rawResponse: { mock: true },
    };
  }

  async cancelSubscription(
    providerSubscriptionReference: string,
    immediate: boolean,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`Cancelling SaaS subscription ${providerSubscriptionReference} (immediate: ${immediate})`);
    return {
      success: true,
      status: immediate ? 'CANCELLED' : 'CANCEL_AT_PERIOD_END',
    };
  }

  async collectInvoicePayment(request: InvoicePaymentRequest): Promise<PaymentResult> {
    this.logger.log(`Collecting invoice payment for ${request.invoiceNumber} (${request.amountMinor} ${request.currency})`);
    return {
      providerPaymentReference: `pay_saas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'SUCCEEDED',
      amountMinor: request.amountMinor,
      currency: request.currency,
      rawResponse: { mock: true },
    };
  }

  async verifyWebhook(
    headers: Record<string, any>,
    rawBody: string | Buffer,
  ): Promise<{ isValid: boolean; event: SaasWebhookPayload | null; error?: string }> {
    // Deterministic mock verification
    const sig = headers['x-saas-signature'] || headers['stripe-signature'];
    if (sig === 'invalid_signature') {
      return { isValid: false, event: null, error: 'Invalid webhook signature' };
    }

    let parsed: any = {};
    try {
      parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
    } catch {
      parsed = { eventType: 'unknown' };
    }

    return {
      isValid: true,
      event: {
        eventId: parsed.id || `evt_saas_${Date.now()}`,
        eventType: parsed.type || 'saas.subscription.updated',
        provider: this.providerName,
        resourceId: parsed.data?.id,
        data: parsed.data || {},
      },
    };
  }
}
