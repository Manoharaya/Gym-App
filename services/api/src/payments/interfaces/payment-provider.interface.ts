export interface PaymentIntentRequest {
  organisationId: string;
  memberProfileId: string;
  amountMinor: number;
  currency: string;
  paymentMethodId?: string;
  providerPaymentMethodId?: string;
  paymentMethodType?: string;
  idempotencyKey?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResult {
  providerTransactionId: string;
  status: 'SUCCEEDED' | 'PENDING' | 'REQUIRES_ACTION' | 'FAILED';
  amountMinor: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
  receiptUrl?: string;
  rawResponse?: Record<string, any>;
}

export interface RefundRequest {
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  amountMinor: number;
  failureReason?: string;
  rawResponse?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  providerEventId: string;
  eventType: string;
  payload: Record<string, any>;
  failureReason?: string;
}

export interface IPaymentProvider {
  readonly providerName: string;

  charge(request: PaymentIntentRequest): Promise<PaymentIntentResult>;

  refund(request: RefundRequest): Promise<RefundResult>;

  verifyWebhook(headers: Record<string, any>, rawBody: string | Buffer): Promise<WebhookVerificationResult>;
}
