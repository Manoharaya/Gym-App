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
export class ManualPaymentProvider implements IPaymentProvider {
  readonly providerName = 'MANUAL';

  async charge(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const txId = `manual_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerTransactionId: txId,
      status: 'SUCCEEDED',
      amountMinor: request.amountMinor,
      currency: request.currency,
      receiptUrl: `https://fitcore.local/receipts/${txId}`,
      rawResponse: {
        recordedManually: true,
        type: request.paymentMethodType || 'MANUAL_CASH',
        description: request.description,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const refundId = `manual_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerRefundId: refundId,
      status: 'SUCCEEDED',
      amountMinor: request.amountMinor,
      rawResponse: {
        recordedManually: true,
        reason: request.reason || 'Manual staff refund',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async verifyWebhook(
    _headers: Record<string, any>,
    _rawBody: string | Buffer
  ): Promise<WebhookVerificationResult> {
    // Manual payments do not receive automated external webhooks
    return {
      isValid: false,
      providerEventId: 'none',
      eventType: 'none',
      payload: {},
      failureReason: 'Manual provider does not accept external webhooks',
    };
  }
}
