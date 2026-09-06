import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResult,
  RefundRequest,
  RefundResult,
  WebhookVerificationResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = 'MOCK';

  async charge(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const token = request.providerPaymentMethodId || request.paymentMethodId || '';

    // Simulate card decline
    if (token.includes('decline') || token === 'pm_mock_decline') {
      return {
        providerTransactionId: `mock_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        status: 'FAILED',
        amountMinor: request.amountMinor,
        currency: request.currency,
        failureCode: 'CARD_DECLINED',
        failureMessage: 'The mock card was declined by the simulated issuer.',
        rawResponse: { simulated: true, outcome: 'decline' },
      };
    }

    // Simulate 3D-Secure / Additional Action Required
    if (token.includes('requires_action') || token === 'pm_mock_requires_action') {
      return {
        providerTransactionId: `mock_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        status: 'REQUIRES_ACTION',
        amountMinor: request.amountMinor,
        currency: request.currency,
        rawResponse: { simulated: true, action: '3DS_VERIFICATION_REQUIRED' },
      };
    }

    // Default: Success
    const txId = `mock_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerTransactionId: txId,
      status: 'SUCCEEDED',
      amountMinor: request.amountMinor,
      currency: request.currency,
      receiptUrl: `https://fitcore.local/receipts/${txId}`,
      rawResponse: { simulated: true, outcome: 'succeeded' },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (request.reason === 'SIMULATE_FAILURE') {
      return {
        providerRefundId: `mock_ref_failed_${Date.now()}`,
        status: 'FAILED',
        amountMinor: request.amountMinor,
        failureReason: 'Simulated refund decline',
      };
    }

    const refundId = `mock_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerRefundId: refundId,
      status: 'SUCCEEDED',
      amountMinor: request.amountMinor,
      rawResponse: { simulated: true, outcome: 'refund_succeeded' },
    };
  }

  async verifyWebhook(
    headers: Record<string, any>,
    rawBody: string | Buffer
  ): Promise<WebhookVerificationResult> {
    try {
      const signature = headers['x-fitcore-signature'] || headers['x-mock-signature'];
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      const parsed = JSON.parse(bodyStr);

      // In production or mock test, check if signature header is provided or valid
      const isValid = signature ? signature.length > 0 : true;

      return {
        isValid,
        providerEventId: parsed.id || `evt_${Date.now()}`,
        eventType: parsed.type || 'payment.succeeded',
        payload: parsed,
      };
    } catch (error: any) {
      return {
        isValid: false,
        providerEventId: 'unknown',
        eventType: 'unknown',
        payload: {},
        failureReason: error.message || 'Failed to parse webhook payload',
      };
    }
  }
}
